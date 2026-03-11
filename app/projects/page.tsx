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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const [projectsRes, meRes] = await Promise.all([
      fetch("/api/projects"),
      fetch("/api/me"),
    ]);

    if (projectsRes.ok) {
      setProjects(await projectsRes.json());
    }

    if (meRes.ok) {
      const me = await meRes.json();
      setUsage(me.usage);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      await loadProjects();
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
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projekte</h1>
          <p className="text-sm text-gray-500">
            {projects.length} aktive Projekte
            {usage && (
              <>
                {" "}
                · Limit {formatLimit(usage.projectLimit)} · frei{" "}
                {formatLimit(usage.projectSlotsRemaining)}
              </>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Neues Projekt
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={createProject}
          className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-2"
        >
          <input
            aria-label="Projektname"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Projektname..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60"
          >
            {creating ? "..." : "Erstellen"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-sm text-gray-400 px-2"
          >
            Abbrechen
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Lade...</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          Noch keine Projekte. Erstelle dein erstes Projekt.
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{project.name}</span>
                <span className="text-xs text-gray-400">
                  {project._count.jobs} Jobs · {project._count.lists} Listen
                </span>
              </div>
              {project.description && (
                <p className="text-xs text-gray-500 mt-1">
                  {project.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
