import { stringify } from "csv-stringify/sync";
import type { Lead } from "@prisma/client";
import { getConfidenceTier } from "@/lib/parser/normalize";

/**
 * Export column definitions for CSV.
 * Order determines column position in the output file.
 */
const COLUMNS: Array<{ key: string; header: string }> = [
  { key: "companyName",    header: "Firmenname" },
  { key: "website",        header: "Website" },
  { key: "email",          header: "E-Mail" },
  { key: "phone",          header: "Telefon" },
  { key: "address",        header: "Adresse" },
  { key: "city",           header: "Ort" },
  { key: "category",       header: "Branche/Kategorie" },
  { key: "sourceName",     header: "Quelle" },
  { key: "confidenceTier", header: "Qualitaet" },         // HIGH / MEDIUM / LOW
  { key: "confidence",     header: "Confidence Score" },  // numeric 0.00–1.00
  { key: "status",         header: "Status" },
  { key: "notes",          header: "Notizen" },
  { key: "sourceUrl",      header: "Quelle URL" },
  { key: "createdAt",      header: "Gefunden am" },
];

export interface ExportMeta {
  exportedAt?: Date;
  jobId?: string;
  projectId?: string;
  statusFilter?: string;
  totalLeads?: number;
}

export function leadsToCSV(leads: Lead[], meta?: ExportMeta): string {
  const rows: unknown[][] = [];

  // Optional meta header block at top of file
  if (meta) {
    rows.push(["# Export", new Date(meta.exportedAt ?? new Date()).toISOString()]);
    if (meta.totalLeads !== undefined) rows.push(["# Leads gesamt", meta.totalLeads]);
    if (meta.jobId)        rows.push(["# Job-ID", meta.jobId]);
    if (meta.projectId)    rows.push(["# Projekt-ID", meta.projectId]);
    if (meta.statusFilter) rows.push(["# Status-Filter", meta.statusFilter]);
    rows.push([]); // blank separator row before headers
  }

  // Column header row
  rows.push(COLUMNS.map((c) => c.header));

  // Data rows
  for (const lead of leads) {
    const row = COLUMNS.map(({ key }) => {
      if (key === "confidenceTier") {
        return getConfidenceTier(lead.confidence);
      }
      const val = (lead as Record<string, unknown>)[key];
      if (val instanceof Date) return val.toISOString().split("T")[0];
      if (key === "confidence" && typeof val === "number") return val.toFixed(2);
      return val ?? "";
    });
    rows.push(row);
  }

  return stringify(rows, {
    quoted: true,
    bom: true, // UTF-8 BOM for Excel compatibility
  });
}
