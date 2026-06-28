"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function createLead(data: {
  name: string;
  email: string;
  phone: string;
}) {
  await db.insert(leads).values(data);
}

export async function getLeads() {
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function deleteLead(id: number) {
  await db.delete(leads).where(eq(leads.id, id));
}

export async function updateLead(
  id: number,
  data: { name: string; email: string; phone: string }
) {
  await db.update(leads).set(data).where(eq(leads.id, id));
}
