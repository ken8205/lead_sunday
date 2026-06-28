"use client";

import { useRouter } from "next/navigation";
import { deleteLead } from "@/app/actions";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
}

export default function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    await deleteLead(id);
    router.refresh();
  }

  if (leads.length === 0) {
    return (
      <p className="text-center text-gray-500 py-12">접수된 리드가 없습니다.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-3 pr-6 font-medium">이름</th>
            <th className="pb-3 pr-6 font-medium">이메일</th>
            <th className="pb-3 pr-6 font-medium">전화번호</th>
            <th className="pb-3 pr-6 font-medium">신청일시</th>
            <th className="pb-3 font-medium">액션</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3.5 pr-6 font-medium text-gray-900">{lead.name}</td>
              <td className="py-3.5 pr-6 text-gray-600">{lead.email}</td>
              <td className="py-3.5 pr-6 text-gray-600">{lead.phone}</td>
              <td className="py-3.5 pr-6 text-gray-500">
                {new Date(lead.createdAt).toLocaleString("ko-KR", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="py-3.5">
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/${lead.id}/edit`)}
                    className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200 transition"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(lead.id, lead.name)}
                    className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                  >
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
