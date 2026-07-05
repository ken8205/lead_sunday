"use server";

import { db } from "@/db";
import { leads, leadMemos } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

if (!process.env.RESEND_API_KEY) {
  console.warn("[Resend] RESEND_API_KEY is not set — email notifications are disabled");
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function leadNotificationHtml(data: { name: string; email: string; phone: string }) {
  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const phone = escapeHtml(data.phone);
  return `
    <h2>새 리드 접수</h2>
    <table style="border-collapse:collapse;width:100%;max-width:480px">
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">이름</td><td style="padding:8px 12px">${name}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">이메일</td><td style="padding:8px 12px">${email}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">전화번호</td><td style="padding:8px 12px">${phone}</td></tr>
    </table>
  `;
}

export async function createLead(data: {
  name: string;
  email: string;
  phone: string;
}) {
  try {
    await db.insert(leads).values(data);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "code" in err && err.code === "23505") {
      throw new Error("이미 등록된 이메일입니다.");
    }
    throw err;
  }

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: "Lead Sunday <onboarding@resend.dev>",
      to: "kenpark8500@gmail.com",
      subject: "새 리드가 접수됐습니다",
      html: leadNotificationHtml(data),
    });
    if (error) {
      console.error("[Resend] 이메일 발송 실패:", error);
    } else {
      console.log("[Resend] 이메일 발송 성공:", emailData?.id);
    }
  } catch (err) {
    console.error("[Resend] 이메일 발송 오류:", err);
  }
}

export async function getLeads() {
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: number) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return lead ?? null;
}

export async function deleteLead(id: number) {
  const deleted = await db.delete(leads).where(eq(leads.id, id)).returning({ id: leads.id });
  if (deleted.length === 0) throw new Error("Lead not found");
}

export async function updateLead(
  id: number,
  data: { name: string; email: string; phone: string }
) {
  const updated = await db
    .update(leads)
    .set(data)
    .where(eq(leads.id, id))
    .returning({ id: leads.id });
  if (updated.length === 0) throw new Error("Lead not found");
}

export async function getLeadsWithMemos() {
  const [allLeads, allMemos] = await Promise.all([
    db.select().from(leads).orderBy(desc(leads.createdAt)),
    db.select().from(leadMemos).orderBy(asc(leadMemos.createdAt)),
  ]);

  const memosByLeadId = allMemos.reduce<Record<number, typeof allMemos>>(
    (acc, memo) => {
      (acc[memo.leadId] ??= []).push(memo);
      return acc;
    },
    {}
  );

  return allLeads.map((lead) => ({
    ...lead,
    memos: memosByLeadId[lead.id] ?? [],
  }));
}

export async function getMemosForLead(leadId: number) {
  return db
    .select()
    .from(leadMemos)
    .where(eq(leadMemos.leadId, leadId))
    .orderBy(asc(leadMemos.createdAt));
}

export async function addMemo(leadId: number, content: string) {
  if (!content.trim()) throw new Error("Content is required");
  await db.insert(leadMemos).values({ leadId, content });
}
