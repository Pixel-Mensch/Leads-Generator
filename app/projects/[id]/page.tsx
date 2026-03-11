"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Job = {
  id: string;
  query: string;
  location: string;
  status: string;
  createdAt: string;
  _count: { leads: number };
};

type List = {
  id: string;
  name: string;
  createdAt: string;
  _count: { leads: number };
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  jobs: Job[];
  lists: List[];
};

type UsageSummary = {
  listLimit: number | null;
  listSlotsRemaining: number | null;
};

function formatLimit(limit: number | null) {
  return limit === null ? "unbegrenzt" : String(limit);
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [showListForm, setShowListForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [projectRes, meRes] = await Promise.all([
          fetch(`/api/projects/${id}`),
          fetch("/api/me"),
        ]);

        if (!cancelled && projectRes.ok) {
          setProject(await projectRes.json());
        } else if (!cancelled) {
          setError("Projekt konnte nicht geladen werden");
        }

        if (!cancelled && meRes.ok) {
          const me = await meRes.json();
          setUsage(me.usage);
        }
      } catch {
        if (!cancelled) {
          setError("Projekt konnte nicht geladen werden");
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function createList(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;

    setError(null);
    setCreatingList(true);

    try {
      const res = await fetch(`/api/projects/${id}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Liste konnte nicht erstellt werden");
      }

      setNewListName("");
      setShowListForm(false);

      const [projectRes, meRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch("/api/me"),
      ]);

      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      if (meRes.ok) {
        const me = await meRes.json();
        setUsage(me.usage);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Liste konnte nicht erstellt werden"
      );
    } finally {
      setCreatingList(false);
    }
  }

  async function deleteProject() {
    if (!confirm("Projekt wirklich loeschen?")) return;

    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Projekt konnte nicht geloescht werden");
      return;
    }

    router.push("/projects");
  }

  if (!project) {
    return (
      <div className="py-8 text-center">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : (
          <div className="text-sm text-gray-400">Lade...</div>
        )}
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    COMPLETED: "text-green-600",
    RUNNING: "text-blue-600",
    FAILED: "text-red-600",
    PENDING: "text-yellow-600",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/projects"
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {"<-"} Projekte
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-gray-500">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/search?projectId=${id}`}
            className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Neue Suche
          </Link>
          <button
            onClick={deleteProject}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Loeschen
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
          Suchjobs ({project.jobs.length})
        </h2>
        {project.jobs.length === 0 ? (
          <p className="text-sm text-gray-400">
            Noch keine Jobs. Starte eine neue Suche.
          </p>
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
                  <span className={statusColor[job.status] ?? "text-gray-500"}>
                    {job.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Lead-Listen ({project.lists.length})
          </h2>
          <div className="flex items-center gap-3">
            {usage && (
              <span className="text-xs text-gray-400">
                Limit {formatLimit(usage.listLimit)} · frei{" "}
                {formatLimit(usage.listSlotsRemaining)}
              </span>
            )}
            <button
              onClick={() => setShowListForm((value) => !value)}
              className="text-xs text-blue-600 hover:underline"
            >
              + Liste erstellen
            </button>
          </div>
        </div>

        {showListForm && (
          <form onSubmit={createList} className="flex gap-2 mb-3">
            <input
              aria-label="Listenname"
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Listenname..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creatingList}
              className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm disabled:opacity-60"
            >
              {creatingList ? "..." : "Erstellen"}
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
                <span className="text-xs text-gray-400">
                  {list._count.leads} Leads
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
