import LeadForm from "@/components/LeadForm";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">문의 신청</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            아래 정보를 입력하시면 빠르게 연락드리겠습니다.
          </p>
        </div>
        <LeadForm />
      </div>
    </main>
  );
}
