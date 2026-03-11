"use client";

import { useEffect, useState } from "react";
import { formatSourceToken } from "@/lib/sourceLabels";

type Job = {
  id: string;
  query: string;
  location: string;
  source: string;
  status: string;
  totalFound: number;
  error: string | null;
  _count: { leads: number };
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  RUNNING: "border-blue-200 bg-blue-50 text-blue-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Wartend",
  RUNNING: "Laeuft",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen",
};

export default function JobStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadJob() {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok || cancelled) return;

      const nextJob = (await res.json()) as Job;
      if (cancelled) return;

      setJob(nextJob);

      if (
        intervalId &&
        (nextJob.status === "COMPLETED" || nextJob.status === "FAILED")
      ) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    void loadJob();
    intervalId = setInterval(() => {
      void loadJob();
    }, 4000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId]);

  if (!job) return null;

  const colorClass =
    STATUS_COLOR[job.status] ?? "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border px-4 py-4 text-sm shadow-sm ${colorClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              {job.query} in {job.location}
            </span>
            <span className="rounded-full border border-current/15 bg-white/60 px-2 py-0.5 text-xs">
              {formatSourceToken(job.source) ?? job.source}
            </span>
          </div>
          {job.status === "RUNNING" && (
            <p className="mt-1 text-xs text-current/80">
              Der Suchlauf verarbeitet gerade Treffer. Neue Leads erscheinen automatisch im Dashboard.
            </p>
          )}
          {job.status === "PENDING" && (
            <p className="mt-1 text-xs text-current/80">
              Der Job ist angelegt und wartet auf die Ausfuehrung.
            </p>
          )}
          {job.status === "COMPLETED" && (
            <p className="mt-1 text-xs text-current/80">
              {job.totalFound} Treffer gefunden, {job._count.leads} Leads gespeichert.
            </p>
          )}
          {job.status === "FAILED" && job.error && (
            <p className="mt-1 text-xs text-current/80">Fehler: {job.error}</p>
          )}
        </div>
        <span className="rounded-full border border-current/15 bg-white/60 px-3 py-1 text-xs font-semibold">
          {STATUS_LABEL[job.status] ?? job.status}
        </span>
      </div>
    </div>
  );
}
