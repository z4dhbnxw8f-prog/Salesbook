import 'server-only';
import {randomUUID} from 'node:crypto';
import type {Prisma} from '@/generated/prisma/client';
export async function queueNotifications(tx:Prisma.TransactionClient,bookingId:string){
 const b=await tx.booking.findUniqueOrThrow({where:{id:bookingId},include:{business:true}});
 const when=new Intl.DateTimeFormat('en-GB',{timeZone:b.business.timezone,dateStyle:'full',timeStyle:'short'}).format(b.startAt);
 const body=`${b.serviceName} at ${b.business.name}\n${when} (${b.business.timezone})\nStatus: ${b.status}\nReference: ${b.reference}\nContact: ${b.business.email}\n${b.business.cancellationPolicy}`;
 const version=randomUUID();
 await tx.emailJob.deleteMany({where:{bookingId,sentAt:null,key:{startsWith:'reminder:'}}});
 await tx.emailJob.createMany({data:[{key:`update:${version}:customer`,bookingId,recipient:b.customerEmail,subject:`Appointment ${b.status.toLowerCase()}: ${b.business.name}`,body,dueAt:new Date()},{key:`update:${version}:owner`,bookingId,recipient:b.business.email,subject:`Appointment ${b.status.toLowerCase()}: ${b.customerName}`,body:`${body}\nCustomer: ${b.customerName}\n${b.customerEmail}\n${b.customerPhone}`,dueAt:new Date()}]});
 if(b.status==='CONFIRMED'&&b.startAt>new Date())await tx.emailJob.create({data:{key:`reminder:${version}`,bookingId,recipient:b.customerEmail,subject:`Appointment reminder: ${b.business.name}`,body,dueAt:new Date(Math.max(Date.now(),+b.startAt-86400000))}});
}
