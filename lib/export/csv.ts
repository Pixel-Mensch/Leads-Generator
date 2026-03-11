import { stringify } from "csv-stringify/sync";
import type { Lead } from "@prisma/client";

const COLUMNS = [
  { key: "companyName", header: "Firmenname" },
  { key: "website", header: "Website" },
  { key: "email", header: "E-Mail" },
  { key: "phone", header: "Telefon" },
  { key: "address", header: "Adresse" },
  { key: "city", header: "Ort" },
  { key: "category", header: "Branche/Kategorie" },
  { key: "status", header: "Status" },
  { key: "notes", header: "Notizen" },
  { key: "confidence", header: "Confidence" },
  { key: "sourceUrl", header: "Quelle URL" },
  { key: "createdAt", header: "Gefunden am" },
];

export function leadsToCSV(leads: Lead[]): string {
  const rows = leads.map((lead) =>
    COLUMNS.map(({ key }) => {
      const val = (lead as Record<string, unknown>)[key];
      if (val instanceof Date) return val.toISOString().split("T")[0];
      if (typeof val === "number") return val.toFixed(2);
      return val ?? "";
    })
  );

  return stringify([COLUMNS.map((c) => c.header), ...rows], {
    quoted: true,
    bom: true, // UTF-8 BOM for Excel compatibility
  });
}
