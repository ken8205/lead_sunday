"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateLead } from "@/app/actions";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export default function LeadEditForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      await updateLead(lead.id, form);
      setStatus("success");
      router.push("/admin");
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
          value={form.phone}
          onChange={handleChange}
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

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
