import ExcelJS from "exceljs";
import type { Lead } from "@prisma/client";

const COLUMNS = [
  { key: "companyName", header: "Firmenname", width: 30 },
  { key: "website", header: "Website", width: 30 },
  { key: "email", header: "E-Mail", width: 28 },
  { key: "phone", header: "Telefon", width: 18 },
  { key: "address", header: "Adresse", width: 35 },
  { key: "city", header: "Ort", width: 18 },
  { key: "category", header: "Branche", width: 20 },
  { key: "status", header: "Status", width: 16 },
  { key: "notes", header: "Notizen", width: 30 },
  { key: "confidence", header: "Confidence", width: 12 },
  { key: "sourceUrl", header: "Quelle URL", width: 40 },
  { key: "createdAt", header: "Gefunden am", width: 14 },
];

export async function leadsToXLSX(leads: Lead[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Leads Scraper";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Leads", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = COLUMNS.map(({ key, header, width }) => ({
    key,
    header,
    width,
  }));

  // Header style
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // blue-600
    };
    cell.alignment = { vertical: "middle" };
  });

  // Data rows
  for (const lead of leads) {
    const row: Record<string, unknown> = {};
    for (const { key } of COLUMNS) {
      const val = (lead as Record<string, unknown>)[key];
      if (val instanceof Date) {
        row[key] = val.toISOString().split("T")[0];
      } else if (key === "confidence" && typeof val === "number") {
        row[key] = parseFloat(val.toFixed(2));
      } else {
        row[key] = val ?? "";
      }
    }
    sheet.addRow(row);
  }

  // Auto-filter
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
