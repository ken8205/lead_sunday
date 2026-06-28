"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";

export async function createLead(data: {
  name: string;
  email: string;
  phone: string;
}) {
  await db.insert(leads).values(data);
}
