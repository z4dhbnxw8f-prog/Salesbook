"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { login, register } from "@/actions/auth";
export function AuthForm({mode,next}:{mode:"login"|"register";next?:string}){
 const signingUp=mode==="register";const [state,action,pending]=useActionState(signingUp?register:login,{error:""});
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');
 return <form action={action} className="form-stack"><input type="hidden" name="next" value={next??""}/>{signingUp&&<label>Your name<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>}<label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input aria-label="Password" aria-describedby={signingUp?"password-hint":undefined} name="password" type="password" autoComplete={signingUp?"new-password":"current-password"} required minLength={signingUp?12:1} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)}/>{signingUp&&<span id="password-hint" className="hint">At least 12 characters.</span>}</label>{signingUp&&<label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" required/></label>}<div aria-live="polite">{state.error&&<p className="error" role="alert">{state.error}</p>}</div><button disabled={pending} className="button">{pending?"Please wait…":signingUp?"Create account →":"Sign in →"}</button><p className="small muted">{signingUp?"Already have an account? ":"New to BookMe? "}<Link href={(signingUp?"/login":"/register")+(next?`?next=${encodeURIComponent(next)}`:"")}>{signingUp?"Sign in":"Create an account"}</Link></p></form>;
}
