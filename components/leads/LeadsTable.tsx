"use client";

import { useState } from "react";
import Link from "next/link";
import { getConfidenceTier } from "@/lib/parser/normalize";
import { formatSourceName } from "@/lib/sourceLabels";

type Lead = {
  id: string;
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  category: string | null;
  sourceName: string | null;
  status: string;
  confidence: number | null;
  notes: string | null;
  sourceUrl: string | null;
  tags: string[];
  followUpAt: string | null;
  createdAt: string;
};

type EmptyState = {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "Neu" },
  { value: "CONTACTED", label: "Kontaktiert" },
  { value: "INTERESTED", label: "Interessiert" },
  { value: "NOT_INTERESTED", label: "Kein Interesse" },
  { value: "CONVERTED", label: "Gewonnen" },
  { value: "INVALID", label: "Ungueltig" },
];

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  INTERESTED: "bg-amber-100 text-amber-700",
  NOT_INTERESTED: "bg-red-100 text-red-700",
  CONVERTED: "bg-emerald-100 text-emerald-700",
  INVALID: "bg-gray-100 text-gray-400",
};

const TIER_BADGE: Record<string, string> = {
  HIGH: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-red-100 text-red-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function getFollowUpBadge(followUpAt: string | null) {
  if (!followUpAt) return null;

  const date = new Date(followUpAt);
  const now = new Date();
  const isDue = date.getTime() <= now.getTime();

  return {
    label: `${isDue ? "Faellig" : "Follow-up"}: ${formatDate(followUpAt)}`,
    className: isDue
      ? "border-orange-200 bg-orange-100 text-orange-700"
      : "border-violet-200 bg-violet-100 text-violet-700",
  };
}

function getQuickActions(lead: Lead) {
  const actions: Array<{ label: string; href: string }> = [];

  if (lead.email) actions.push({ label: "E-Mail", href: `mailto:${lead.email}` });
  if (lead.phone) actions.push({ label: "Anrufen", href: `tel:${lead.phone}` });
  if (lead.website) actions.push({ label: "Website", href: lead.website });
  if (lead.sourceUrl) actions.push({ label: "Quelle", href: lead.sourceUrl });

  return actions;
}

const DEFAULT_EMPTY_STATE: EmptyState = {
  title: "Keine Leads im aktuellen Kontext",
  description: "Starte eine neue Suche oder lockere die gesetzten Filter.",
  actionHref: "/search",
  actionLabel: "+ Neue Suche",
};

export default function LeadsTable({
  leads,
  loading,
  selectedIds = new Set(),
  onSelectionChange,
  onLeadUpdated,
  emptyState = DEFAULT_EMPTY_STATE,
}: {
  leads: Lead[];
  loading: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onLeadUpdated: () => void;
  emptyState?: EmptyState;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchLead(id: string, patch: Record<string, unknown>) {
    setBusyLeadId(id);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Lead konnte nicht aktualisiert werden");
      }

      onLeadUpdated();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Lead konnte nicht aktualisiert werden"
      );
      return false;
    } finally {
      setBusyLeadId((current) => (current === id ? null : current));
    }
  }

  async function saveNote(id: string) {
    const saved = await patchLead(id, { notes: noteDraft });
    if (saved) {
      setEditing(null);
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange?.(next);
  }

  function toggleAll() {
    if (selectedIds.size === leads.length) {
      onSelectionChange?.(new Set());
      return;
    }

    onSelectionChange?.(new Set(leads.map((lead) => lead.id)));
  }

  if (loading && leads.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="hidden sm:block">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        </div>
        <div className="space-y-2 sm:hidden">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && leads.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{emptyState.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{emptyState.description}</p>
        <a
          href={emptyState.actionHref}
          className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {emptyState.actionLabel}
        </a>
      </div>
    );
  }

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="w-8 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="cursor-pointer rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Firma</th>
                <th className="px-4 py-3 text-left font-medium">Kontakt</th>
                <th className="px-4 py-3 text-left font-medium">Ort / Quelle</th>
                <th className="px-4 py-3 text-left font-medium">Qualitaet</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Notiz</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const tier = getConfidenceTier(lead.confidence);
                const isSelected = selectedIds.has(lead.id);
                const followUpBadge = getFollowUpBadge(lead.followUpAt);
                const quickActions = getQuickActions(lead);
                const isBusy = busyLeadId === lead.id;
                const sourceLabel = formatSourceName(lead.sourceName);

                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-3 py-3 align-top text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="cursor-pointer rounded border-gray-300"
                      />
                    </td>
                    <td className="max-w-[260px] px-4 py-3 align-top">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-blue-600"
                      >
                        {lead.companyName}
                      </Link>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 block truncate text-xs text-blue-500 hover:underline"
                        >
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      {lead.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lead.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {followUpBadge && (
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${followUpBadge.className}`}
                          >
                            {followUpBadge.label}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="max-w-[230px] px-4 py-3 align-top">
                      <div className="space-y-1">
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="block truncate text-xs text-slate-700 hover:underline"
                          >
                            {lead.email}
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="block text-xs text-slate-500 hover:underline"
                          >
                            {lead.phone}
                          </a>
                        )}
                        {!lead.email && !lead.phone && (
                          <span className="text-xs text-slate-400">
                            Keine direkte Kontaktmoeglichkeit
                          </span>
                        )}
                      </div>
                      {quickActions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {quickActions.map((action) => (
                            <a
                              key={`${lead.id}-${action.label}`}
                              href={action.href}
                              target={
                                action.href.startsWith("mailto:") ||
                                action.href.startsWith("tel:")
                                  ? undefined
                                  : "_blank"
                              }
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                            >
                              {action.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[180px] px-4 py-3 align-top">
                      <div className="truncate text-xs text-slate-700">
                        {lead.city ?? "-"}
                      </div>
                      {lead.category && (
                        <div className="truncate text-xs text-slate-400">
                          {lead.category}
                        </div>
                      )}
                      {sourceLabel && (
                        <div className="mt-1 truncate text-xs text-slate-400">
                          Quelle: {sourceLabel}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-slate-300">
                        Gefunden: {formatDate(lead.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TIER_BADGE[tier]}`}
                      >
                        {tier}
                      </span>
                      {lead.confidence !== null && (
                        <div className="mt-1 text-xs text-slate-400">
                          {Math.round(lead.confidence * 100)}%
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <select
                        value={lead.status}
                        disabled={isBusy}
                        onChange={async (event) => {
                          await patchLead(lead.id, { status: event.target.value });
                        }}
                        className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium ${
                          STATUS_COLOR[lead.status] ?? "bg-gray-100 text-gray-700"
                        } disabled:opacity-60`}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="max-w-[220px] px-4 py-3 align-top">
                      {editing === lead.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            autoFocus
                            value={noteDraft}
                            onChange={(event) => setNoteDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") void saveNote(lead.id);
                              if (event.key === "Escape") setEditing(null);
                            }}
                            className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                            placeholder="Notiz..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => void saveNote(lead.id)}
                              className="text-xs text-emerald-700 hover:underline"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-xs text-slate-400 hover:underline"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditing(lead.id);
                            setNoteDraft(lead.notes ?? "");
                          }}
                          className="block max-w-full truncate text-left text-xs text-slate-500 hover:text-slate-700"
                          title={lead.notes ?? "Notiz hinzufuegen"}
                        >
                          {lead.notes ? lead.notes : <span className="text-slate-300">+ Notiz</span>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 sm:hidden">
          {leads.map((lead) => {
            const tier = getConfidenceTier(lead.confidence);
            const isSelected = selectedIds.has(lead.id);
            const followUpBadge = getFollowUpBadge(lead.followUpAt);
            const quickActions = getQuickActions(lead);
            const isBusy = busyLeadId === lead.id;
            const sourceLabel = formatSourceName(lead.sourceName);

            return (
              <div key={lead.id} className={`space-y-3 p-4 ${isSelected ? "bg-blue-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      className="mt-1 shrink-0 rounded border-gray-300"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block truncate font-medium text-slate-900 hover:text-blue-600"
                      >
                        {lead.companyName}
                      </Link>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {lead.city ?? "-"}
                        {lead.category ? ` | ${lead.category}` : ""}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${TIER_BADGE[tier]}`}
                  >
                    {tier}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pl-6">
                  <select
                    value={lead.status}
                    disabled={isBusy}
                    onChange={async (event) => {
                      await patchLead(lead.id, { status: event.target.value });
                    }}
                    className={`rounded-full border-0 px-2 py-1 text-xs font-medium ${
                      STATUS_COLOR[lead.status] ?? "bg-gray-100 text-gray-700"
                    } disabled:opacity-60`}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {followUpBadge && (
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${followUpBadge.className}`}
                    >
                      {followUpBadge.label}
                    </span>
                  )}
                </div>

                <div className="space-y-1 pl-6 text-xs text-slate-500">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="block text-blue-600">
                      {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="block truncate text-blue-600">
                      {lead.email}
                    </a>
                  )}
                  {!lead.phone && !lead.email && (
                    <div className="text-slate-400">Keine direkte Kontaktmoeglichkeit</div>
                  )}
                  {sourceLabel && <div>Quelle: {sourceLabel}</div>}
                  {lead.notes && <div className="italic text-slate-400">{lead.notes}</div>}
                </div>

                {quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-6">
                    {quickActions.map((action) => (
                      <a
                        key={`${lead.id}-${action.label}-mobile`}
                        href={action.href}
                        target={
                          action.href.startsWith("mailto:") ||
                          action.href.startsWith("tel:")
                            ? undefined
                            : "_blank"
                        }
                        rel="noopener noreferrer"
                        className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600"
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                )}

                {lead.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pl-6">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
