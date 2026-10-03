'use client';
import {useActionState,startTransition,type ReactNode} from 'react';
export type ActionState={error:string;success?:string;url?:string};
export function ActionForm({action,children,label='Save'}:{action:(state:ActionState,form:FormData)=>Promise<ActionState>;children:ReactNode;label?:string}){
 const [state,submit,pending]=useActionState(action,{error:''});
 return <form onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);startTransition(()=>submit(form));}} className="form-stack">{children}<div aria-live="polite">{state.error&&<p role="alert" className="error">{state.error}</p>}{state.success&&<p role="status" className="success">{state.success}</p>}{state.url&&<ShareLink path={state.url}/>}</div><button className="button" disabled={pending}>{pending?'Saving…':label}</button></form>;
}
function ShareLink({path}:{path:string}){return <div className="share-link"><a href={path}>Open invitation</a><button type="button" className="text-link" onClick={async e=>{const button=e.currentTarget;try{await navigator.clipboard.writeText(new URL(path,location.origin).href);button.textContent='Copied';}catch{button.textContent='Open the link and copy its address';}}}>Copy invitation link</button></div>;}
