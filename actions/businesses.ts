"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { businessSchema } from "@/lib/validation";
import { requireUser } from "@/services/auth";
import type { FormState } from "./auth";
export async function createBusiness(_:FormState,form:FormData):Promise<FormState> {
 const user=await requireUser();const result=businessSchema.safeParse(Object.fromEntries(form));
 if(!result.success)return {error:result.error.issues[0].message};
 try{await db.business.create({data:{...result.data,ownerId:user.id}});}catch{return {error:"Could not create your business. The booking address may already be taken."};}
 redirect("/dashboard");
}
