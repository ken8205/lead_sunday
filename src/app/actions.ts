"use server";

import { db } from "@/db";
import { leads } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function leadNotificationHtml(data: { name: string; email: string; phone: string }) {
  return `
    <h2>새 리드 접수</h2>
    <table style="border-collapse:collapse;width:100%;max-width:480px">
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">이름</td><td style="padding:8px 12px">${data.name}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">이메일</td><td style="padding:8px 12px">${data.email}</td></tr>
      <tr><td style="padding:8px 12px;background:#f3f4f6;font-weight:600">전화번호</td><td style="padding:8px 12px">${data.phone}</td></tr>
    </table>
  `;
}

export async function createLead(data: {
  name: string;
  email: string;
  phone: string;
}) {
  await db.insert(leads).values(data);

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
  await db.delete(leads).where(eq(leads.id, id));
}

export async function updateLead(
  id: number,
  data: { name: string; email: string; phone: string }
) {
  await db.update(leads).set(data).where(eq(leads.id, id));
}
