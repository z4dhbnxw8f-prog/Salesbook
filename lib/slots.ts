export type Window = {weekday:number;startMinute:number;endMinute:number};
export type Interval = {startAt:Date;endAt:Date};
export function localParts(date:Date,timezone:string){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,minute:Number(p.hour)*60+Number(p.minute),weekday:new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`).getUTCDay()};
}
export function slots(input:{date:string;timezone:string;duration:number;buffer:number;interval:number;notice:number;days:number;windows:Window[];busy:Interval[];now?:Date}){
 const {date,timezone,duration,buffer,interval,notice,days,windows,busy}=input;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||interval<1||duration<1)return [];
 const now=input.now??new Date(); const midnight=Date.parse(`${date}T00:00:00Z`);const result:Date[]=[];
 // Iterate real instants: missing DST times never exist and repeated times retain distinct offsets.
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const parts=(t:number)=>{const p=Object.fromEntries(formatter.formatToParts(t).map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,minute:+p.hour*60+ +p.minute};};
 const weekday=new Date(`${date}T12:00:00Z`).getUTCDay();
 for(let t=midnight-14*3600000;t<midnight+38*3600000;t+=60000){
  if(t<now.getTime()+notice*60000||t>now.getTime()+days*86400000)continue;
  const p=parts(t);if(p.date!==date)continue;
  const window=windows.find(w=>w.weekday===weekday&&p.minute>=w.startMinute&&p.minute<w.endMinute&&(p.minute-w.startMinute)%interval===0);if(!window)continue;
  const end=t+(duration+buffer)*60000;
  if(busy.some(b=>t<b.endAt.getTime()&&end>b.startAt.getTime()))continue;
  let fits=true;
  for(let m=0;m<duration+buffer;m++){const q=parts(t+m*60000);if(q.date!==date||q.minute<window.startMinute||q.minute>=window.endMinute){fits=false;break;}}
  if(fits)result.push(new Date(t));
 }
 return result;
}
export function formatTime(date:Date,timezone:string){return new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'}).format(date);}
