"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LeadsTable from "@/components/leads/LeadsTable";
import JobStatus from "@/components/leads/JobStatus";

type Lead = {
  id: string;
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  status: string;
  confidence: number | null;
  sourceUrl: string | null;
  notes: string | null;
  createdAt: string;
};

type Pagination = { total: number; page: number; limit: number };

const STATUS_LABELS: Record<string, string> = {
  "": "Alle",
  NEW: "Neu",
  CONTACTED: "Kontaktiert",
  INTERESTED: "Interessiert",
  NOT_INTERESTED: "Kein Interesse",
  CONVERTED: "Gewonnen",
  INVALID: "Ungültig",
};

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId") ?? undefined;
  const statusFilter = searchParams.get("status") ?? "";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 50 });
  const [loading, setLoading] = useState(false);

  const fetchLeads = useCallback(
    async (page = 1) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (jobId) params.set("jobId", jobId);
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(page));
      params.set("limit", "50");

      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setPagination({ total: data.total, page: data.page, limit: data.limit });
      }
      setLoading(false);
    },
    [jobId, statusFilter]
  );

  useEffect(() => {
    fetchLeads(1);
  }, [fetchLeads]);

  // Poll while a job is running
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const job = await res.json();
        fetchLeads(1);
        if (job.status === "COMPLETED" || job.status === "FAILED") {
          clearInterval(interval);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [jobId, fetchLeads]);

  function setStatus(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) params.set("status", status);
    else params.delete("status");
    router.push(`/?${params}`);
  }

  const exportParams = new URLSearchParams();
  if (jobId) exportParams.set("jobId", jobId);
  if (statusFilter) exportParams.set("status", statusFilter);

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{pagination.total} Einträge</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/api/export/csv?${exportParams}`}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            CSV
          </a>
          <a
            href={`/api/export/xlsx?${exportParams}`}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            XLSX
          </a>
          <a
            href="/search"
            className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Neue Suche
          </a>
        </div>
      </div>

      {jobId && <JobStatus jobId={jobId} />}

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {Object.entries(STATUS_LABELS).map(([s, label]) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              statusFilter === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <LeadsTable
        leads={leads}
        loading={loading}
        onLeadUpdated={() => fetchLeads(pagination.page)}
      />

      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => fetchLeads(i + 1)}
              className={`w-8 h-8 text-sm rounded border ${
                pagination.page === i + 1
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
