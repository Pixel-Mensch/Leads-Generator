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
  { value: "NEW",            label: "Neu" },
  { value: "CONTACTED",      label: "Kontaktiert" },
  { value: "INTERESTED",     label: "Interessiert" },
  { value: "NOT_INTERESTED", label: "Kein Interesse" },
  { value: "CONVERTED",      label: "Gewonnen" },
  { value: "INVALID",        label: "Ungültig" },
];

const STATUS_COLOR: Record<string, string> = {
  NEW:             "bg-gray-100 text-gray-700",
  CONTACTED:       "bg-blue-100 text-blue-700",
  INTERESTED:      "bg-amber-100 text-amber-700",
  NOT_INTERESTED:  "bg-red-100 text-red-700",
  CONVERTED:       "bg-emerald-100 text-emerald-700",
  INVALID:         "bg-gray-100 text-gray-400",
};

const TIER_BADGE: Record<string, string> = {
  HIGH:   "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW:    "bg-red-100 text-red-600",
};

async function updateLeadStatus(id: string, status: string) {
  await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
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
  const [editing, setEditing]     = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  async function saveNote(id: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: noteDraft }),
    });
    setEditing(null);
    onLeadUpdated();
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange?.(next);
  }

  function toggleAll() {
    if (selectedIds.size === leads.length) {
      onSelectionChange?.(new Set());
    } else {
      onSelectionChange?.(new Set(leads.map((l) => l.id)));
    }
  }

  if (loading && leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
        <div className="animate-pulse">Lade Leads...</div>
      </div>
    );
  }

  if (!loading && leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-2">
        <div className="text-2xl">📋</div>
        <div className="text-sm font-medium text-gray-600">Keine Leads gefunden</div>
        <div className="text-xs text-gray-400">Starte eine neue Suche oder ändere die Filter</div>
        <a href="/search"
          className="inline-block mt-2 bg-blue-600 text-white text-sm rounded-lg px-4 py-1.5 hover:bg-blue-700">
          + Neue Suche
        </a>
      </div>
    );
  }

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Desktop table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide bg-gray-50">
              <th className="px-3 py-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="rounded border-gray-300 cursor-pointer" />
              </th>
              <th className="text-left px-4 py-3 font-medium">Firma</th>
              <th className="text-left px-4 py-3 font-medium">Kontakt</th>
              <th className="text-left px-4 py-3 font-medium">Ort / Branche</th>
              <th className="text-left px-4 py-3 font-medium">Qualität</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Notiz</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const tier = getConfidenceTier(lead.confidence);
              const isSelected = selectedIds.has(lead.id);
              const followUpDate = lead.followUpAt
                ? new Date(lead.followUpAt).toLocaleDateString("de")
                : null;
              return (
                <tr key={lead.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isSelected ? "bg-blue-50" : ""}`}>
                  <td className="px-3 py-3 text-center">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)}
                      className="rounded border-gray-300 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <Link href={`/leads/${lead.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600 truncate block max-w-[200px]">
                      {lead.companyName}
                    </Link>
                    {lead.website && (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline truncate block max-w-[200px]">
                        {lead.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {lead.tags.map((t) => (
                          <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{t}</span>
                        ))}
                      </div>
                    )}
                    {followUpDate && (
                      <div className="text-xs text-orange-500 mt-0.5">Folgetermin: {followUpDate}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {lead.email && (
                      <a href={`mailto:${lead.email}`}
                        className="text-xs text-gray-700 hover:underline block truncate">{lead.email}</a>
                    )}
                    {lead.phone && (
                      <a href={`tel:${lead.phone}`}
                        className="text-xs text-gray-500 block">{lead.phone}</a>
                    )}
                    {!lead.email && !lead.phone && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <div className="text-xs text-gray-700 truncate">{lead.city ?? "—"}</div>
                    {lead.category && (
                      <div className="text-xs text-gray-400 truncate">{lead.category}</div>
                    )}
                    {lead.sourceName && (
                      <div className="text-xs text-gray-300 truncate">{lead.sourceName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${TIER_BADGE[tier]}`}>
                      {tier}
                    </span>
                    {lead.confidence !== null && (
                      <div className="text-xs text-gray-300 mt-0.5">
                        {Math.round(lead.confidence * 100)}%
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={lead.status}
                      onChange={async (e) => {
                        await updateLeadStatus(lead.id, e.target.value);
                        onLeadUpdated();
                      }}
                      className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${
                        STATUS_COLOR[lead.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    {editing === lead.id ? (
                      <div className="flex flex-col gap-1">
                        <input autoFocus value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveNote(lead.id);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                          placeholder="Notiz..." />
                        <div className="flex gap-1">
                          <button onClick={() => saveNote(lead.id)}
                            className="text-xs text-green-700 hover:underline">Speichern</button>
                          <button onClick={() => setEditing(null)}
                            className="text-xs text-gray-400 hover:underline">Abbrechen</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditing(lead.id); setNoteDraft(lead.notes ?? ""); }}
                        className="text-xs text-gray-400 hover:text-gray-700 text-left truncate block max-w-full"
                        title={lead.notes ?? "Notiz hinzufügen"}
                      >
                        {lead.notes ? lead.notes : <span className="text-gray-300">+ Notiz</span>}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-100">
        {leads.map((lead) => {
          const tier = getConfidenceTier(lead.confidence);
          const isSelected = selectedIds.has(lead.id);
          return (
            <div key={lead.id}
              className={`p-4 space-y-2 ${isSelected ? "bg-blue-50" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(lead.id)}
                    className="mt-0.5 rounded border-gray-300 shrink-0" />
                  <Link href={`/leads/${lead.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 truncate">
                    {lead.companyName}
                  </Link>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 ${TIER_BADGE[tier]}`}>
                    {tier}
                  </span>
                  <select
                    value={lead.status}
                    onChange={async (e) => {
                      await updateLeadStatus(lead.id, e.target.value);
                      onLeadUpdated();
                    }}
                    className={`text-xs rounded-full px-2 py-1 border-0 font-medium ${
                      STATUS_COLOR[lead.status] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-0.5 pl-6">
                {lead.city && (
                  <div>{lead.city}{lead.category ? ` · ${lead.category}` : ""}</div>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="block text-blue-600">{lead.phone}</a>
                )}
                {lead.email && (
                  <a href={`mailto:${lead.email}`} className="block text-blue-600 truncate">{lead.email}</a>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer"
                    className="block text-blue-500 truncate">
                    {lead.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {lead.notes && (
                  <div className="text-gray-400 italic truncate">{lead.notes}</div>
                )}
              </div>

              {lead.tags && lead.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap pl-6">
                  {lead.tags.map((t) => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{t}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
