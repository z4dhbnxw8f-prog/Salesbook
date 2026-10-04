import {db} from '@/lib/db';
import {requireShop} from '@/services/shops';
import {dateRange,amountInput} from '@/lib/money';
function csv(value:unknown){let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s=`'${s}`;return `"${s.replaceAll('"','""')}"`;}
export async function GET(request:Request){
 const params=new URL(request.url).searchParams;const {shop,user,isOwner}=await requireShop(params.get('shopId')??'');
 const sales=await db.sale.findMany({where:{shopId:shop.id,soldAt:dateRange(params.get('from')??undefined,params.get('to')??undefined),...(!isOwner?{sellerId:user.id}:params.get('seller')?{sellerId:params.get('seller')!}:{})},include:{seller:{select:{name:true}}},orderBy:{soldAt:'desc'}});
 const currency=shop.currency;
 const rows=[['Date (Gambia time)','Item','Seller','Quantity',`Unit price (${currency})`,`Total (${currency})`,`Received (${currency})`,`Unpaid (${currency})`,'Employee percentage',`Commission (${currency})`,'Customer','Status','Note'],...sales.map(s=>[s.soldAt.toISOString(),s.itemName,s.seller.name,s.quantity,amountInput(s.unitPriceMinor),amountInput(s.totalMinor),amountInput(s.paidMinor),amountInput(s.totalMinor-s.paidMinor),s.employeePercentageBps/100,amountInput(s.voidedAt?0:s.commissionMinor),s.customerName,s.voidedAt?'Voided':s.paidMinor===s.totalMinor?'Paid':'Unpaid/part paid',s.note])];
 return new Response('\uFEFF'+rows.map(r=>r.map(csv).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="sales.csv"','Cache-Control':'private, no-store'}});
}
