"use client";

import { useEffect, useState } from "react";

type Job = {
  id: string;
  query: string;
  location: string;
  status: string;
  totalFound: number;
  error: string | null;
  _count: { leads: number };
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-yellow-700 bg-yellow-50 border-yellow-200",
  RUNNING: "text-blue-700 bg-blue-50 border-blue-200",
  COMPLETED: "text-green-700 bg-green-50 border-green-200",
  FAILED: "text-red-700 bg-red-50 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Wartend",
  RUNNING: "Läuft…",
  COMPLETED: "Abgeschlossen",
  FAILED: "Fehlgeschlagen",
};

export default function JobStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetch_() {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok && mounted) setJob(await res.json());
    }
    fetch_();
    return () => { mounted = false; };
  }, [jobId]);

  if (!job) return null;

  const colorClass = STATUS_COLOR[job.status] ?? "text-gray-700 bg-gray-50 border-gray-200";

  return (
    <div className={`border rounded-lg px-4 py-3 mb-4 text-sm ${colorClass}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="font-medium">{job.query}</span>
          <span className="mx-1 text-current/60">in</span>
          <span className="font-medium">{job.location}</span>
        </div>
        <span className="font-medium">{STATUS_LABEL[job.status] ?? job.status}</span>
      </div>
      {job.status === "RUNNING" && (
        <p className="mt-1 text-xs">Scraping läuft — Seite aktualisiert sich automatisch…</p>
      )}
      {job.status === "COMPLETED" && (
        <p className="mt-1 text-xs">{job.totalFound} Treffer gefunden, {job._count.leads} Leads gespeichert.</p>
      )}
      {job.status === "FAILED" && job.error && (
        <p className="mt-1 text-xs">Fehler: {job.error}</p>
      )}
    </div>
  );
}
