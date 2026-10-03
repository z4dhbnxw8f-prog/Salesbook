import {money} from '@/lib/money';

type Product = {id:string; name:string; stock:number; active:boolean; units:number};
type Employee = {id:string; name:string; units:number; revenue:number};

export function DashboardStatistics({products,employees,total,units,currency,isOwner}:{products:Product[];employees:Employee[];total:number;units:number;currency:string;isOwner:boolean}) {
 const available=products.filter(p=>p.active);
 const ranked=products.filter(p=>p.units>0).sort((a,b)=>b.units-a.units).slice(0,8);
 const maximum=Math.max(1,...ranked.map(p=>p.units));
 return <div className="dashboard-statistics">
  <div className="sales-stats two-stats">
   <article className="panel metric"><span>Units sold</span><h2>{units.toLocaleString('en-GB')}</h2><small>Selected sales filters · excludes voided sales</small></article>
   <article className="panel metric"><span>Products left in stock</span><h2>{available.reduce((sum,p)=>sum+p.stock,0).toLocaleString('en-GB')}</h2><small>Units available now · {available.length} active products</small></article>
  </div>
  <div className="management-grid">
   <section className="panel" aria-labelledby="sales-chart-title">
    <span className="eyebrow">SALES STATISTICS</span><h2 id="sales-chart-title">Units sold by product</h2>
    <p className="small muted">Top 8 products for the selected sales filters.</p>
    {ranked.length?<ul className="statistics-bars">{ranked.map(p=><li key={p.id}><div className="statistics-label"><span>{p.name}</span><strong>{p.units.toLocaleString('en-GB')} units</strong></div><div className="statistics-track" aria-hidden="true"><div style={{width:`${p.units/maximum*100}%`}}/></div></li>)}</ul>:<p className="empty">No sales to chart for these filters.</p>}
   </section>
   <section className="panel" aria-labelledby="employee-statistics-title">
    <span className="eyebrow">{isOwner?'TEAM PERFORMANCE':'YOUR PERFORMANCE'}</span><h2 id="employee-statistics-title">{isOwner?'Employee sales share':'Your sales share'}</h2>
    <p className="small muted">Percentage of filtered sales value. Units and value exclude voided sales.</p>
    {employees.length?<ul className="statistics-bars">{employees.map(e=>{const share=total>0?e.revenue/total*100:0;return <li key={e.id}><div className="statistics-label"><span>{e.name}</span><strong>{share.toFixed(1)}%</strong></div><div className="statistics-track" aria-hidden="true"><div style={{width:`${share}%`}}/></div><small className="muted">{e.units.toLocaleString('en-GB')} units · {money(e.revenue,currency)}</small></li>;})}</ul>:<p className="empty">No employees match these filters.</p>}
   </section>
  </div>
  <section className="panel ledger-panel" aria-labelledby="product-stock-title"><div className="section-heading"><div><span className="eyebrow">PRODUCT OVERVIEW</span><h2 id="product-stock-title">Sales & remaining stock</h2></div></div>
   <p className="small muted">Units sold follow your sales filters. Stock is the current quantity across the business.</p>
   {products.length?<div className="table-scroll"><table><thead><tr><th scope="col">Product</th><th scope="col">Units sold</th><th scope="col">Units left now</th><th scope="col">Stock status</th></tr></thead><tbody>{products.map(p=><tr key={p.id}><th scope="row">{p.name}</th><td>{p.units.toLocaleString('en-GB')}</td><td>{p.stock.toLocaleString('en-GB')}</td><td><span className={`pill ${!p.active?'status-void':p.stock<=5?'status-due':'status-paid'}`}>{!p.active?'Archived':p.stock===0?'Out of stock':p.stock<=5?'Low stock':'In stock'}</span></td></tr>)}</tbody></table></div>:<p className="empty">Add products in Items & stock to see their quantities here.</p>}
  </section>
 </div>;
}
