import { stringify } from "csv-stringify/sync";
import type { Lead } from "@prisma/client";
import {
  buildLeadExportView,
  type ExportMeta,
  summarizeLeadsForExport,
} from "./leadExport";

const COLUMNS: Array<{ key: keyof ReturnType<typeof buildLeadExportView>; header: string }> = [
  { key: "companyName", header: "Firmenname" },
  { key: "website", header: "Website" },
  { key: "email", header: "E-Mail" },
  { key: "phone", header: "Telefon" },
  { key: "address", header: "Adresse" },
  { key: "city", header: "Ort" },
  { key: "category", header: "Branche/Kategorie" },
  { key: "sourceName", header: "Quelle" },
  { key: "contactChannels", header: "Kontaktkanaele" },
  { key: "confidenceTier", header: "Qualitaet" },
  { key: "confidence", header: "Confidence Score" },
  { key: "confidenceSignals", header: "Confidence Signale" },
  { key: "confidenceWarnings", header: "Confidence Warnungen" },
  { key: "status", header: "Status" },
  { key: "notes", header: "Notizen" },
  { key: "sourceUrl", header: "Quelle URL" },
  { key: "createdAt", header: "Gefunden am" },
];

function formatBreakdown(values: Record<string, number>) {
  const entries = Object.entries(values);
  if (!entries.length) return "keine";
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}: ${count}`)
    .join(", ");
}

export function leadsToCSV(leads: Lead[], meta?: ExportMeta): string {
  const rows: unknown[][] = [];
  const summary = summarizeLeadsForExport(leads);

  if (meta) {
    rows.push(["# Export", new Date(meta.exportedAt ?? new Date()).toISOString()]);
    if (meta.totalLeads !== undefined) rows.push(["# Leads gesamt", meta.totalLeads]);
    if (meta.jobId) rows.push(["# Job-ID", meta.jobId]);
    if (meta.projectId) rows.push(["# Projekt-ID", meta.projectId]);
    if (meta.listId) rows.push(["# Listen-ID", meta.listId]);
    if (meta.statusFilter) rows.push(["# Status-Filter", meta.statusFilter]);
    if (meta.tagFilter) rows.push(["# Tag-Filter", meta.tagFilter]);
    if (meta.categoryFilter) rows.push(["# Kategorie-Filter", meta.categoryFilter]);
    if (meta.sourceFilter) rows.push(["# Quellen-Filter", meta.sourceFilter]);
    rows.push(["# Quellen", formatBreakdown(summary.sourceBreakdown)]);
    rows.push(["# Qualitaet", formatBreakdown(summary.tierBreakdown)]);
    rows.push([]);
  }

  rows.push(COLUMNS.map((column) => column.header));

  for (const lead of leads) {
    const view = buildLeadExportView(lead);
    rows.push(COLUMNS.map(({ key }) => view[key] ?? ""));
  }

  return stringify(rows, {
    quoted: true,
    bom: true,
  });
}
