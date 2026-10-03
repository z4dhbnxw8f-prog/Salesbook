'use server';
import {z} from 'zod';
import {queueNotifications} from '@/services/notifications';
import {revalidatePath} from 'next/cache';
import {db} from '@/lib/db';
import {requireBusiness} from '@/services/businesses';
import {lockBusiness} from '@/services/scheduling';
import type {ActionState} from '@/components/action-form';
const integer=(min:number,max:number)=>z.coerce.number().int().min(min).max(max);
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).transform(v=>Number(v.slice(0,2))*60+Number(v.slice(3)));
export async function saveWorkspace(_:ActionState,form:FormData):Promise<ActionState>{
 const id=String(form.get('businessId'));await requireBusiness(id);const op=String(form.get('op'));const data=Object.fromEntries(form);
 try{await db.$transaction(async tx=>{await lockBusiness(tx,id);
 if(op==='service'){
  const v=z.object({name:z.string().trim().min(2).max(100),description:z.string().trim().max(1000),price:z.string().regex(/^\d{1,9}(\.\d{1,2})?$/),durationMinutes:integer(5,1440),bufferMinutes:integer(0,240)}).parse(data);
  const business=await tx.business.findUniqueOrThrow({where:{id}});const serviceId=String(form.get('serviceId')||'');
  if(serviceId)await tx.service.updateMany({where:{id:serviceId,businessId:id},data:v});else await tx.service.create({data:{...v,businessId:id,currency:business.currency}});
 }else if(op==='toggleService'){
  const s=await tx.service.findFirstOrThrow({where:{id:String(form.get('serviceId')),businessId:id}});await tx.service.update({where:{id:s.id},data:{active:!s.active}});
 }else if(op==='window'){
  const v=z.object({weekday:integer(0,6),startMinute:time,endMinute:time}).parse(data);if(v.startMinute>=v.endMinute)throw Error('Opening time must be before closing time.');
  await tx.availability.create({data:{...v,businessId:id}});
 }else if(op==='removeWindow'){await tx.availability.deleteMany({where:{id:String(form.get('windowId')),businessId:id}});
 }else if(op==='block'){
  const v=z.object({startAt:z.iso.datetime({offset:true}),endAt:z.iso.datetime({offset:true}),reason:z.string().trim().max(200)}).parse(data);const startAt=new Date(v.startAt),endAt=new Date(v.endAt);if(startAt>=endAt)throw Error('End must be after start.');
  if(await tx.booking.count({where:{businessId:id,status:{in:['PENDING','CONFIRMED']},startAt:{lt:endAt},occupiedUntil:{gt:startAt}}}))throw Error('This block overlaps an appointment. Cancel or reschedule it first.');
  await tx.blockedTime.create({data:{businessId:id,startAt,endAt,reason:v.reason}});
 }else if(op==='removeBlock'){await tx.blockedTime.deleteMany({where:{id:String(form.get('blockId')),businessId:id}});
 }else if(op==='settings'){
  const v=z.object({name:z.string().trim().min(2).max(100),description:z.string().trim().max(1000),email:z.email(),phone:z.string().trim().max(30),address:z.string().trim().max(200),city:z.string().trim().max(100),minimumNoticeMinutes:integer(0,10080),maximumBookingDays:integer(1,365),slotIntervalMinutes:integer(5,120),cancellationPolicy:z.string().trim().max(2000)}).parse(data);
  await tx.business.update({where:{id},data:{...v,automaticConfirmation:form.get('automaticConfirmation')==='on'}});
 }else if(op==='status'){
  const status=z.enum(['CONFIRMED','CANCELLED','COMPLETED','NO_SHOW']).parse(form.get('status'));
  const booking=await tx.booking.findFirstOrThrow({where:{id:String(form.get('bookingId')),businessId:id}});
  if(!['PENDING','CONFIRMED'].includes(booking.status))throw Error('This appointment is already closed.');
  if(status==='CONFIRMED'&&booking.status!=='PENDING')throw Error('Already confirmed.');
  if(['COMPLETED','NO_SHOW'].includes(status)&&booking.startAt>new Date())throw Error('This appointment has not started yet.');
  await tx.booking.update({where:{id:booking.id},data:{status,internalNotes:z.string().max(2000).parse(form.get('internalNotes')??'')}});
  await queueNotifications(tx,booking.id);
 }else throw Error('Unknown action.');
 });}catch(error){return {error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error&&!('code' in error)?error.message:'Could not save. Check for overlapping hours and try again.'};}
 revalidatePath(`/dashboard/${id}`);revalidatePath('/dashboard');return {error:'',success:'Saved.'};
}
