"use client";

import { useState } from "react";

type Lead = {
  id: string;
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  category: string | null;
  status: string;
  confidence: number | null;
  notes: string | null;
  sourceUrl: string | null;
  createdAt: string;
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "Neu" },
  { value: "CONTACTED", label: "Kontaktiert" },
  { value: "INTERESTED", label: "Interessiert" },
  { value: "NOT_INTERESTED", label: "Kein Interesse" },
  { value: "CONVERTED", label: "Gewonnen" },
  { value: "INVALID", label: "Ungültig" },
];

const STATUS_COLOR: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-700",
  CONTACTED: "bg-blue-100 text-blue-700",
  INTERESTED: "bg-yellow-100 text-yellow-700",
  NOT_INTERESTED: "bg-red-100 text-red-700",
  CONVERTED: "bg-green-100 text-green-700",
  INVALID: "bg-gray-100 text-gray-400",
};

function confidenceBar(v: number | null) {
  if (v === null) return null;
  const pct = Math.round(v * 100);
  const color = v >= 0.7 ? "bg-green-500" : v >= 0.4 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1">
      <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{pct}%</span>
    </div>
  );
}

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
  onLeadUpdated,
}: {
  leads: Lead[];
  loading: boolean;
  onLeadUpdated: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
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

  if (loading && leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        Lade Leads…
      </div>
    );
  }

  if (!loading && leads.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        Keine Leads gefunden. Starte eine neue Suche.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Desktop table */}
      <div className="overflow-x-auto hidden sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Firma</th>
              <th className="text-left px-4 py-3 font-medium">Kontakt</th>
              <th className="text-left px-4 py-3 font-medium">Ort / Branche</th>
              <th className="text-left px-4 py-3 font-medium">Confidence</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Notiz</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 max-w-[200px]">
                  <div className="font-medium text-gray-900 truncate">{lead.companyName}</div>
                  {lead.website && (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block max-w-[180px]"
                    >
                      {lead.website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                  {lead.sourceUrl && (
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Quelle ↗
                    </a>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="text-xs text-gray-700 hover:underline block truncate">
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="text-xs text-gray-500 block">
                      {lead.phone}
                    </a>
                  )}
                  {!lead.email && !lead.phone && (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 max-w-[160px]">
                  <div className="text-xs text-gray-600 truncate">{lead.city ?? "—"}</div>
                  {lead.category && (
                    <div className="text-xs text-gray-400 truncate">{lead.category}</div>
                  )}
                </td>
                <td className="px-4 py-3">{confidenceBar(lead.confidence)}</td>
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
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 max-w-[160px]">
                  {editing === lead.id ? (
                    <div className="flex flex-col gap-1">
                      <input
                        autoFocus
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1 text-xs w-full"
                        placeholder="Notiz…"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => saveNote(lead.id)}
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
                      className="text-xs text-gray-400 hover:text-gray-700 text-left truncate block max-w-full"
                    >
                      {lead.notes ?? "+ Notiz"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden divide-y divide-gray-100">
        {leads.map((lead) => (
          <div key={lead.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-gray-900">{lead.companyName}</div>
              <select
                value={lead.status}
                onChange={async (e) => {
                  await updateLeadStatus(lead.id, e.target.value);
                  onLeadUpdated();
                }}
                className={`text-xs rounded-full px-2 py-1 border-0 font-medium shrink-0 ${
                  STATUS_COLOR[lead.status] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-500 space-y-0.5">
              {lead.city && <div>{lead.city}{lead.category ? ` · ${lead.category}` : ""}</div>}
              {lead.phone && <a href={`tel:${lead.phone}`} className="block text-blue-600">{lead.phone}</a>}
              {lead.email && <a href={`mailto:${lead.email}`} className="block text-blue-600">{lead.email}</a>}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="block text-blue-500 truncate">
                  {lead.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
            {lead.confidence !== null && confidenceBar(lead.confidence)}
          </div>
        ))}
      </div>
    </div>
  );
}
