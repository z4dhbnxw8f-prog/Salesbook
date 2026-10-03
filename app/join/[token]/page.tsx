import {createHash} from 'node:crypto';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {db} from '@/lib/db';
import {currentUser} from '@/services/auth';
import {Brand} from '@/components/brand';
import {ActionForm} from '@/components/action-form';
import {acceptInvitation} from '@/actions/sales';
export const metadata={robots:{index:false,follow:false},referrer:'same-origin' as const};
export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[a-f0-9]{64}$/.test(token))notFound();const invite=await db.shopInvitation.findUnique({where:{tokenHash:createHash('sha256').update(token).digest('hex')},include:{shop:true}});if(!invite||invite.acceptedAt||invite.expiresAt<new Date())notFound();
 const user=await currentUser();const next=encodeURIComponent(`/join/${token}`);
 return <><header className="topbar"><Brand href={user?"/dashboard":"/"}/></header><main id="main" className="onboarding"><section className="panel"><span className="eyebrow">YOU’RE INVITED</span><h1>Join {invite.shop.name}.</h1><p>Record sales, check stock and track money you hand over. Use the email address your employer invited.</p>{!user?<div className="invite-actions"><Link className="button" href={`/register?next=${next}`}>Create your worker account</Link><Link className="text-link" href={`/login?next=${next}`}>Already registered? Sign in</Link></div>:user.email!==invite.email?<p className="error">You are signed in as {user.email}. Sign out and use your invited email address.</p>:<ActionForm action={acceptInvitation} label="Join sales book"><input type="hidden" name="token" value={token}/></ActionForm>}</section></main></>;
}
