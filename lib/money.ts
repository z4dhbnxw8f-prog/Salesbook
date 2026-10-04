// Store amounts as integer hundredths, never floating-point currency.
export function parseMoney(value:string):number {
 if(!/^\d{1,7}(\.\d{1,2})?$/.test(value))throw new Error('Enter an amount from 0 to 9,999,999.99 with at most two decimal places.');
 const [whole,fraction='']=value.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
export function money(value:number,currency='GMD'){
 if(currency==='GMD')return `D ${new Intl.NumberFormat('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value/100)}`;
 return new Intl.NumberFormat('en-GB',{style:'currency',currency}).format(value/100).replaceAll('\u00a0',' ');
}
export function amountInput(value:number){return (value/100).toFixed(2);}
export function saleTotal(price:number,quantity:number){const total=price*quantity;if(!Number.isSafeInteger(total)||total<0||total>2_000_000_000)throw new Error('This sale amount is too large. Split it into smaller sales.');return total;}
export function dateRange(from?:string,to?:string){
 const valid=(s?:string)=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s?s:undefined;
 const a=valid(from),b=valid(to);return {gte:a?new Date(`${a}T00:00:00Z`):undefined,lt:b?new Date(Date.parse(`${b}T00:00:00Z`)+86400000):undefined};
}

export function parsePercentage(value:string):number {
 if(value.trim()==="")return 0;
 if(!/^\d{1,3}(\.\d{1,2})?$/.test(value))throw new Error("Enter an employee percentage from 0 to 100 with up to two decimal places.");
 const [whole,fraction=""]=value.split(".");const bps=Number(whole)*100+Number(fraction.padEnd(2,"0"));
 if(bps>10000)throw new Error("Employee percentage cannot exceed 100%.");return bps;
}

export function commissionAmount(totalMinor:number,percentageBps:number):number {
 if(!Number.isSafeInteger(totalMinor)||totalMinor<0||totalMinor>2_000_000_000||!Number.isInteger(percentageBps)||percentageBps<0||percentageBps>10000)throw new Error("Invalid commission amount or percentage.");
 return Math.floor((totalMinor*percentageBps+5000)/10000);
}
