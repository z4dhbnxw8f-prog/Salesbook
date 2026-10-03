import "server-only";
import {notFound} from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/services/auth";
export async function ownedBusinesses() {const user=await requireUser();return db.business.findMany({where:{ownerId:user.id},orderBy:{createdAt:"asc"}});}
export async function requireBusiness(id:string) {const user=await requireUser();const business=await db.business.findFirst({where:{id,ownerId:user.id}});if(!business) notFound();return business;}
