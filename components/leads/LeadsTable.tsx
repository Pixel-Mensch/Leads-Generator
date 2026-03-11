"use client";

import { useState } from "react";
import Link from "next/link";
import { getConfidenceTier } from "@/lib/parser/normalize";

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
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : "bg-violet-100 text-violet-700 border-violet-200",
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

export default function LeadsTable({
  leads,
  loading,
  selectedIds = new Set(),
  onSelectionChange,
  onLeadUpdated,
}: {
  leads: Lead[];
  loading: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onLeadUpdated: () => void;
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
    } else {
      onSelectionChange?.(new Set(leads.map((lead) => lead.id)));
    }
  }

  if (loading && leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <div className="animate-pulse text-sm text-gray-400">
          Leads werden geladen...
        </div>
      </div>
    );
  }

  if (!loading && leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-3">
        <div className="text-sm font-medium text-gray-700">
          Keine Leads im aktuellen Kontext
        </div>
        <div className="text-xs text-gray-400">
          Starte eine neue Suche oder lockere die gesetzten Filter.
        </div>
        <a
          href="/search"
          className="inline-block bg-blue-600 text-white text-sm rounded-lg px-4 py-1.5 hover:bg-blue-700"
        >
          + Neue Suche
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 font-medium">Firma</th>
                <th className="text-left px-4 py-3 font-medium">Kontakt</th>
                <th className="text-left px-4 py-3 font-medium">Ort / Quelle</th>
                <th className="text-left px-4 py-3 font-medium">Qualitaet</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Notiz</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const tier = getConfidenceTier(lead.confidence);
                const isSelected = selectedIds.has(lead.id);
                const followUpBadge = getFollowUpBadge(lead.followUpAt);
                const quickActions = getQuickActions(lead);
                const isBusy = busyLeadId === lead.id;

                return (
                  <tr
                    key={lead.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-center align-top">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 max-w-[260px] align-top">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 truncate block"
                      >
                        {lead.companyName}
                      </Link>
                      {lead.website && (
                        <a
                          href={lead.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block mt-0.5"
                        >
                          {lead.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      {lead.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-2">
                          {lead.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5"
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
                    <td className="px-4 py-3 max-w-[230px] align-top">
                      <div className="space-y-1">
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-xs text-gray-700 hover:underline block truncate"
                          >
                            {lead.email}
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-xs text-gray-500 block hover:underline"
                          >
                            {lead.phone}
                          </a>
                        )}
                        {!lead.email && !lead.phone && (
                          <span className="text-xs text-gray-400">
                            Keine direkte Kontaktmoeglichkeit
                          </span>
                        )}
                      </div>
                      {quickActions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {quickActions.map((action) => (
                            <a
                              key={`${lead.id}-${action.label}`}
                              href={action.href}
                              target={
                                action.href.startsWith("mailto:")
                                  || action.href.startsWith("tel:")
                                  ? undefined
                                  : "_blank"
                              }
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                            >
                              {action.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] align-top">
                      <div className="text-xs text-gray-700 truncate">
                        {lead.city ?? "-"}
                      </div>
                      {lead.category && (
                        <div className="text-xs text-gray-400 truncate">
                          {lead.category}
                        </div>
                      )}
                      {lead.sourceName && (
                        <div className="text-xs text-gray-300 truncate mt-1">
                          Quelle: {lead.sourceName}
                        </div>
                      )}
                      <div className="text-xs text-gray-300 mt-1">
                        Gefunden: {formatDate(lead.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`text-xs font-semibold rounded-full px-2 py-0.5 ${TIER_BADGE[tier]}`}
                      >
                        {tier}
                      </span>
                      {lead.confidence !== null && (
                        <div className="text-xs text-gray-400 mt-1">
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
                        className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${
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
                    <td className="px-4 py-3 max-w-[220px] align-top">
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
                            className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                            placeholder="Notiz..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => void saveNote(lead.id)}
                              className="text-xs text-green-700 hover:underline"
                            >
                              Speichern
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="text-xs text-gray-400 hover:underline"
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
                          className="text-xs text-left text-gray-500 hover:text-gray-700 truncate block max-w-full"
                          title={lead.notes ?? "Notiz hinzufuegen"}
                        >
                          {lead.notes ? (
                            lead.notes
                          ) : (
                            <span className="text-gray-300">+ Notiz</span>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="sm:hidden divide-y divide-gray-100">
          {leads.map((lead) => {
            const tier = getConfidenceTier(lead.confidence);
            const isSelected = selectedIds.has(lead.id);
            const followUpBadge = getFollowUpBadge(lead.followUpAt);
            const quickActions = getQuickActions(lead);
            const isBusy = busyLeadId === lead.id;

            return (
              <div key={lead.id} className={`p-4 space-y-3 ${isSelected ? "bg-blue-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(lead.id)}
                      className="mt-1 rounded border-gray-300 shrink-0"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 block truncate"
                      >
                        {lead.companyName}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {lead.city ?? "-"}
                        {lead.category ? ` · ${lead.category}` : ""}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${TIER_BADGE[tier]}`}
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
                    className={`text-xs rounded-full px-2 py-1 border-0 font-medium ${
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

                <div className="space-y-1 text-xs text-gray-500 pl-6">
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="block text-blue-600">
                      {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="block text-blue-600 truncate"
                    >
                      {lead.email}
                    </a>
                  )}
                  {!lead.phone && !lead.email && (
                    <div className="text-gray-400">Keine direkte Kontaktmoeglichkeit</div>
                  )}
                  {lead.sourceName && <div>Quelle: {lead.sourceName}</div>}
                  {lead.notes && <div className="text-gray-400 italic">{lead.notes}</div>}
                </div>

                {quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pl-6">
                    {quickActions.map((action) => (
                      <a
                        key={`${lead.id}-${action.label}-mobile`}
                        href={action.href}
                        target={
                          action.href.startsWith("mailto:")
                            || action.href.startsWith("tel:")
                            ? undefined
                            : "_blank"
                        }
                        rel="noopener noreferrer"
                        className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600"
                      >
                        {action.label}
                      </a>
                    ))}
                  </div>
                )}

                {lead.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap pl-6">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5"
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
