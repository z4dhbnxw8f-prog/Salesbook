'use server';
import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {db} from '@/lib/db';
import {requireUser} from '@/services/auth';
import {requireShop} from '@/services/shops';
import {parseMoney,saleTotal} from '@/lib/money';
import {currencyCodes} from '@/lib/currency';
import type {ActionState} from '@/components/action-form';
import type {Prisma} from '@/generated/prisma/client';
const hash=(v:string)=>createHash('sha256').update(v).digest('hex');
class InputError extends Error {}
const amount=z.string().transform((v,ctx)=>{try{return parseMoney(v);}catch{ctx.addIssue({code:'custom',message:'Enter a valid amount with up to two decimal places.'});return z.NEVER;}});
const text=(min=0,max=200)=>z.string().trim().min(min).max(max);
const quantity=z.coerce.number().int().min(1).max(100000);
const key=z.uuid();
export async function createShop(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireUser();const name=text(2,100).safeParse(form.get('name'));if(!name.success)return {error:'Enter a business name (2–100 characters).'};
 const currency=z.enum(currencyCodes).safeParse(form.get('currency'));if(!currency.success)return {error:'Choose a supported currency.'};
 const shop=await db.shop.create({data:{name:name.data,currency:currency.data,ownerId:user.id}});redirect(`/dashboard/${shop.id}`);
}
async function heldBy(tx:Prisma.TransactionClient,shopId:string,workerId:string){
 const [sales,handovers]=await Promise.all([tx.sale.aggregate({where:{shopId,sellerId:workerId,voidedAt:null},_sum:{paidMinor:true}}),tx.handover.aggregate({where:{shopId,workerId,voidedAt:null},_sum:{amountMinor:true}})]);
 return (sales._sum.paidMinor??0)-(handovers._sum.amountMinor??0);
}
export async function saveSaleData(_:ActionState,form:FormData):Promise<ActionState>{
 const shopId=String(form.get('shopId'));const {shop,user,isOwner}=await requireShop(shopId);const op=String(form.get('op'));const data=Object.fromEntries(form);
 const ownerOps=['item','restock','toggle','invite','removeWorker','handover','voidSale','voidHandover','rename','currency'];
 if(ownerOps.includes(op)&&!isOwner)return {error:'Only the owner can make this change.'};
 let url:string|undefined;
 try{await db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Shop" WHERE id=${shopId} FOR UPDATE`;
  if(!isOwner&&!await tx.shopMember.findFirst({where:{shopId,userId:user.id,active:true}}))throw new InputError('Your access has been removed.');
  if(op==='item'){
   const v=z.object({name:text(2,100),price:amount}).parse(data);const itemId=String(form.get('itemId')??'');
   if(itemId){const found=await tx.item.findFirst({where:{id:itemId,shopId}});if(!found)throw new InputError('Item not found.');await tx.item.update({where:{id:itemId},data:{name:v.name,priceMinor:v.price}});}
   else{const stock=z.coerce.number().int().min(0).max(1000000).parse(form.get('stock'));const item=await tx.item.create({data:{shopId,name:v.name,priceMinor:v.price,stock}});if(stock)await tx.stockEntry.create({data:{shopId,itemId:item.id,quantity:stock,note:'Opening stock'}});}
  }else if(op==='restock'){
   const v=z.object({itemId:text(1),quantity:z.coerce.number().int().min(-1000000).max(1000000).refine(v=>v!==0,'Enter a non-zero quantity.'),note:text(2)}).parse(data);
   const item=await tx.item.findFirst({where:{id:v.itemId,shopId}});if(!item)throw new InputError('Item not found.');if(item.stock+v.quantity<0||item.stock+v.quantity>1000000)throw new InputError('Stock must stay between 0 and 1,000,000.');
   await tx.item.update({where:{id:item.id},data:{stock:{increment:v.quantity}}});await tx.stockEntry.create({data:{shopId,...v}});
  }else if(op==='toggle'){
   const item=await tx.item.findFirst({where:{id:String(form.get('itemId')),shopId}});if(!item)throw new InputError('Item not found.');await tx.item.update({where:{id:item.id},data:{active:!item.active}});
  }else if(op==='sale'){
   const v=z.object({itemId:text(1),quantity,paid:amount,customerName:text(0,100),note:text(0,500),requestKey:key,expectedPrice:z.coerce.number().int().min(0)}).parse(data);
   if(await tx.sale.findUnique({where:{requestKey:v.requestKey}}))return;
   const item=await tx.item.findFirst({where:{id:v.itemId,shopId,active:true}});if(!item)throw new InputError('This item is unavailable.');
   if(item.priceMinor!==v.expectedPrice)throw new InputError('The price changed. Refresh the page before recording this sale.');
   if(item.stock<v.quantity)throw new InputError(`Only ${item.stock} units are in stock.`);
   let total:number;try{total=saleTotal(item.priceMinor,v.quantity);}catch{throw new InputError('This sale is too large. Split it into smaller sales.');}
   if(v.paid>total)throw new InputError('Amount received cannot exceed the sale total.');
   if(v.paid<total&&!v.customerName)throw new InputError('Enter a customer name for an unpaid or partly paid sale.');
   const sale=await tx.sale.create({data:{shopId,itemId:item.id,sellerId:user.id,itemName:item.name,quantity:v.quantity,unitPriceMinor:item.priceMinor,totalMinor:total,paidMinor:v.paid,customerName:v.customerName,note:v.note,requestKey:v.requestKey}});
   if(v.paid)await tx.saleCollection.create({data:{saleId:sale.id,amountMinor:v.paid,requestKey:v.requestKey}});
   await tx.item.update({where:{id:item.id},data:{stock:{decrement:v.quantity}}});
  }else if(op==='collect'){
   const v=z.object({saleId:text(1),paid:amount,requestKey:key}).parse(data);if(await tx.saleCollection.findUnique({where:{requestKey:v.requestKey}}))return;
   const sale=await tx.sale.findFirst({where:{id:v.saleId,shopId,voidedAt:null,...(!isOwner?{sellerId:user.id}:{})}});if(!sale)throw new InputError('Sale not found.');
   if(v.paid<=0||v.paid>sale.totalMinor-sale.paidMinor)throw new InputError('Enter an amount greater than zero and no more than the unpaid balance.');
   await tx.sale.update({where:{id:sale.id},data:{paidMinor:{increment:v.paid}}});await tx.saleCollection.create({data:{saleId:sale.id,amountMinor:v.paid,requestKey:v.requestKey}});
  }else if(op==='voidSale'){
   const reason=text(3,300).parse(form.get('reason'));const sale=await tx.sale.findFirst({where:{id:String(form.get('saleId')),shopId,voidedAt:null}});if(!sale)throw new InputError('Sale is already void or unavailable.');
   if(sale.sellerId!==shop.ownerId&&(await heldBy(tx,shopId,sale.sellerId))<sale.paidMinor)throw new InputError('Void the related money handover first so the worker balance does not become negative.');
   await tx.sale.update({where:{id:sale.id},data:{voidedAt:new Date(),voidReason:reason}});await tx.item.update({where:{id:sale.itemId},data:{stock:{increment:sale.quantity}}});
  }else if(op==='handover'){
   const v=z.object({workerId:text(1),amount:amount,note:text(0,300),requestKey:key}).parse(data);if(await tx.handover.findUnique({where:{requestKey:v.requestKey}}))return;
   if(!await tx.shopMember.findUnique({where:{shopId_userId:{shopId,userId:v.workerId}}}))throw new InputError('Worker not found.');
   if(v.amount<=0||v.amount>await heldBy(tx,shopId,v.workerId))throw new InputError('Amount must be positive and no more than the money this worker holds.');
   await tx.handover.create({data:{shopId,workerId:v.workerId,amountMinor:v.amount,note:v.note,requestKey:v.requestKey}});
  }else if(op==='voidHandover'){
   const reason=text(3,300).parse(form.get('reason'));await tx.handover.updateMany({where:{id:String(form.get('handoverId')),shopId,voidedAt:null},data:{voidedAt:new Date(),voidReason:reason}});
  }else if(op==='invite'){
   const email=z.email().max(254).parse(String(form.get('email')).trim().toLowerCase());if(email===user.email)throw new InputError('Use your worker’s email address.');
   const token=randomBytes(32).toString('hex');await tx.shopInvitation.deleteMany({where:{shopId,email,acceptedAt:null}});
   await tx.shopInvitation.create({data:{shopId,email,tokenHash:hash(token),expiresAt:new Date(Date.now()+7*86400000)}});url=`/join/${token}`;
  }else if(op==='removeWorker'){
   await tx.shopMember.updateMany({where:{id:String(form.get('memberId')),shopId},data:{active:false}});
  }else if(op==='rename'){
   await tx.shop.update({where:{id:shopId},data:{name:text(2,100).parse(form.get('name'))}});
    }else if(op==='currency'){
     const currency=z.enum(currencyCodes).parse(form.get('currency'));await tx.shop.update({where:{id:shopId},data:{currency}});
  }else throw new InputError('Unknown action.');
 });}catch(e){return {error:e instanceof z.ZodError?e.issues[0].message:e instanceof InputError?e.message:'Could not save. Please try again.'};}
 revalidatePath('/dashboard');revalidatePath(`/dashboard/${shopId}`);return {error:'',success:op==='sale'?'Sale recorded.':op==='handover'?'Money received recorded.':op==='invite'?'Invitation ready. Copy the private link and send it to your worker.':'Saved.',url};
}
export async function acceptInvitation(_:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireUser();const token=String(form.get('token'));if(!/^[a-f0-9]{64}$/.test(token))return {error:'Invalid invitation.'};
 const invite=await db.shopInvitation.findUnique({where:{tokenHash:hash(token)}});if(!invite||invite.email!==user.email||invite.expiresAt<new Date()||invite.acceptedAt)return {error:'This invitation has expired, was used, or belongs to another email address.'};
 await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Shop" WHERE id=${invite.shopId} FOR UPDATE`;
 const used=await tx.shopInvitation.updateMany({where:{id:invite.id,acceptedAt:null,expiresAt:{gt:new Date()}},data:{acceptedAt:new Date()}});if(!used.count)return;
 await tx.shopMember.upsert({where:{shopId_userId:{shopId:invite.shopId,userId:user.id}},create:{shopId:invite.shopId,userId:user.id},update:{active:true}});
 });redirect(`/dashboard/${invite.shopId}`);
}
