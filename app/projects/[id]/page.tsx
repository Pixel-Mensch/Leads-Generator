"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Job = { id: string; query: string; location: string; status: string; createdAt: string; _count: { leads: number } };
type List = { id: string; name: string; createdAt: string; _count: { leads: number } };
type Project = { id: string; name: string; description: string | null; jobs: Job[]; lists: List[] };

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [showListForm, setShowListForm] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((r) => r.json())
      .then(setProject);
  }, [id]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setCreatingList(true);
    await fetch(`/api/projects/${id}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName.trim() }),
    });
    setNewListName("");
    setShowListForm(false);
    setCreatingList(false);
    fetch(`/api/projects/${id}`).then((r) => r.json()).then(setProject);
  }

  async function deleteProject() {
    if (!confirm("Projekt wirklich löschen?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  }

  if (!project) return <div className="text-sm text-gray-400 py-8 text-center">Lade…</div>;

  const STATUS_COLOR: Record<string, string> = {
    COMPLETED: "text-green-600", RUNNING: "text-blue-600",
    FAILED: "text-red-600", PENDING: "text-yellow-600",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/projects" className="text-sm text-gray-400 hover:text-gray-600">← Projekte</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{project.name}</h1>
          {project.description && <p className="text-sm text-gray-500">{project.description}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/search?projectId=${id}`}
            className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Neue Suche
          </Link>
          <button onClick={deleteProject} className="text-xs text-red-400 hover:text-red-600">
            Löschen
          </button>
        </div>
      </div>

      {/* Jobs */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Suchjobs ({project.jobs.length})
        </h2>
        {project.jobs.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Jobs. Starte eine neue Suche.</p>
        ) : (
          <div className="space-y-1.5">
            {project.jobs.map((job) => (
              <Link
                key={job.id}
                href={`/?jobId=${job.id}`}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-2.5 hover:border-blue-300 transition-colors text-sm"
              >
                <div>
                  <span className="font-medium">{job.query}</span>
                  <span className="text-gray-400 mx-1">in</span>
                  <span className="text-gray-600">{job.location}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{job._count.leads} Leads</span>
                  <span className={STATUS_COLOR[job.status] ?? "text-gray-500"}>{job.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Lead Lists */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Lead-Listen ({project.lists.length})
          </h2>
          <button
            onClick={() => setShowListForm((v) => !v)}
            className="text-xs text-blue-600 hover:underline"
          >
            + Liste erstellen
          </button>
        </div>

        {showListForm && (
          <form onSubmit={createList} className="flex gap-2 mb-3">
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Listenname…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" disabled={creatingList} className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-60">
              {creatingList ? "…" : "Erstellen"}
            </button>
          </form>
        )}

        {project.lists.length === 0 ? (
          <p className="text-sm text-gray-400">Noch keine Listen.</p>
        ) : (
          <div className="space-y-1.5">
            {project.lists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-gray-800">{list.name}</span>
                <span className="text-xs text-gray-400">{list._count.leads} Leads</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
