import ExcelJS from "exceljs";
import type { Lead } from "@prisma/client";
import { getConfidenceTier } from "@/lib/parser/normalize";
import type { ExportMeta } from "./csv";

/** Lead data columns — order determines sheet column position */
const COLUMNS: Array<{ key: string; header: string; width: number }> = [
  { key: "companyName",    header: "Firmenname",   width: 32 },
  { key: "website",        header: "Website",       width: 30 },
  { key: "email",          header: "E-Mail",        width: 28 },
  { key: "phone",          header: "Telefon",       width: 18 },
  { key: "address",        header: "Adresse",       width: 35 },
  { key: "city",           header: "Ort",           width: 18 },
  { key: "category",       header: "Branche",       width: 20 },
  { key: "sourceName",     header: "Quelle",        width: 14 },
  { key: "confidenceTier", header: "Qualität",      width: 12 },
  { key: "confidence",     header: "Score",         width: 10 },
  { key: "status",         header: "Status",        width: 16 },
  { key: "notes",          header: "Notizen",       width: 30 },
  { key: "sourceUrl",      header: "Quelle URL",    width: 40 },
  { key: "createdAt",      header: "Gefunden am",   width: 14 },
];

/** Background fill colors per confidence tier */
const TIER_FILL: Record<string, string> = {
  HIGH:   "FFD1FAE5", // green-100
  MEDIUM: "FFFEF3C7", // amber-100
  LOW:    "FFFEE2E2", // red-100
};

export async function leadsToXLSX(leads: Lead[], meta?: ExportMeta): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Leads Scraper";
  workbook.created = new Date();

  // ── Leads sheet ──────────────────────────────────────────────────────────
  const sheet = workbook.addWorksheet("Leads", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map(({ key, header, width }) => ({ key, header, width }));

  // Header row styling
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    cell.alignment = { vertical: "middle" };
  });

  // Pre-compute column indices for special handling
  const websiteColIdx    = COLUMNS.findIndex((c) => c.key === "website") + 1;
  const sourceUrlColIdx  = COLUMNS.findIndex((c) => c.key === "sourceUrl") + 1;
  const tierColIdx       = COLUMNS.findIndex((c) => c.key === "confidenceTier") + 1;

  // Data rows
  for (const lead of leads) {
    const tier = getConfidenceTier(lead.confidence);
    const rowData: Record<string, unknown> = {};

    for (const { key } of COLUMNS) {
      if (key === "confidenceTier") {
        rowData[key] = tier;
        continue;
      }
      const val = (lead as Record<string, unknown>)[key];
      if (val instanceof Date) {
        rowData[key] = val.toISOString().split("T")[0];
      } else if (key === "confidence" && typeof val === "number") {
        rowData[key] = parseFloat(val.toFixed(2));
      } else {
        rowData[key] = val ?? "";
      }
    }

    const row = sheet.addRow(rowData);

    // Clickable hyperlinks for website and sourceUrl
    if (lead.website) {
      const cell = row.getCell(websiteColIdx);
      cell.value = { text: lead.website, hyperlink: lead.website };
      cell.font = { color: { argb: "FF2563EB" }, underline: true };
    }
    if (lead.sourceUrl) {
      const cell = row.getCell(sourceUrlColIdx);
      cell.value = { text: lead.sourceUrl, hyperlink: lead.sourceUrl };
      cell.font = { color: { argb: "FF6B7280" }, underline: true };
    }

    // Color-code the Qualität cell by confidence tier
    const tierCell = row.getCell(tierColIdx);
    tierCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: TIER_FILL[tier] ?? "FFFFFFFF" },
    };
    tierCell.font = { bold: true };
  }

  // AutoFilter on header row
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  // ── Export-Info sheet ────────────────────────────────────────────────────
  const metaSheet = workbook.addWorksheet("Export-Info");
  metaSheet.columns = [
    { key: "key",   header: "Feld",  width: 22 },
    { key: "value", header: "Wert",  width: 45 },
  ];
  metaSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  });

  const exportedAt = meta?.exportedAt ?? new Date();
  const metaRows = [
    { key: "Exportiert am",  value: exportedAt.toISOString() },
    { key: "Leads gesamt",   value: meta?.totalLeads ?? leads.length },
    { key: "Job-ID",         value: meta?.jobId ?? "alle" },
    { key: "Projekt-ID",     value: meta?.projectId ?? "alle" },
    { key: "Status-Filter",  value: meta?.statusFilter ?? "alle" },
    { key: "Erstellt von",   value: "Leads Scraper" },
  ];
  for (const r of metaRows) metaSheet.addRow(r);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
