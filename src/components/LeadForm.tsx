"use client";

import { useState } from "react";
import { createLead } from "@/app/actions";

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
      await createLead(form);
      setStatus("success");
      setForm(initialState);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium text-gray-700">
          이름
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="홍길동"
          value={form.name}
          onChange={handleChange}
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          이메일
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="example@email.com"
          value={form.email}
          onChange={handleChange}
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium text-gray-700">
          전화번호
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          placeholder="010-0000-0000"
          value={form.phone}
          onChange={handleChange}
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

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
