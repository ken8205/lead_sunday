"use client";

import { useState } from "react";

interface FormState {
  name: string;
  email: string;
  phone: string;
}

const initialState: FormState = { name: "", email: "", phone: "" };

export default function LeadForm() {
  const [form, setForm] = useState<FormState>(initialState);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log("제출된 데이터:", form);
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

      <button
        type="submit"
        className="mt-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
      >
        신청하기
      </button>
    </form>
  );
}
