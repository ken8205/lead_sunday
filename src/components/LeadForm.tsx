"use client";

import { useState } from "react";
import { createLead } from "@/app/actions";
import FormField from "@/components/FormField";

interface FormState {
  name: string;
  email: string;
  phone: string;
}

const initialState: FormState = { name: "", email: "", phone: "" };

export default function LeadForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await createLead(form, window.location.href);
      setStatus("success");
      setForm(initialState);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FormField id="name" label="이름" type="text" value={form.name} onChange={handleChange} placeholder="홍길동" />
      <FormField id="email" label="이메일" type="email" value={form.email} onChange={handleChange} placeholder="example@email.com" />
      <FormField id="phone" label="전화번호" type="tel" value={form.phone} onChange={handleChange} placeholder="010-0000-0000" />

      {status === "success" && (
        <p className="text-sm text-green-600">신청이 완료됐습니다. 감사합니다!</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500">오류가 발생했습니다. 다시 시도해주세요.</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60"
      >
        {status === "loading" ? "처리 중..." : "신청하기"}
      </button>
    </form>
  );
}
