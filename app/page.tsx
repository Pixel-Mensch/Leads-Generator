"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

type Stats = {
  byStatus: Record<string, number>;
  total: number;
  followUpDue: number;
  followUpScheduled: number;
};

type Pagination = { total: number; page: number; limit: number };

const PAGE_SIZE = 50;

const STATUS_LABELS: Record<string, string> = {
  "": "Alle",
  NEW: "Neu",
  CONTACTED: "Kontaktiert",
  INTERESTED: "Interessiert",
  NOT_INTERESTED: "Kein Interesse",
  CONVERTED: "Gewonnen",
  INVALID: "Ungueltig",
};

const STATUS_KPI = [
  { key: "NEW", label: "Neu", color: "text-slate-700" },
  { key: "CONTACTED", label: "Kontaktiert", color: "text-blue-700" },
  { key: "INTERESTED", label: "Interessiert", color: "text-amber-700" },
  { key: "CONVERTED", label: "Gewonnen", color: "text-emerald-700" },
];

const FOLLOW_UP_OPTIONS = [
  { value: "", label: "Alle Follow-ups" },
  { value: "due", label: "Faellig" },
  { value: "scheduled", label: "Geplant" },
  { value: "none", label: "Ohne Follow-up" },
];

const SORT_OPTIONS = [
  { value: "confidence", label: "Qualitaet" },
  { value: "createdAt", label: "Datum" },
  { value: "companyName", label: "Firma A-Z" },
  { value: "city", label: "Ort A-Z" },
  { value: "followUpAt", label: "Follow-up" },
];

const STATUS_BULK_OPTIONS = [
  { value: "CONTACTED", label: "-> Kontaktiert" },
  { value: "INTERESTED", label: "-> Interessiert" },
  { value: "NOT_INTERESTED", label: "-> Kein Interesse" },
  { value: "CONVERTED", label: "-> Gewonnen" },
  { value: "INVALID", label: "-> Ungueltig" },
];

function Dashboard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const jobId = searchParams.get("jobId") ?? undefined;
  const statusFilter = searchParams.get("status") ?? "";
  const sortFilter = searchParams.get("sort") ?? "confidence";
  const tagFilter = searchParams.get("tag") ?? "";
  const queryFilter = searchParams.get("q") ?? "";
  const followUpFilter = searchParams.get("followUp") ?? "";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: PAGE_SIZE,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulking, setBulking] = useState(false);
  const [tagInput, setTagInput] = useState(tagFilter);
  const [queryInput, setQueryInput] = useState(queryFilter);

  useEffect(() => {
    setTagInput(tagFilter);
  }, [tagFilter]);

  useEffect(() => {
    setQueryInput(queryFilter);
  }, [queryFilter]);

  const buildParams = useCallback(
    (page = 1, includeStatus = true) => {
      const params = new URLSearchParams();

      if (jobId) params.set("jobId", jobId);
      if (includeStatus && statusFilter) params.set("status", statusFilter);
      if (sortFilter) params.set("sort", sortFilter);
      if (tagFilter) params.set("tag", tagFilter);
      if (queryFilter) params.set("q", queryFilter);
      if (followUpFilter) params.set("followUp", followUpFilter);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      return params;
    },
    [followUpFilter, jobId, queryFilter, sortFilter, statusFilter, tagFilter]
  );

  const fetchDashboard = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);

      try {
        const [leadsRes, statsRes] = await Promise.all([
          fetch(`/api/leads?${buildParams(page, true)}`),
          fetch(`/api/leads/stats?${buildParams(1, false)}`),
        ]);

        if (!leadsRes.ok) {
          const data = await leadsRes.json().catch(() => null);
          throw new Error(data?.error ?? "Leads konnten nicht geladen werden");
        }

        if (!statsRes.ok) {
          const data = await statsRes.json().catch(() => null);
          throw new Error(data?.error ?? "KPI-Daten konnten nicht geladen werden");
        }

        const leadsData = await leadsRes.json();
        const statsData = await statsRes.json();

        setLeads(leadsData.leads);
        setPagination({
          total: leadsData.total,
          page: leadsData.page,
          limit: leadsData.limit,
        });
        setStats(statsData);
      } catch (err) {
        setLeads([]);
        setStats(null);
        setPagination({ total: 0, page, limit: PAGE_SIZE });
        setError(
          err instanceof Error ? err.message : "Dashboard konnte nicht geladen werden"
        );
      } finally {
        setLoading(false);
      }
    },
    [buildParams]
  );

  useEffect(() => {
    setSelectedIds(new Set());
    void fetchDashboard(1);
  }, [fetchDashboard]);

  useEffect(() => {
    if (!jobId) return;

    const intervalId = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;

      const job = await res.json();
      await fetchDashboard(1);

      if (job.status === "COMPLETED" || job.status === "FAILED") {
        clearInterval(intervalId);
      }
    }, 4000);

    return () => clearInterval(intervalId);
  }, [fetchDashboard, jobId]);

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const next = params.toString();
    router.push(next ? `/?${next}` : "/");
  }

  async function applyBulk() {
    if (!selectedIds.size || !bulkStatus) return;

    setBulking(true);
    setError(null);

    try {
      const res = await fetch("/api/leads/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], status: bulkStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Bulk-Update fehlgeschlagen");
      }

      setBulkStatus("");
      setSelectedIds(new Set());
      await fetchDashboard(pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk-Update fehlgeschlagen");
    } finally {
      setBulking(false);
    }
  }

  function applyTagFilter() {
    updateParams({ tag: tagInput.trim(), page: "" });
  }

  function applySearchFilter() {
    updateParams({ q: queryInput.trim(), page: "" });
  }

  function clearFilters() {
    setTagInput("");
    setQueryInput("");
    updateParams({
      status: "",
      tag: "",
      q: "",
      followUp: "",
      page: "",
    });
  }

  function changePage(nextPage: number) {
    setSelectedIds(new Set());
    void fetchDashboard(nextPage);
  }

  const exportParams = useMemo(() => {
    const params = new URLSearchParams();

    if (jobId) params.set("jobId", jobId);
    if (statusFilter) params.set("status", statusFilter);
    if (tagFilter) params.set("tag", tagFilter);
    if (queryFilter) params.set("q", queryFilter);
    if (followUpFilter) params.set("followUp", followUpFilter);

    return params;
  }, [followUpFilter, jobId, queryFilter, statusFilter, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.limit));
  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(pagination.page * pagination.limit, pagination.total);
  const activeFilterCount = [
    statusFilter,
    tagFilter,
    queryFilter,
    followUpFilter,
  ].filter(Boolean).length;
  const exportQuery = exportParams.toString();
  const canExport = pagination.total > 0 && !loading;

  const emptyState = useMemo(() => {
    if (jobId) {
      return {
        title: "Noch keine Leads im Suchlauf",
        description:
          "Der aktive Suchlauf liefert noch keine Treffer oder der gewaehlte Filter ist zu eng.",
        actionHref: "/search",
        actionLabel: "+ Neue Suche",
      };
    }

    if (activeFilterCount > 0) {
      return {
        title: "Keine Leads fuer die aktuellen Filter",
        description:
          "Passe Status, Follow-up, Tag oder Volltextsuche an, um wieder Treffer zu sehen.",
        actionHref: "/",
        actionLabel: "Filter pruefen",
      };
    }

    return {
      title: "Noch keine Leads vorhanden",
      description:
        "Starte deinen ersten Suchlauf, damit hier neue Firmen, Kontakte und Exportdaten erscheinen.",
      actionHref: "/search",
      actionLabel: "+ Neue Suche",
    };
  }, [activeFilterCount, jobId]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Lead Dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {jobId
                ? "Verfolge den aktuellen Suchlauf, pruefe neue Treffer und bearbeite Status oder Follow-ups direkt im Kontext."
                : "Behalte deine offenen Leads, Follow-ups und Exportkontexte in einem kompakten Vertriebs-Workspace im Blick."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={canExport ? (exportQuery ? `/api/export/csv?${exportQuery}` : "/api/export/csv") : undefined}
              aria-disabled={!canExport}
              tabIndex={canExport ? undefined : -1}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                canExport
                  ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-200 text-slate-300"
              }`}
            >
              CSV
            </a>
            <a
              href={
                canExport
                  ? exportQuery
                    ? `/api/export/xlsx?${exportQuery}`
                    : "/api/export/xlsx"
                  : undefined
              }
              aria-disabled={!canExport}
              tabIndex={canExport ? undefined : -1}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                canExport
                  ? "border-slate-300 text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed border-slate-200 text-slate-300"
              }`}
            >
              XLSX
            </a>
            <a
              href="/search"
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              + Neue Suche
            </a>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1">
            {pagination.total} Eintraege sichtbar
          </span>
          {jobId && (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
              Kontext: aktueller Suchlauf
            </span>
          )}
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
              {activeFilterCount} Filter aktiv
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-1">
            {canExport
              ? "Exporte uebernehmen den aktiven Filterkontext"
              : "Exporte werden aktiv, sobald Leads sichtbar sind"}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              onClick={() => void fetchDashboard(pagination.page)}
              className="text-sm font-medium text-red-700 hover:text-red-900"
            >
              Erneut laden
            </button>
          </div>
        </div>
      )}

      {jobId && <JobStatus jobId={jobId} />}

      {stats && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
          {STATUS_KPI.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => updateParams({ status: statusFilter === key ? "" : key, page: "" })}
              className={`rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition-colors ${
                statusFilter === key
                  ? "border-blue-300 ring-1 ring-blue-300"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`text-xl font-bold ${color}`}>{stats.byStatus[key] ?? 0}</div>
              <div className="mt-0.5 text-xs text-slate-500">{label}</div>
            </button>
          ))}

          <button
            onClick={() => updateParams({ followUp: followUpFilter === "due" ? "" : "due", page: "" })}
            className={`rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition-colors ${
              followUpFilter === "due"
                ? "border-orange-300 ring-1 ring-orange-300"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="text-xl font-bold text-orange-600">{stats.followUpDue}</div>
            <div className="mt-0.5 text-xs text-slate-500">Faellig</div>
          </button>

          <button
            onClick={() =>
              updateParams({
                followUp: followUpFilter === "scheduled" ? "" : "scheduled",
                page: "",
              })
            }
            className={`rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition-colors ${
              followUpFilter === "scheduled"
                ? "border-violet-300 ring-1 ring-violet-300"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="text-xl font-bold text-violet-600">
              {stats.followUpScheduled}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Geplant</div>
          </button>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Firma, Ort, Notiz oder Quelle durchsuchen"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearchFilter();
              }}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={applySearchFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Suchen
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tag filtern"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyTagFilter();
              }}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={applyTagFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              Tag filtern
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(STATUS_LABELS).map(([status, label]) => (
              <button
                key={status || "all"}
                onClick={() => updateParams({ status, page: "" })}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  statusFilter === status
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FOLLOW_UP_OPTIONS.map((option) => (
              <button
                key={option.value || "all-follow-up"}
                onClick={() => updateParams({ followUp: option.value, page: "" })}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  followUpFilter === option.value
                    ? "border-orange-300 bg-orange-100 text-orange-700"
                    : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 xl:ml-auto">
            <span className="text-xs text-slate-400">Sortierung</span>
            <select
              value={sortFilter}
              onChange={(event) => updateParams({ sort: event.target.value, page: "" })}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Filter zuruecksetzen
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-1">
            Gesamt: {stats?.total ?? pagination.total}
          </span>
          {queryFilter && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              Suche: {queryFilter}
            </span>
          )}
          {tagFilter && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              Tag: {tagFilter}
            </span>
          )}
          {followUpFilter && (
            <span className="rounded-full bg-slate-100 px-2 py-1">
              Follow-up:{" "}
              {FOLLOW_UP_OPTIONS.find((option) => option.value === followUpFilter)?.label}
            </span>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm sm:flex-row sm:items-center">
          <span className="text-sm font-medium text-blue-700">
            {selectedIds.size} Leads ausgewaehlt
          </span>
          <select
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value)}
            className="rounded-lg border border-blue-300 bg-white px-2 py-1.5 text-xs focus:outline-none"
          >
            <option value="">Status waehlen</option>
            {STATUS_BULK_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => void applyBulk()}
            disabled={!bulkStatus || bulking}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {bulking ? "Wird gesetzt..." : "Anwenden"}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-blue-500 hover:text-blue-700 sm:ml-auto"
          >
            Auswahl aufheben
          </button>
        </div>
      )}

      <LeadsTable
        leads={leads}
        loading={loading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onLeadUpdated={() => {
          void fetchDashboard(pagination.page);
        }}
        emptyState={emptyState}
      />

      {pagination.total > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="text-slate-500">
            Zeige {rangeStart}-{rangeEnd} von {pagination.total} Leads
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Zurueck
            </button>
            <span className="text-slate-500">
              Seite {pagination.page} / {totalPages}
            </span>
            <button
              onClick={() => changePage(pagination.page + 1)}
              disabled={pagination.page >= totalPages || loading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Weiter
            </button>
          </div>
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
