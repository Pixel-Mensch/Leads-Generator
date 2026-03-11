"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getConfidenceTier } from "@/lib/parser/normalize";

type Lead = {
  id: string;
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  sourceName: string | null;
  status: string;
  confidence: number | null;
  notes: string | null;
  sourceUrl: string | null;
  tags: string[];
  contactedAt: string | null;
  followUpAt: string | null;
  createdAt: string;
  job: { query: string; location: string; source: string } | null;
};

const STATUS_OPTIONS = [
  { value: "NEW",            label: "Neu",           color: "bg-gray-100 text-gray-700" },
  { value: "CONTACTED",      label: "Kontaktiert",   color: "bg-blue-100 text-blue-700" },
  { value: "INTERESTED",     label: "Interessiert",  color: "bg-amber-100 text-amber-700" },
  { value: "NOT_INTERESTED", label: "Kein Interesse",color: "bg-red-100 text-red-700" },
  { value: "CONVERTED",      label: "Gewonnen",      color: "bg-emerald-100 text-emerald-700" },
  { value: "INVALID",        label: "Ungültig",      color: "bg-gray-100 text-gray-400" },
];

const TIER_COLOR: Record<string, string> = {
  HIGH:   "text-emerald-700 bg-emerald-100",
  MEDIUM: "text-amber-700 bg-amber-100",
  LOW:    "text-red-600 bg-red-100",
};

export default function LeadDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [lead, setLead]         = useState<Lead | null>(null);
  const [notes, setNotes]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef             = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((data: Lead) => {
        setLead(data);
        setNotes(data.notes ?? "");
      });
  }, [id]);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const updated = await res.json();
      setLead(updated);
    }
    setSaving(false);
  }

  function addTag() {
    const tag = tagInput.trim().replace(/,/g, "");
    if (!tag || !lead) return;
    if (lead.tags.includes(tag)) { setTagInput(""); return; }
    setTagInput("");
    save({ tags: [...lead.tags, tag] });
  }

  function removeTag(tag: string) {
    if (!lead) return;
    save({ tags: lead.tags.filter((t) => t !== tag) });
  }

  if (!lead) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-gray-400 animate-pulse">
        Lade Lead...
      </div>
    );
  }

  const tier = getConfidenceTier(lead.confidence);
  const currentStatus = STATUS_OPTIONS.find((o) => o.value === lead.status);

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => router.back()} className="hover:text-gray-700">
          &larr; Zurück
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate">{lead.companyName}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{lead.companyName}</h1>
            {lead.city && (
              <p className="text-sm text-gray-500 mt-0.5">
                {lead.city}{lead.category ? ` · ${lead.category}` : ""}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${TIER_COLOR[tier]}`}>
                {tier === "HIGH" ? "Hohe Qualität" : tier === "MEDIUM" ? "Mittlere Qualität" : "Niedrige Qualität"}
              </span>
              {lead.confidence !== null && (
                <span className="text-xs text-gray-400">Score: {Math.round(lead.confidence * 100)}%</span>
              )}
              {lead.sourceName && (
                <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                  {lead.sourceName}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">Status</label>
            <select
              value={lead.status}
              onChange={(e) => save({ status: e.target.value })}
              className={`text-sm rounded-full px-3 py-1.5 border-0 font-medium cursor-pointer ${
                currentStatus?.color ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Kontaktdaten */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kontakt</h2>
          <dl className="space-y-2.5 text-sm">
            {lead.phone && (
              <div>
                <dt className="text-xs text-gray-400">Telefon</dt>
                <dd><a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a></dd>
              </div>
            )}
            {lead.email && (
              <div>
                <dt className="text-xs text-gray-400">E-Mail</dt>
                <dd><a href={`mailto:${lead.email}`} className="text-blue-600 hover:underline break-all">{lead.email}</a></dd>
              </div>
            )}
            {lead.website && (
              <div>
                <dt className="text-xs text-gray-400">Website</dt>
                <dd>
                  <a href={lead.website} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all">
                    {lead.website.replace(/^https?:\/\//, "")}
                  </a>
                </dd>
              </div>
            )}
            {lead.address && (
              <div>
                <dt className="text-xs text-gray-400">Adresse</dt>
                <dd className="text-gray-800">{lead.address}</dd>
              </div>
            )}
            {lead.sourceUrl && (
              <div>
                <dt className="text-xs text-gray-400">Quellseite</dt>
                <dd>
                  <a href={lead.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:underline text-xs break-all">{lead.sourceUrl}</a>
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Vertrieb */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Vertrieb</h2>

          {/* Follow-up */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Follow-up Datum</label>
            <input
              type="date"
              defaultValue={lead.followUpAt ? lead.followUpAt.slice(0, 10) : ""}
              onBlur={(e) => {
                const val = e.target.value;
                save({ followUpAt: val ? new Date(val + "T08:00:00.000Z").toISOString() : null });
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[1.75rem]">
              {lead.tags.map((t) => (
                <span key={t}
                  className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                  {t}
                  <button onClick={() => removeTag(t)}
                    className="text-blue-400 hover:text-blue-700 leading-none font-bold">x</button>
                </span>
              ))}
              {lead.tags.length === 0 && (
                <span className="text-xs text-gray-300">Noch keine Tags</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
                }}
                placeholder="Tag eingeben..."
                maxLength={50}
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={addTag}
                className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium">
                + Tag
              </button>
            </div>
            <p className="text-xs text-gray-300 mt-1">Enter oder Komma zum Hinzufügen</p>
          </div>

          {/* Meta */}
          <dl className="space-y-1.5 text-sm pt-2 border-t border-gray-100">
            {lead.job && (
              <div>
                <dt className="text-xs text-gray-400">Suche</dt>
                <dd className="text-gray-700 text-xs">{lead.job.query} in {lead.job.location}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-400">Gefunden am</dt>
              <dd className="text-gray-700 text-xs">{new Date(lead.createdAt).toLocaleDateString("de")}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Notizen */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notizen</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={2000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Gesprächsnotizen, Ansprechpartner, nächste Schritte..."
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">{notes.length}/2000</span>
          <button
            onClick={() => save({ notes })}
            disabled={saving || notes === (lead.notes ?? "")}
            className="bg-blue-600 text-white text-sm rounded-lg px-4 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-opacity"
          >
            {saving ? "Speichern..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
