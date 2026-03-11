"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

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

const STATUS_LABEL: Record<string, string> = {
  COMPLETED: "Abgeschlossen",
  RUNNING: "Laeuft",
  FAILED: "Fehlgeschlagen",
  PENDING: "Wartend",
};

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  RUNNING: "bg-blue-100 text-blue-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
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

  async function reloadProjectData() {
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
  }

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
      await reloadProjectData();
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
      <div className="mx-auto max-w-4xl space-y-4">
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : (
          <>
            <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm" />
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-700">
              {"<-"} Projekte
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{project.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              {project.description ??
                "Dieses Projekt sammelt Suchlaeufe, Lead-Listen und Exporte in einem gemeinsamen Kontext."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/search?projectId=${id}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              + Neue Suche
            </Link>
            <button
              onClick={deleteProject}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Loeschen
            </button>
          </div>
        </div>
      </div>

      {usage && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Suchjobs</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{project.jobs.length}</div>
            <p className="mt-1 text-sm text-slate-500">im Projekt</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Listen</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{project.lists.length}</div>
            <p className="mt-1 text-sm text-slate-500">
              Limit {formatLimit(usage.listLimit)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Freie Slots</div>
            <div className="mt-2 text-2xl font-bold text-blue-700">
              {formatLimit(usage.listSlotsRemaining)}
            </div>
            <p className="mt-1 text-sm text-slate-500">weitere Lead-Listen</p>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Suchjobs
              </h2>
              <p className="text-sm text-slate-500">
                Alle Suchlaeufe, die diesem Projekt zugeordnet sind.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {project.jobs.length}
            </span>
          </div>

          {project.jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Noch keine Jobs. Starte eine neue Suche, um Leads in diesem Projekt zu sammeln.
            </div>
          ) : (
            <div className="space-y-2">
              {project.jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/?jobId=${job.id}`}
                  className="block rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-blue-300"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium text-slate-900">
                        {job.query} in {job.location}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Gestartet am {formatDate(job.createdAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                        {job._count.leads} Leads
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 font-medium ${
                          STATUS_COLOR[job.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Lead-Listen
              </h2>
              <p className="text-sm text-slate-500">
                Kuratierte Teilmengen fuer Export oder Follow-up.
              </p>
            </div>
            <button
              onClick={() => setShowListForm((value) => !value)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              + Liste erstellen
            </button>
          </div>

          {showListForm && (
            <form onSubmit={createList} className="space-y-2 rounded-xl bg-slate-50 p-3">
              <input
                aria-label="Listenname"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Listenname..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingList}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                >
                  {creatingList ? "Liste wird erstellt..." : "Erstellen"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowListForm(false)}
                  className="text-sm text-slate-500"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          )}

          {project.lists.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              Noch keine Listen. Lege eine Liste an, um Leads fuer Demo, Export oder Follow-up zu sammeln.
            </div>
          ) : (
            <div className="space-y-2">
              {project.lists.map((list) => (
                <div
                  key={list.id}
                  className="rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900">{list.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Erstellt am {formatDate(list.createdAt)}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {list._count.leads} Leads
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
