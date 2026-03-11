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
  sourceName: string | null;
  status: string;
  confidence: number | null;
  sourceUrl: string | null;
  notes: string | null;
  tags: string[];
  followUpAt: string | null;
  createdAt: string;
};

type Stats = { byStatus: Record<string, number>; total: number };
type Pagination = { total: number; page: number; limit: number };

const STATUS_LABELS: Record<string, string> = {
  "":              "Alle",
  NEW:             "Neu",
  CONTACTED:       "Kontaktiert",
  INTERESTED:      "Interessiert",
  NOT_INTERESTED:  "Kein Interesse",
  CONVERTED:       "Gewonnen",
  INVALID:         "Ungültig",
};

const STATUS_KPI = [
  { key: "NEW",        label: "Neu",         color: "text-gray-700 bg-gray-100"    },
  { key: "CONTACTED",  label: "Kontaktiert",  color: "text-blue-700 bg-blue-100"   },
  { key: "INTERESTED", label: "Interessiert", color: "text-amber-700 bg-amber-100" },
  { key: "CONVERTED",  label: "Gewonnen",     color: "text-emerald-700 bg-emerald-100" },
];

const SORT_OPTIONS = [
  { value: "confidence",  label: "Qualität" },
  { value: "createdAt",   label: "Datum" },
  { value: "companyName", label: "Firma A–Z" },
  { value: "city",        label: "Ort A–Z" },
  { value: "followUpAt",  label: "Follow-up" },
];

const STATUS_BULK_OPTIONS = [
  { value: "CONTACTED",      label: "→ Kontaktiert" },
  { value: "INTERESTED",     label: "→ Interessiert" },
  { value: "NOT_INTERESTED", label: "→ Kein Interesse" },
  { value: "CONVERTED",      label: "→ Gewonnen" },
  { value: "INVALID",        label: "→ Ungültig" },
];

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const jobId        = searchParams.get("jobId")        ?? undefined;
  const statusFilter = searchParams.get("status")       ?? "";
  const sortFilter   = searchParams.get("sort")         ?? "confidence";
  const tagFilter    = searchParams.get("tag")          ?? "";

  const [leads, setLeads]         = useState<Lead[]>([]);
  const [stats, setStats]         = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 50 });
  const [loading, setLoading]     = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus]   = useState("");
  const [bulking, setBulking]         = useState(false);
  const [tagInput, setTagInput]       = useState(tagFilter);

  const loadLeads = useCallback(
    async (page = 1) => {
      const params = new URLSearchParams();
      if (jobId)        params.set("jobId",  jobId);
      if (statusFilter) params.set("status", statusFilter);
      if (sortFilter)   params.set("sort",   sortFilter);
      if (tagFilter)    params.set("tag",    tagFilter);
      params.set("page",  String(page));
      params.set("limit", "50");
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setPagination({ total: data.total, page: data.page, limit: data.limit });
      }
      setLoading(false);
    },
    [jobId, statusFilter, sortFilter, tagFilter]
  );

  const fetchLeads = useCallback(
    async (page = 1) => {
      setLoading(true);
      await loadLeads(page);
    },
    [loadLeads]
  );

  const fetchStats = useCallback(async () => {
    const params = new URLSearchParams();
    if (jobId) params.set("jobId", jobId);
    const res = await fetch(`/api/leads/stats?${params}`);
    if (res.ok) setStats(await res.json());
  }, [jobId]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setSelectedIds(new Set());
      void loadLeads(1);
      void fetchStats();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadLeads, fetchStats]);

  // Poll while a job is running
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const job = await res.json();
        void loadLeads(1);
        void fetchStats();
        if (job.status === "COMPLETED" || job.status === "FAILED") clearInterval(interval);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [jobId, loadLeads, fetchStats]);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    setLoading(true);
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v); else params.delete(k);
    }
    router.push(`/?${params}`);
  }

  async function applyBulk() {
    if (!selectedIds.size || !bulkStatus) return;
    setBulking(true);
    await fetch("/api/leads/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selectedIds], status: bulkStatus }),
    });
    setBulkStatus("");
    setSelectedIds(new Set());
    await Promise.all([fetchLeads(pagination.page), fetchStats()]);
    setBulking(false);
  }

  function applyTagFilter() {
    updateParams({ tag: tagInput.trim(), page: "" });
  }

  const exportParams = new URLSearchParams();
  if (jobId)        exportParams.set("jobId",  jobId);
  if (statusFilter) exportParams.set("status", statusFilter);
  if (tagFilter)    exportParams.set("tag",    tagFilter);

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{pagination.total} Einträge</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/api/export/csv?${exportParams}`}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            CSV
          </a>
          <a href={`/api/export/xlsx?${exportParams}`}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            XLSX
          </a>
          <a href="/search"
            className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors">
            + Neue Suche
          </a>
        </div>
      </div>

      {/* ── Job status ──────────────────────────────────────────── */}
      {jobId && <JobStatus jobId={jobId} />}

      {/* ── KPI strip ───────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_KPI.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => updateParams({ status: statusFilter === key ? "" : key, page: "" })}
              className={`rounded-xl border px-4 py-3 text-left transition-all ${
                statusFilter === key
                  ? "border-blue-300 ring-1 ring-blue-300"
                  : "border-gray-200 hover:border-gray-300"
              } bg-white`}
            >
              <div className={`text-xl font-bold ${color.split(" ")[0]}`}>
                {stats.byStatus[key] ?? 0}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── Filters + Sort ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        {/* Status chips */}
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(STATUS_LABELS).map(([s, label]) => (
            <button key={s} onClick={() => updateParams({ status: s, page: "" })}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400">Sortierung:</span>
          <select
            value={sortFilter}
            onChange={(e) => updateParams({ sort: e.target.value, page: "" })}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tag filter */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Tag filtern…"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && applyTagFilter()}
          className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 w-40 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button onClick={applyTagFilter}
          className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50">
          Suchen
        </button>
        {tagFilter && (
          <button onClick={() => { setTagInput(""); updateParams({ tag: "", page: "" }); }}
            className="text-xs text-gray-400 hover:text-gray-700">
            × Tag löschen
          </button>
        )}
      </div>

      {/* ── Bulk action bar ─────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} ausgewählt
          </span>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="text-xs border border-blue-300 rounded-lg px-2 py-1 bg-white focus:outline-none"
          >
            <option value="">Status wählen…</option>
            {STATUS_BULK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={applyBulk}
            disabled={!bulkStatus || bulking}
            className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50"
          >
            {bulking ? "Wird gesetzt…" : "Anwenden"}
          </button>
          <button onClick={() => setSelectedIds(new Set())}
            className="text-xs text-blue-500 hover:text-blue-700 ml-auto">
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      <LeadsTable
        leads={leads}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onLeadUpdated={() => { void fetchLeads(pagination.page); void fetchStats(); }}
      />

      {/* ── Pagination ──────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => void fetchLeads(i + 1)}
              className={`w-8 h-8 text-sm rounded border ${
                pagination.page === i + 1
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 hover:bg-gray-50"
              }`}>
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
