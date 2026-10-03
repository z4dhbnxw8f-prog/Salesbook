import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
const cookieName = process.env.NODE_ENV === "production" ? "__Host-bookme-session" : "bookme-session";
const digest = (value:string) => createHash("sha256").update(value).digest("hex");
export async function createSession(userId:string) {
  const token=randomBytes(32).toString("hex");
  const expiresAt=new Date(Date.now()+7*24*60*60*1000);
  await db.session.create({data:{userId,tokenHash:digest(token),expiresAt}});
  (await cookies()).set(cookieName,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
}
export async function currentUser() {
  const token=(await cookies()).get(cookieName)?.value;
  if(!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session=await db.session.findUnique({where:{tokenHash:digest(token)},include:{user:{select:{id:true,name:true,email:true}}}});
  return session && session.expiresAt>new Date() ? session.user : null;
}
export async function requireUser() { const user=await currentUser(); if(!user) redirect("/login"); return user; }
export async function destroySession() {
  const jar=await cookies(); const token=jar.get(cookieName)?.value;
  if(token) await db.session.deleteMany({where:{tokenHash:digest(token)}});
  jar.delete(cookieName);
}
// Database-backed atomic fixed window; consistent across Vercel instances.
export async function allowAuthAttempt(email:string) {
  const key=digest(`auth:${email}`); const now=new Date(); const reset=new Date(Date.now()+15*60*1000);
  const rows=await db.$queryRaw<{count:number}[]>`INSERT INTO "RateLimit" ("key","count","resetAt") VALUES (${key},1,${reset}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count"+1 END, "resetAt"=CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${reset} ELSE "RateLimit"."resetAt" END RETURNING "count"`;
  return rows[0].count<=10;
}
