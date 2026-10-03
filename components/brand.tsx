import Link from 'next/link';
import {ChartNoAxesCombined} from 'lucide-react';
export function Brand({href="/"}:{href?:string}){return <Link href={href} className="brand"><span className="brand-icon"><ChartNoAxesCombined size={22}/></span>salesbook<span className="brand-dot">.</span></Link>;}
