import 'server-only';
import {db} from '@/lib/db';
import {slots} from '@/lib/slots';
import type {Prisma} from '@/generated/prisma/client';
export async function availableSlots(businessId:string,serviceId:string,date:string,client:Prisma.TransactionClient=db,excludeId?:string){
 const business=await client.business.findUnique({where:{id:businessId},include:{availability:true}});
 const service=await client.service.findFirst({where:{id:serviceId,businessId,active:true}});
 if(!business||!service)return [];
 const from=new Date(`${date}T00:00:00Z`);if(!Number.isFinite(from.getTime()))return [];
 const start=new Date(+from-86400000),end=new Date(+from+2*86400000);
 const [bookings,blocks]=await Promise.all([client.booking.findMany({where:{businessId,id:excludeId?{not:excludeId}:undefined,status:{in:['PENDING','CONFIRMED']},startAt:{lt:end},occupiedUntil:{gt:start}}}),client.blockedTime.findMany({where:{businessId,startAt:{lt:end},endAt:{gt:start}}})]);
 return slots({date,timezone:business.timezone,duration:service.durationMinutes,buffer:service.bufferMinutes,interval:business.slotIntervalMinutes,notice:business.minimumNoticeMinutes,days:business.maximumBookingDays,windows:business.availability,busy:[...blocks,...bookings.map(b=>({startAt:b.startAt,endAt:b.occupiedUntil}))]});
}
export async function lockBusiness(tx:Prisma.TransactionClient,id:string){await tx.$queryRaw`SELECT id FROM "Business" WHERE id=${id} FOR UPDATE`;}
