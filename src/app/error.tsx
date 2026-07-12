"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportError } from "@/app/actions";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
    reportError({
      message: error.message,
      digest: error.digest,
      url: typeof window !== "undefined" ? window.location.href : undefined,
    }).catch((err) => console.error("[Error Notification] 발송 실패:", err));
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-6 text-center">
      <h1 className="text-xl font-bold text-gray-900">문제가 발생했습니다</h1>
      <p className="text-sm text-gray-500">
        예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
