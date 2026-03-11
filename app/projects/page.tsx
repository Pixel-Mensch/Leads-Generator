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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
    setLoading(false);
  }, []);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    await loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadProjects();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadProjects]);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    setShowForm(false);
    setCreating(false);
    await fetchProjects();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Projekte</h1>
          <p className="text-sm text-gray-500">{projects.length} Projekte</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Neues Projekt
        </button>
      </div>

      {showForm && (
        <form onSubmit={createProject} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Projektname…"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-60"
          >
            {creating ? "…" : "Erstellen"}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-sm text-gray-400 px-2">
            Abbrechen
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Lade…</div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
          Noch keine Projekte. Erstelle dein erstes Projekt.
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="block bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{p.name}</span>
                <span className="text-xs text-gray-400">
                  {p._count.jobs} Jobs · {p._count.lists} Listen
                </span>
              </div>
              {p.description && (
                <p className="text-xs text-gray-500 mt-1">{p.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
