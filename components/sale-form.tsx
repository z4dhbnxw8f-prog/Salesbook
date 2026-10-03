'use client';
import {useActionState,useState,startTransition} from 'react';
import {saveSaleData} from '@/actions/sales';
import {money,parseMoney,saleTotal} from '@/lib/money';
export function SaleForm({shopId,items,requestKey,currency}:{shopId:string;items:{id:string;name:string;priceMinor:number;stock:number}[];requestKey:string;currency:string}){
 const formatMoney=(value:number)=>money(value,currency);
 const [itemId,setItem]=useState(items[0]?.id??'');const [quantity,setQuantity]=useState('1');const [payment,setPayment]=useState('full');const [paid,setPaid]=useState('');const [customer,setCustomer]=useState('');const [note,setNote]=useState('');const [key,setKey]=useState(requestKey);
 const selected=items.find(i=>i.id===itemId)??items[0];let total=0;try{total=selected?saleTotal(selected.priceMinor,Number(quantity)):0;}catch{}
 const [state,submit,pending]=useActionState(async (previous:{error:string;success?:string},form:FormData)=>{const result=await saveSaleData(previous,form);if(!result.error){setKey(crypto.randomUUID());setQuantity('1');setCustomer('');setNote('');setPaid('');setPayment('full');}return result;},{error:''});
 if(!items.length)return <div className="empty">{state.success&&<p className="success" role="status">{state.success}</p>}<h3>No items available</h3><p>The owner needs to add items and stock before sales can be recorded.</p></div>;
 let received=total;if(payment==='partial'){try{received=parseMoney(paid);}catch{received=0;}}if(payment==='unpaid')received=0;
 return <form className="form-stack" onSubmit={e=>{e.preventDefault();const form=new FormData(e.currentTarget);startTransition(()=>submit(form));}}>
 <input type="hidden" name="shopId" value={shopId}/><input type="hidden" name="op" value="sale"/><input type="hidden" name="requestKey" value={key}/><input type="hidden" name="expectedPrice" value={selected?.priceMinor??0}/><input type="hidden" name="paid" value={payment==='full'?(total/100).toFixed(2):payment==='unpaid'?'0':paid}/>
 <label>Item<select name="itemId" aria-label="Item" value={selected?.id??''} onChange={e=>setItem(e.target.value)} required>{items.map(i=><option key={i.id} value={i.id}>{i.name} · {formatMoney(i.priceMinor)} · {i.stock} left</option>)}</select></label>
 <div className="form-grid"><label>Quantity<input name="quantity" type="number" min={1} max={selected?.stock??0} step={1} value={quantity} onChange={e=>setQuantity(e.target.value)} required/></label><div className="price-readout"><span>Price per item</span><strong>{formatMoney(selected?.priceMinor??0)}</strong></div></div>
 <label>Payment<select aria-label="Payment" value={payment} onChange={e=>setPayment(e.target.value)}><option value="full">Paid in full</option><option value="partial">Partly paid</option><option value="unpaid">Not paid yet</option></select></label>
 {payment==='partial'&&<label>Amount received ({currency})<input type="number" min="0.01" max={(total/100).toFixed(2)} step="0.01" value={paid} onChange={e=>setPaid(e.target.value)} required/></label>}
 <label>Customer name {payment==='full'?'(optional)':''}<input name="customerName" maxLength={100} value={customer} onChange={e=>setCustomer(e.target.value)} required={payment!=='full'}/></label>
 <label>Note (optional)<textarea name="note" maxLength={500} value={note} onChange={e=>setNote(e.target.value)} rows={2}/></label>
 <div className="sale-total"><span>Sale total</span><strong>{formatMoney(total)}</strong><small>Received: {formatMoney(received)} · Unpaid: {formatMoney(Math.max(0,total-received))}</small></div>
 <div aria-live="polite">{state.error&&<p className="error" role="alert">{state.error}</p>}{state.success&&<p className="success" role="status">{state.success}</p>}</div>
 <button className="button" disabled={pending||!selected||Number(quantity)>selected.stock||Number(quantity)<1}>{pending?'Recording…':'Record sale'}</button><p className="small muted">Stock and totals update when the sale is saved. Prices are set by the owner.</p></form>;
}
