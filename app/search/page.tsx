"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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

const SOURCE_HINTS: Record<Source, string> = {
  overpass:
    "Stabiler Startpfad fuer lokale Demos. Nutzt OpenStreetMap-Daten ohne API-Key.",
  gelbeseiten:
    "Fokussiert auf deutsche Branchenverzeichnisse. Externe HTML-Struktur kann sich aendern.",
  both: "Kombiniert beide Quellen und dedupliziert Treffer fuer breitere Suchlaeufe.",
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
  const [metaWarning, setMetaWarning] = useState<string | null>(null);

  const loadMeta = useCallback(async (signal?: AbortSignal) => {
    const [projectsRes, meRes] = await Promise.all([
      fetch("/api/projects", { signal }),
      fetch("/api/me", { signal }),
    ]);

    const warnings: string[] = [];

    if (projectsRes.ok) {
      const data = await projectsRes.json();
      setProjects(Array.isArray(data) ? data : []);
    } else {
      setProjects([]);
      warnings.push("Projektliste konnte nicht geladen werden.");
    }

    if (meRes.ok) {
      setUsage(await meRes.json());
    } else {
      setUsage(null);
      warnings.push("Plan- und Limitdaten sind gerade nicht verfuegbar.");
    }

    setMetaWarning(
      warnings.length
        ? `${warnings.join(" ")} Die Suche bleibt trotzdem nutzbar.`
        : null
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadMeta(controller.signal).catch(() => {
      setProjects([]);
      setUsage(null);
      setMetaWarning(
        "Projektliste und Plan-Daten konnten nicht geladen werden. Die Suche bleibt trotzdem nutzbar."
      );
    });

    return () => controller.abort();
  }, [loadMeta]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const safeRadius = Number.isFinite(form.radius)
        ? Math.min(100, Math.max(1, form.radius))
        : 5;
      const payload = {
        ...form,
        radius: safeRadius,
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

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === form.projectId) ?? null,
    [form.projectId, projects]
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
          Suchlauf
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Neue Lead-Suche</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Sammle oeffentlich auffindbare Unternehmensdaten nach Branche und Ort
          und lege den Suchlauf direkt in einem Projekt ab.
        </p>
      </div>

      {metaWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{metaWarning}</span>
            <button
              type="button"
              onClick={() => {
                void loadMeta();
              }}
              className="text-sm font-medium text-amber-900 hover:text-amber-950"
            >
              Erneut laden
            </button>
          </div>
        </div>
      )}

      {usage && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">Aktiver Plan: {usage.plan}</span>
            <span>
              Jobs diesen Monat: {usage.usage.jobsThisMonth}/
              {formatLimit(usage.usage.jobLimit)}
            </span>
          </div>
          <p className="mt-1 text-blue-800">
            Verbleibende Jobs: {formatLimit(usage.usage.jobsRemaining)}. Leads pro
            Job: {usage.usage.leadsPerJob}.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {selectedProject ? (
            <>
              Zielprojekt: <span className="font-medium text-slate-900">{selectedProject.name}</span>
            </>
          ) : projects.length > 0 ? (
            "Kein Projekt vorausgewaehlt. Du kannst die Leads direkt einem Projekt zuordnen."
          ) : (
            "Noch kein Projekt vorhanden. Du kannst trotzdem suchen oder zuerst ein Projekt anlegen."
          )}
        </div>

        {projects.length > 0 && (
          <div>
            <label
              htmlFor="search-project"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Projekt
            </label>
            <select
              id="search-project"
              value={form.projectId}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  projectId: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="search-query"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Branche / Stichwort
            </label>
            <input
              id="search-query"
              type="text"
              required
              placeholder="z. B. Restaurant, Zahnarzt, Kfz-Werkstatt"
              value={form.query}
              onChange={(e) =>
                setForm((current) => ({ ...current, query: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="search-location"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Ort
            </label>
            <input
              id="search-location"
              type="text"
              required
              placeholder="z. B. Berlin, Muenchen, Hamburg"
              value={form.location}
              onChange={(e) =>
                setForm((current) => ({ ...current, location: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
          <div>
            <label
              htmlFor="search-radius"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Radius (km)
            </label>
            <input
              id="search-radius"
              type="number"
              min={1}
              max={100}
              value={form.radius}
              onChange={(e) => {
                const nextRadius = parseInt(e.target.value, 10);
                setForm((current) => ({
                  ...current,
                  radius: Number.isNaN(nextRadius)
                    ? current.radius
                    : Math.min(100, Math.max(1, nextRadius)),
                }));
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="search-source"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Quelle
            </label>
            <select
              id="search-source"
              value={form.source}
              onChange={(e) =>
                setForm((current) => ({
                  ...current,
                  source: e.target.value as Source,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overpass">OpenStreetMap (kostenlos, ToS-konform)</option>
              <option value="gelbeseiten">Gelbe Seiten (DE)</option>
              <option value="both">Beide Quellen kombinieren</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">{SOURCE_HINTS[form.source]}</p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Nach dem Start gelangst du direkt in den Suchlauf und siehst eingehende Leads live.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Suchlauf wird vorbereitet..." : "Suche starten"}
          </button>
        </div>
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
