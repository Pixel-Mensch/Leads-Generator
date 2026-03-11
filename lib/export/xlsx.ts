import ExcelJS from "exceljs";
import type { Lead } from "@prisma/client";
import {
  buildLeadExportView,
  type ExportMeta,
  summarizeLeadsForExport,
} from "./leadExport";

const COLUMNS: Array<{
  key: keyof ReturnType<typeof buildLeadExportView>;
  header: string;
  width: number;
}> = [
  { key: "companyName", header: "Firmenname", width: 32 },
  { key: "website", header: "Website", width: 30 },
  { key: "email", header: "E-Mail", width: 28 },
  { key: "phone", header: "Telefon", width: 18 },
  { key: "address", header: "Adresse", width: 35 },
  { key: "city", header: "Ort", width: 18 },
  { key: "category", header: "Branche", width: 20 },
  { key: "sourceName", header: "Quelle", width: 18 },
  { key: "contactChannels", header: "Kontaktkanaele", width: 18 },
  { key: "confidenceTier", header: "Qualitaet", width: 12 },
  { key: "confidence", header: "Score", width: 10 },
  { key: "confidenceSignals", header: "Confidence Signale", width: 42 },
  { key: "confidenceWarnings", header: "Confidence Warnungen", width: 42 },
  { key: "status", header: "Status", width: 16 },
  { key: "notes", header: "Notizen", width: 30 },
  { key: "sourceUrl", header: "Quelle URL", width: 40 },
  { key: "createdAt", header: "Gefunden am", width: 14 },
];

const TIER_FILL: Record<string, string> = {
  HIGH: "FFD1FAE5",
  MEDIUM: "FFFEF3C7",
  LOW: "FFFEE2E2",
};

function formatBreakdown(values: Record<string, number>) {
  const entries = Object.entries(values);
  if (!entries.length) return "keine";
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}: ${count}`)
    .join(", ");
}

export async function leadsToXLSX(
  leads: Lead[],
  meta?: ExportMeta
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Leads Scraper";
  workbook.created = new Date();

  const summary = summarizeLeadsForExport(leads);
  const sheet = workbook.addWorksheet("Leads", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map(({ key, header, width }) => ({ key, header, width }));

  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" },
    };
    cell.alignment = { vertical: "middle" };
  });

  const websiteColumn = COLUMNS.findIndex((column) => column.key === "website") + 1;
  const sourceUrlColumn = COLUMNS.findIndex((column) => column.key === "sourceUrl") + 1;
  const tierColumn = COLUMNS.findIndex((column) => column.key === "confidenceTier") + 1;

  for (const lead of leads) {
    const view = buildLeadExportView(lead);
    const row = sheet.addRow(view);

    if (view.website) {
      const cell = row.getCell(websiteColumn);
      cell.value = { text: view.website, hyperlink: view.website };
      cell.font = { color: { argb: "FF2563EB" }, underline: true };
    }

    if (view.sourceUrl) {
      const cell = row.getCell(sourceUrlColumn);
      cell.value = { text: view.sourceUrl, hyperlink: view.sourceUrl };
      cell.font = { color: { argb: "FF6B7280" }, underline: true };
    }

    const tierCell = row.getCell(tierColumn);
    tierCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: TIER_FILL[view.confidenceTier] ?? "FFFFFFFF" },
    };
    tierCell.font = { bold: true };
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  const metaSheet = workbook.addWorksheet("Export-Info");
  metaSheet.columns = [
    { key: "key", header: "Feld", width: 22 },
    { key: "value", header: "Wert", width: 60 },
  ];
  metaSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
  });

  const exportedAt = meta?.exportedAt ?? new Date();
  const metaRows = [
    { key: "Exportiert am", value: exportedAt.toISOString() },
    { key: "Leads gesamt", value: meta?.totalLeads ?? leads.length },
    { key: "Job-ID", value: meta?.jobId ?? "alle" },
    { key: "Projekt-ID", value: meta?.projectId ?? "alle" },
    { key: "Listen-ID", value: meta?.listId ?? "alle" },
    { key: "Status-Filter", value: meta?.statusFilter ?? "alle" },
    { key: "Tag-Filter", value: meta?.tagFilter ?? "alle" },
    { key: "Kategorie-Filter", value: meta?.categoryFilter ?? "alle" },
    { key: "Quellen-Filter", value: meta?.sourceFilter ?? "alle" },
    { key: "Quellen im Export", value: formatBreakdown(summary.sourceBreakdown) },
    { key: "Qualitaetsverteilung", value: formatBreakdown(summary.tierBreakdown) },
    { key: "Erstellt von", value: "Leads Scraper" },
  ];

  for (const row of metaRows) {
    metaSheet.addRow(row);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
