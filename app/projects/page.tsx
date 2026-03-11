"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { jobs: number; lists: number };
};

type UsageSummary = {
  activeProjects: number;
  projectLimit: number | null;
  projectSlotsRemaining: number | null;
};

function formatLimit(limit: number | null) {
  return limit === null ? "unbegrenzt" : String(limit);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageNotice, setUsageNotice] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const [projectsRes, meRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/me"),
    ]);

    if (!projectsRes.ok) {
      const data = await projectsRes.json().catch(() => null);
      throw new Error(data?.error ?? "Projekte konnten nicht geladen werden");
    }

    setProjects(await projectsRes.json());

    if (meRes.ok) {
      const me = await meRes.json();
      setUsage(me.usage);
      return null;
    }

    setUsage(null);
    return "Plan- und Limitdaten konnten nicht geladen werden. Die Projektliste bleibt nutzbar.";
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsageNotice(await loadProjects());
    } catch (err) {
      setProjects([]);
      setUsage(null);
      setUsageNotice(null);
      setError(
        err instanceof Error ? err.message : "Projekte konnten nicht geladen werden"
      );
    } finally {
      setLoading(false);
    }
  }, [loadProjects]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setError(null);
    setCreating(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Projekt konnte nicht erstellt werden");
      }

      setNewName("");
      setShowForm(false);
      await fetchProjects();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Projekt konnte nicht erstellt werden"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Projekte</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Bilde Suchlaeufe, Lead-Listen und Exporte in klar getrennten Vertriebsprojekten ab.
            </p>
          </div>
          <button
            onClick={() => setShowForm((value) => !value)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            + Neues Projekt
          </button>
        </div>
      </div>

      {usage && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Aktiv</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {usage.activeProjects}
            </div>
            <p className="mt-1 text-sm text-slate-500">laufende Projekte</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Limit</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatLimit(usage.projectLimit)}
            </div>
            <p className="mt-1 text-sm text-slate-500">Projekte im Plan</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Frei</div>
            <div className="mt-2 text-2xl font-bold text-blue-700">
              {formatLimit(usage.projectSlotsRemaining)}
            </div>
            <p className="mt-1 text-sm text-slate-500">verbleibende Slots</p>
          </div>
        </div>
      )}

      {usageNotice && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {usageNotice}
        </div>
      )}

      {error && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            onClick={() => void fetchProjects()}
            className="text-sm font-medium text-red-700 hover:text-red-900"
          >
            Erneut laden
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={createProject}
          className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"
        >
          <input
            aria-label="Projektname"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Projektname..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {creating ? "Projekt wird erstellt..." : "Erstellen"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-2 text-sm text-gray-500"
          >
            Abbrechen
          </button>
        </form>
      )}

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Noch keine Projekte</h2>
          <p className="mt-2 text-sm text-slate-500">
            Lege ein Projekt an, um Suchlaeufe, Listen und Exporte sauber zu strukturieren.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Erstes Projekt anlegen
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-blue-300"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">
                      {project.name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      erstellt {formatDate(project.createdAt)}
                    </span>
                  </div>
                  {project.description ? (
                    <p className="mt-1 text-sm text-slate-500">{project.description}</p>
                  ) : (
                    <p className="mt-1 text-sm text-slate-400">
                      Noch keine Beschreibung hinterlegt.
                    </p>
                  )}
                </div>

                <div className="flex gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                    {project._count.jobs} Jobs
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    {project._count.lists} Listen
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
