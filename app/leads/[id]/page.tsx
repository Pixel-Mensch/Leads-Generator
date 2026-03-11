"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  job: { id: string; query: string; location: string; source: string } | null;
};

const STATUS_OPTIONS = [
  { value: "NEW", label: "Neu", color: "bg-gray-100 text-gray-700" },
  { value: "CONTACTED", label: "Kontaktiert", color: "bg-blue-100 text-blue-700" },
  { value: "INTERESTED", label: "Interessiert", color: "bg-amber-100 text-amber-700" },
  {
    value: "NOT_INTERESTED",
    label: "Kein Interesse",
    color: "bg-red-100 text-red-700",
  },
  { value: "CONVERTED", label: "Gewonnen", color: "bg-emerald-100 text-emerald-700" },
  { value: "INVALID", label: "Ungueltig", color: "bg-gray-100 text-gray-400" },
];

const TIER_COLOR: Record<string, string> = {
  HIGH: "text-emerald-700 bg-emerald-100",
  MEDIUM: "text-amber-700 bg-amber-100",
  LOW: "text-red-600 bg-red-100",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE").format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getFollowUpSummary(followUpAt: string | null) {
  if (!followUpAt) return null;

  const date = new Date(followUpAt);
  const now = new Date();
  const isDue = date.getTime() <= now.getTime();

  return {
    label: `${isDue ? "Faellig" : "Geplant"}: ${formatDate(followUpAt)}`,
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

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLead() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/leads/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Lead konnte nicht geladen werden");
        }

        const data = (await res.json()) as Lead;
        if (cancelled) return;

        setLead(data);
        setNotes(data.notes ?? "");
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Lead konnte nicht geladen werden"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLead();

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function save(patch: Record<string, unknown>, key: string) {
    setSavingKey(key);
    setSaveError(null);

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Lead konnte nicht gespeichert werden");
      }

      const updated = (await res.json()) as Partial<Lead>;
      setLead((current) => (current ? { ...current, ...updated } : null));

      if (typeof patch.notes === "string") {
        setNotes(patch.notes);
      }

      return true;
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Lead konnte nicht gespeichert werden"
      );
      return false;
    } finally {
      setSavingKey((current) => (current === key ? null : current));
    }
  }

  function addTag() {
    const tag = tagInput.trim().replace(/,/g, "");
    if (!tag || !lead) return;
    if (lead.tags.includes(tag)) {
      setTagInput("");
      return;
    }

    setTagInput("");
    void save({ tags: [...lead.tags, tag] }, "tags");
  }

  function removeTag(tag: string) {
    if (!lead) return;
    void save(
      { tags: lead.tags.filter((currentTag) => currentTag !== tag) },
      "tags"
    );
  }

  async function markContacted() {
    await save(
      {
        status: "CONTACTED",
        contactedAt: new Date().toISOString(),
      },
      "contacted"
    );
  }

  async function scheduleTomorrow() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    await save({ followUpAt: tomorrow.toISOString() }, "followUp");
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-sm text-gray-400">
        Lade Lead...
      </div>
    );
  }

  if (!lead || error) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Lead nicht gefunden"}
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Zurueck
        </button>
      </div>
    );
  }

  const tier = getConfidenceTier(lead.confidence);
  const currentStatus = STATUS_OPTIONS.find((option) => option.value === lead.status);
  const followUpSummary = getFollowUpSummary(lead.followUpAt);
  const quickActions = getQuickActions(lead);
  const hasDirectContact = Boolean(lead.phone || lead.email || lead.website);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col gap-2 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => router.back()} className="hover:text-gray-700">
            &larr; Zurueck
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate">{lead.companyName}</span>
        </div>
        {lead.job && (
          <Link
            href={`/?jobId=${lead.job.id}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Zum Suchlauf
          </Link>
        )}
      </div>

      {(saveError || error) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError ?? error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {lead.companyName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {lead.city ?? "Ort unbekannt"}
              {lead.category ? ` · ${lead.category}` : ""}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={`text-xs font-semibold rounded-full px-2.5 py-0.5 ${TIER_COLOR[tier]}`}
              >
                {tier === "HIGH"
                  ? "Hohe Qualitaet"
                  : tier === "MEDIUM"
                    ? "Mittlere Qualitaet"
                    : "Niedrige Qualitaet"}
              </span>
              {lead.confidence !== null && (
                <span className="text-xs text-gray-400">
                  Score: {Math.round(lead.confidence * 100)}%
                </span>
              )}
              {lead.sourceName && (
                <span className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                  {lead.sourceName}
                </span>
              )}
              <span className="text-xs text-gray-500 border border-gray-200 rounded-full px-2 py-0.5">
                {hasDirectContact
                  ? "Direkter Kontakt moeglich"
                  : "Nur Quellenkontakt"}
              </span>
              {followUpSummary && (
                <span
                  className={`text-xs border rounded-full px-2 py-0.5 ${followUpSummary.className}`}
                >
                  {followUpSummary.label}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 sm:items-end">
            <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              Status
            </label>
            <select
              value={lead.status}
              onChange={(event) =>
                void save({ status: event.target.value }, "status")
              }
              className={`text-sm rounded-full px-3 py-1.5 border-0 font-medium cursor-pointer ${
                currentStatus?.color ?? "bg-gray-100 text-gray-700"
              }`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              target={
                action.href.startsWith("mailto:") || action.href.startsWith("tel:")
                  ? undefined
                  : "_blank"
              }
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {action.label}
            </a>
          ))}
          <button
            onClick={() => void markContacted()}
            disabled={savingKey === "contacted"}
            className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 disabled:opacity-60"
          >
            {savingKey === "contacted" ? "Speichert..." : "Als kontaktiert markieren"}
          </button>
          <button
            onClick={() => void scheduleTomorrow()}
            disabled={savingKey === "followUp"}
            className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm text-violet-700 hover:bg-violet-100 disabled:opacity-60"
          >
            {savingKey === "followUp" ? "Plant..." : "Follow-up morgen"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Kontakt
          </h2>

          {hasDirectContact ? (
            <dl className="space-y-3 text-sm">
              {lead.phone && (
                <div>
                  <dt className="text-xs text-gray-400">Telefon</dt>
                  <dd>
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.phone}
                    </a>
                  </dd>
                </div>
              )}
              {lead.email && (
                <div>
                  <dt className="text-xs text-gray-400">E-Mail</dt>
                  <dd>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:underline break-all"
                    >
                      {lead.email}
                    </a>
                  </dd>
                </div>
              )}
              {lead.website && (
                <div>
                  <dt className="text-xs text-gray-400">Website</dt>
                  <dd>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline break-all"
                    >
                      {lead.website.replace(/^https?:\/\//, "")}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500">
              Kein direkter Kontakt gefunden. Arbeite ueber Website oder Quellseite weiter.
            </div>
          )}

          {lead.address && (
            <div>
              <dt className="text-xs text-gray-400">Adresse</dt>
              <dd className="text-sm text-gray-800 mt-1">{lead.address}</dd>
            </div>
          )}

          {lead.sourceUrl && (
            <div>
              <dt className="text-xs text-gray-400">Quellseite</dt>
              <dd className="mt-1">
                <a
                  href={lead.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:underline break-all"
                >
                  {lead.sourceUrl}
                </a>
              </dd>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Vertrieb
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Follow-up Datum
              </label>
              <input
                key={lead.followUpAt ?? "no-follow-up"}
                type="date"
                defaultValue={lead.followUpAt ? lead.followUpAt.slice(0, 10) : ""}
                onBlur={(event) => {
                  const value = event.target.value;
                  void save(
                    {
                      followUpAt: value
                        ? new Date(`${value}T08:00:00.000Z`).toISOString()
                        : null,
                    },
                    "followUpDate"
                  );
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-600">
              <div className="text-xs text-gray-400 mb-1">Arbeitsstand</div>
              <div>Gefunden: {formatDate(lead.createdAt)}</div>
              {lead.contactedAt && (
                <div>Kontaktiert: {formatDateTime(lead.contactedAt)}</div>
              )}
              {lead.job && (
                <div className="mt-1">
                  Suchlauf: {lead.job.query} in {lead.job.location}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1 mb-2 min-h-[1.75rem]">
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="text-blue-400 hover:text-blue-700 leading-none font-bold"
                  >
                    x
                  </button>
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
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Tag eingeben..."
                maxLength={50}
                className="flex-1 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={addTag}
                disabled={savingKey === "tags"}
                className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 font-medium disabled:opacity-60"
              >
                + Tag
              </button>
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Enter oder Komma zum Hinzufuegen
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Notizen
          </h2>
          <span className="text-xs text-gray-300">{notes.length}/2000</span>
        </div>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={6}
          maxLength={2000}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Gesprächsnotizen, Ansprechpartner, naechste Schritte..."
        />
        <div className="flex items-center justify-end">
          <button
            onClick={() => void save({ notes }, "notes")}
            disabled={savingKey === "notes" || notes === (lead.notes ?? "")}
            className="bg-blue-600 text-white text-sm rounded-lg px-4 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-opacity"
          >
            {savingKey === "notes" ? "Speichern..." : "Notiz speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
