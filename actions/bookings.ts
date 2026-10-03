'use server';
import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {queueNotifications} from '@/services/notifications';
import {revalidatePath} from 'next/cache';
import {db} from '@/lib/db';
import {availableSlots,lockBusiness} from '@/services/scheduling';
import {localParts} from '@/lib/slots';
import {allowAuthAttempt} from '@/services/auth';
import type {ActionState} from '@/components/action-form';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const input=z.object({businessId:z.string(),serviceId:z.string(),startAt:z.iso.datetime(),name:z.string().trim().min(2).max(100),email:z.email().max(254).transform(v=>v.toLowerCase()),phone:z.string().trim().min(3).max(30),notes:z.string().trim().max(1000)});
export async function bookAppointment(_:ActionState,form:FormData):Promise<ActionState>{
 const parsed=input.safeParse(Object.fromEntries(form));if(!parsed.success)return {error:parsed.error.issues[0].message};const v=parsed.data;
 const token=randomBytes(32).toString('hex');
 try{
 if(!await allowAuthAttempt(`booking:${v.email}`))return {error:'Too many requests. Try again in 15 minutes.'};
 await db.$transaction(async tx=>{
  await lockBusiness(tx,v.businessId);
  const business=await tx.business.findUniqueOrThrow({where:{id:v.businessId}});
  const service=await tx.service.findFirstOrThrow({where:{id:v.serviceId,businessId:v.businessId,active:true}});
  const startAt=new Date(v.startAt);const date=localParts(startAt,business.timezone).date;
  const available=await availableSlots(business.id,service.id,date,tx);
  if(!available.some(s=>+s===+startAt))throw Error('That time is no longer available. Please choose another time.');
  const customer=await tx.customer.upsert({where:{businessId_email:{businessId:business.id,email:v.email}},create:{businessId:business.id,name:v.name,email:v.email,phone:v.phone},update:{}});
  const created=await tx.booking.create({data:{businessId:business.id,serviceId:service.id,customerId:customer.id,customerName:v.name,customerEmail:v.email,customerPhone:v.phone,serviceName:service.name,startAt,endAt:new Date(+startAt+service.durationMinutes*60000),occupiedUntil:new Date(+startAt+(service.durationMinutes+service.bufferMinutes)*60000),durationMinutes:service.durationMinutes,bufferMinutes:service.bufferMinutes,price:service.price,currency:service.currency,status:business.automaticConfirmation?'CONFIRMED':'PENDING',customerNotes:v.notes,managementTokenHash:hash(token),managementTokenExpiresAt:new Date(+startAt+30*86400000)}});
  await queueNotifications(tx,created.id);
 },{timeout:15000});
 }catch(e){return {error:e instanceof Error&&!('code'in e)?e.message:'Could not book this time. Please refresh and try again.'};}
 revalidatePath(`/dashboard/${v.businessId}`);return {error:'',success:'Your appointment is saved. Keep the private management link below.',url:`/manage/${token}`};
}
export async function manageAppointment(_:ActionState,form:FormData):Promise<ActionState>{
 const token=String(form.get('token'));if(!/^[a-f0-9]{64}$/.test(token))return {error:'Invalid management link.'};
 try{
 const existing=await db.booking.findUnique({where:{managementTokenHash:hash(token)}});if(!existing)throw Error('Appointment not found.');
 await db.$transaction(async tx=>{
  await lockBusiness(tx,existing.businessId);
  const booking=await tx.booking.findUniqueOrThrow({where:{id:existing.id},include:{business:true}});
  if(!booking.managementTokenExpiresAt||booking.managementTokenExpiresAt<new Date())throw Error('This management link has expired.');
  if(!['CONFIRMED','PENDING'].includes(booking.status)||booking.startAt<=new Date())throw Error('This appointment can no longer be changed online.');
  if(form.get('op')==='cancel')await tx.booking.update({where:{id:booking.id},data:{status:'CANCELLED'}});
  else if(form.get('op')==='reschedule'){
   const startAt=new Date(z.iso.datetime().parse(form.get('startAt')));
   const service=await tx.service.findFirstOrThrow({where:{id:booking.serviceId,businessId:booking.businessId,active:true}});
   if(service.durationMinutes!==booking.durationMinutes||service.bufferMinutes!==booking.bufferMinutes)throw Error('This service has changed. Please contact the business to reschedule.');
   const choices=await availableSlots(booking.businessId,booking.serviceId,localParts(startAt,booking.business.timezone).date,tx,booking.id);
   if(!choices.some(s=>+s===+startAt))throw Error('That time is no longer available.');
   await tx.booking.update({where:{id:booking.id},data:{startAt,endAt:new Date(+startAt+booking.durationMinutes*60000),occupiedUntil:new Date(+startAt+(booking.durationMinutes+booking.bufferMinutes)*60000),status:booking.business.automaticConfirmation?'CONFIRMED':'PENDING',managementTokenExpiresAt:new Date(+startAt+30*86400000)}});
  }else throw Error('Unknown action.');
  await queueNotifications(tx,booking.id);
 },{timeout:15000});
 revalidatePath(`/dashboard/${existing.businessId}`);revalidatePath(`/manage/${token}`);return {error:'',success:'Appointment updated.'};
 }catch(e){return {error:e instanceof Error&&!('code'in e)?e.message:'Could not update the appointment.'};}
}
