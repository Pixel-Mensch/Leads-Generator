"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Source = "overpass" | "gelbeseiten" | "both";
type Project = { id: string; name: string };
type UsageSummary = {
  plan: string;
  usage: {
    jobsThisMonth: number;
    jobLimit: number | null;
    jobsRemaining: number | null;
    leadsPerJob: number;
  };
};

function formatLimit(limit: number | null) {
  return limit === null ? "unbegrenzt" : String(limit);
}

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedProject = searchParams.get("projectId") ?? "";

  const [form, setForm] = useState({
    query: "",
    location: "",
    radius: 5,
    source: "overpass" as Source,
    projectId: preselectedProject,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [projectsRes, meRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/me"),
        ]);

        if (!cancelled && projectsRes.ok) {
          const data = await projectsRes.json();
          if (Array.isArray(data)) {
            setProjects(data);
          }
        }

        if (!cancelled && meRes.ok) {
          setUsage(await meRes.json());
        }
      } catch {
        // The search form stays usable even when the usage panel cannot load.
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        ...form,
        projectId: form.projectId || undefined,
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Fehler beim Erstellen des Jobs");
      }
      const job = await res.json();

      const runRes = await fetch(`/api/jobs/${job.id}/run`, {
        method: "POST",
      });
      if (!runRes.ok) {
        const data = await runRes.json().catch(() => null);
        throw new Error(
          data?.error
            ? `Job angelegt, aber Start fehlgeschlagen: ${data.error}`
            : "Job angelegt, aber Start fehlgeschlagen"
        );
      }

      router.push(`/?jobId=${job.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Neue Suche</h1>
      <p className="text-sm text-gray-500 mb-6">
        Oeffentlich auffindbare Unternehmensdaten nach Branche und Ort sammeln.
      </p>

      {usage && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Plan: {usage.plan}</span>
            <span>
              Jobs diesen Monat: {usage.usage.jobsThisMonth}/
              {formatLimit(usage.usage.jobLimit)}
            </span>
          </div>
          <p className="mt-1 text-blue-800">
            Verbleibende Jobs: {formatLimit(usage.usage.jobsRemaining)}. Leads
            pro Job: {usage.usage.leadsPerJob}.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        {projects.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projekt
            </label>
            <select
              value={form.projectId}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  projectId: e.target.value,
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kein Projekt</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branche / Stichwort
          </label>
          <input
            type="text"
            required
            placeholder="z. B. Restaurant, Zahnarzt, Kfz-Werkstatt"
            value={form.query}
            onChange={(e) =>
              setForm((current) => ({ ...current, query: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ort
          </label>
          <input
            type="text"
            required
            placeholder="z. B. Berlin, Muenchen, Hamburg"
            value={form.location}
            onChange={(e) =>
              setForm((current) => ({ ...current, location: e.target.value }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Radius (km)
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.radius}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                radius: parseInt(e.target.value, 10),
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quelle
          </label>
          <select
            value={form.source}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                source: e.target.value as Source,
              }))
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="overpass">OpenStreetMap (kostenlos, ToS-konform)</option>
            <option value="gelbeseiten">Gelbe Seiten (DE)</option>
            <option value="both">Beide Quellen kombinieren</option>
          </select>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium rounded-lg py-2 text-sm transition-colors"
        >
          {loading ? "Suche wird gestartet..." : "Suche starten"}
        </button>
      </form>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchForm />
    </Suspense>
  );
}
