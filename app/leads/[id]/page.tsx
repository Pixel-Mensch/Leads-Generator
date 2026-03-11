"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Lead = {
  id: string;
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  status: string;
  confidence: number | null;
  notes: string | null;
  sourceUrl: string | null;
  contactedAt: string | null;
  createdAt: string;
  job: { query: string; location: string; source: string } | null;
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "Neu" },
  { value: "CONTACTED", label: "Kontaktiert" },
  { value: "INTERESTED", label: "Interessiert" },
  { value: "NOT_INTERESTED", label: "Kein Interesse" },
  { value: "CONVERTED", label: "Gewonnen" },
  { value: "INVALID", label: "Ungültig" },
];

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setLead(data);
        setNotes(data.notes ?? "");
      });
  }, [id]);

  async function save(patch: object) {
    setSaving(true);
    const res = await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setLead(await res.json());
    setSaving(false);
  }

  if (!lead) return <div className="text-sm text-gray-400 py-8 text-center">Lade…</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">
        ← Zurück
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-gray-900">{lead.companyName}</h1>
          <select
            value={lead.status}
            onChange={(e) => save({ status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { label: "Ort", value: lead.city },
            { label: "Branche", value: lead.category },
            { label: "Adresse", value: lead.address },
            { label: "Telefon", value: lead.phone, href: `tel:${lead.phone}` },
            { label: "E-Mail", value: lead.email, href: `mailto:${lead.email}` },
            { label: "Website", value: lead.website, href: lead.website ?? undefined },
            { label: "Quelle", value: lead.sourceUrl, href: lead.sourceUrl ?? undefined },
            {
              label: "Confidence",
              value: lead.confidence !== null ? `${Math.round(lead.confidence * 100)}%` : null,
            },
            {
              label: "Suchjob",
              value: lead.job ? `${lead.job.query} in ${lead.job.location}` : null,
            },
            { label: "Gefunden am", value: new Date(lead.createdAt).toLocaleDateString("de") },
          ]
            .filter((r) => r.value)
            .map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">{row.label}</dt>
                <dd className="text-gray-800 mt-0.5">
                  {row.href ? (
                    <a href={row.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                      {row.value}
                    </a>
                  ) : (
                    row.value
                  )}
                </dd>
              </div>
            ))}
        </dl>

        <div>
          <label className="block text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
            Notizen
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Gesprächsnotizen, Ansprechpartner, …"
          />
          <button
            onClick={() => save({ notes })}
            disabled={saving}
            className="mt-2 bg-blue-600 text-white text-sm rounded-lg px-4 py-1.5 hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
