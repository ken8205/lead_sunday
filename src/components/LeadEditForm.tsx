"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLead } from "@/app/actions";
import FormField from "@/components/FormField";
import TextAreaField from "@/components/TextAreaField";
import type { Lead } from "@/db/schema";

export default function LeadEditForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    inquiry: lead.inquiry ?? "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await updateLead(lead.id, form);
      setStatus("idle");
      router.push("/admin");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormField id="name" label="이름" type="text" value={form.name} onChange={handleChange} />
      <FormField id="email" label="이메일" type="email" value={form.email} onChange={handleChange} />
      <FormField id="phone" label="전화번호" type="tel" value={form.phone} onChange={handleChange} />
      <TextAreaField id="inquiry" label="문의 내용" value={form.inquiry} onChange={handleChange} />

      {status === "error" && (
        <p className="text-sm text-red-500">오류가 발생했습니다. 다시 시도해주세요.</p>
      )}

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60"
        >
          {status === "loading" ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
