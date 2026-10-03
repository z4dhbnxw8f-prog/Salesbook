import 'server-only';
import {notFound} from 'next/navigation';
import {db} from '@/lib/db';
import {requireUser} from '@/services/auth';
export async function accessibleShops(){const user=await requireUser();return db.shop.findMany({where:{OR:[{ownerId:user.id},{members:{some:{userId:user.id,active:true}}}]},orderBy:{createdAt:'asc'}});}
export async function requireShop(id:string,ownerOnly=false){
 const user=await requireUser();const shop=await db.shop.findFirst({where:{id,OR:[{ownerId:user.id},...(ownerOnly?[]:[{members:{some:{userId:user.id,active:true}}}])]}});
 if(!shop)notFound();return {shop,user,isOwner:shop.ownerId===user.id};
}
