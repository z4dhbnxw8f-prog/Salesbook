"use server";
import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { loginSchema, registerSchema } from "@/lib/validation";
import { allowAuthAttempt, createSession, destroySession } from "@/services/auth";
export type FormState = {error:string};
export async function register(_:FormState,form:FormData):Promise<FormState> {
 const result=registerSchema.safeParse(Object.fromEntries(form)); if(!result.success) return {error:result.error.issues[0].message};
 try {
  if(!await allowAuthAttempt(result.data.email)) return {error:"Too many attempts. Try again in 15 minutes."};
  const passwordHash=await bcrypt.hash(result.data.password,12);
  const user=await db.user.create({data:{name:result.data.name,email:result.data.email,passwordHash}});
  await createSession(user.id);
 } catch {return {error:"We could not create your account. Try signing in, or try again later."};}
 redirect(authDestination(form));
}
export async function login(_:FormState,form:FormData):Promise<FormState> {
 const result=loginSchema.safeParse(Object.fromEntries(form));if(!result.success) return {error:"Enter a valid email and password."};
 try {
  if(!await allowAuthAttempt(result.data.email)) return {error:"Too many attempts. Try again in 15 minutes."};
  const user=await db.user.findUnique({where:{email:result.data.email}});
  const valid=await bcrypt.compare(result.data.password,user?.passwordHash ?? "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW");
  if(!user || !valid) return {error:"Email or password is incorrect."};
  await createSession(user.id);
 } catch {return {error:"Sign-in is temporarily unavailable. Please try again later."};}
 redirect(authDestination(form));
}
export async function logout(){await destroySession();redirect("/login");}

function authDestination(form:FormData){const next=String(form.get("next")??"");return /^\/join\/[a-f0-9]{64}$/.test(next)?next:"/dashboard";}
