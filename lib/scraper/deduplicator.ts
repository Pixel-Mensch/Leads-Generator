/**
 * Simple deduplication for raw leads before DB insert.
 * Deduplicates by normalized domain, phone, and company name.
 */

import { extractDomain } from "@/lib/parser/normalize";
import type { RawLead } from "./sources/overpass";

export function deduplicateLeads(leads: RawLead[]): RawLead[] {
  const seen = new Set<string>();
  const result: RawLead[] = [];

  for (const lead of leads) {
    const domain = extractDomain(lead.website);
    const phone = lead.phone?.replace(/\D/g, "") ?? null;
    const name = lead.companyName.toLowerCase().trim();

    // Build dedup keys — match on any of these
    const keys: string[] = [`name:${name}`];
    if (domain) keys.push(`domain:${domain}`);
    if (phone && phone.length > 6) keys.push(`phone:${phone}`);

    const isDuplicate = keys.some((k) => seen.has(k));
    if (isDuplicate) continue;

    keys.forEach((k) => seen.add(k));
    result.push(lead);
  }

  return result;
}
