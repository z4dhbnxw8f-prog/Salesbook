import {requireUser} from '@/services/auth';
import {Brand} from '@/components/brand';
import {ActionForm} from '@/components/action-form';
import {createShop} from '@/actions/sales';
import {currencyCodes,currencyNames} from '@/lib/currency';
import Link from 'next/link';
export default async function Page(){await requireUser();return <><header className="topbar"><Brand href="/dashboard"/><Link href="/dashboard">Your workspace</Link></header><main id="main" className="onboarding"><span className="eyebrow">LET’S GET STARTED</span><h1>Create your sales book.</h1><p className="lead">Add your business name, then set up items and invite your worker.</p><section className="panel"><ActionForm action={createShop} label="Create sales book"><label>Business name<input name="name" required minLength={2} maxLength={100} placeholder="Your business name"/></label><label>Currency<select name="currency" defaultValue="GMD">{currencyCodes.map(code=><option key={code} value={code}>{currencyNames[code]} ({code})</option>)}</select></label><p className="small muted">Dates use Gambia time.</p></ActionForm></section><p className="small muted">Joining as a worker? Open the invitation link your employer sent you.</p></main></>;}
