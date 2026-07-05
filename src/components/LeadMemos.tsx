"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMemo } from "@/app/actions";
import type { LeadMemo } from "@/db/schema";

export default function LeadMemos({
  leadId,
  memos,
}: {
  leadId: number;
  memos: LeadMemo[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setStatus("loading");
    try {
      await addMemo(leadId, content.trim());
      setContent("");
      router.refresh();
      setStatus("idle");
    } catch (err) {
      console.error("[LeadMemos] 메모 저장 오류:", err);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {memos.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">아직 메모가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-3 max-h-80 overflow-y-auto">
          {memos.map((memo) => (
            <li key={memo.id} className="rounded-lg bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-400 mb-1">
                {new Date(memo.createdAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{memo.content}</p>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모를 입력하세요..."
          rows={3}
          className="rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
        />
        {status === "error" && (
          <p className="text-sm text-red-500">저장 중 오류가 발생했습니다.</p>
        )}
        <button
          type="submit"
          disabled={status === "loading" || !content.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60"
        >
          {status === "loading" ? "저장 중..." : "메모 추가"}
        </button>
      </form>
    </div>
  );
}
