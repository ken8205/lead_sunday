import { getLeads } from "@/app/actions";
import LeadsTable from "@/components/LeadsTable";
import Link from "next/link";

export default async function AdminPage() {
  const leads = await getLeads();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">리드 관리</h1>
            <p className="mt-1 text-sm text-gray-500">총 {leads.length}건</p>
          </div>
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
          >
            신청 페이지
          </Link>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
          <LeadsTable leads={leads} />
        </div>
      </div>
    </div>
  );
}
