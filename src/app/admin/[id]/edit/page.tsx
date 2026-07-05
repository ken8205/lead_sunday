import { notFound } from "next/navigation";
import { getLeadById, getMemosForLead } from "@/app/actions";
import LeadEditForm from "@/components/LeadEditForm";
import LeadMemos from "@/components/LeadMemos";
import Link from "next/link";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leadId = Number(id);

  if (isNaN(leadId) || leadId <= 0) notFound();

  const [lead, memos] = await Promise.all([
    getLeadById(leadId),
    getMemosForLead(leadId),
  ]);

  if (!lead) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg px-6 py-10">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-700 transition"
          >
            ← 목록으로
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">리드 수정</h1>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
            <LeadEditForm lead={lead} />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-6 py-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 mb-4">메모</h2>
            <LeadMemos leadId={lead.id} memos={memos} />
          </div>
        </div>
      </div>
    </div>
  );
}
