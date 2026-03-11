/**
 * Deduplication for raw leads before DB insert.
 *
 * Priority order (first match wins as dedup key):
 *   1. Domain  — strongest signal (unique per business)
 *   2. Phone   — strong signal (7+ digit match)
 *   3. Normalized name + city — weakest (context-aware to avoid cross-city false positives)
 *
 * When a duplicate is found we MERGE rather than discard.
 * The lead with the higher confidence score becomes the base.
 * Missing fields are filled from the lower-confidence duplicate.
 * This preserves data from multiple sources rather than losing it.
 */

import { extractDomain, normalizeCompanyName } from "@/lib/parser/normalize";
import type { RawLead } from "./sources/overpass";

/**
 * Merge two leads: base has priority for all fields, gaps filled from fallback.
 * The `sourceName` records whichever source had more data (the base).
 */
function mergeLeads(base: RawLead, fallback: RawLead): RawLead {
  return {
    companyName: base.companyName,
    website: base.website ?? fallback.website,
    email: base.email ?? fallback.email,
    phone: base.phone ?? fallback.phone,
    address: base.address ?? fallback.address,
    city: base.city ?? fallback.city,
    category: base.category ?? fallback.category,
    sourceUrl: base.sourceUrl ?? fallback.sourceUrl,
    sourceName: base.sourceName ?? fallback.sourceName,
    // Recalculate confidence after merge — caller is responsible (orchestrator does this)
    confidence: base.confidence,
  };
}

/**
 * Deduplicate an array of raw leads in-place with merge logic.
 *
 * Returns a new array with duplicates collapsed into their richest representative.
 * Order is preserved (first occurrence of a group wins positionally).
 */
export function deduplicateLeads(leads: RawLead[]): RawLead[] {
  // Maps from dedup key → index in result array
  const byDomain = new Map<string, number>();
  const byPhone = new Map<string, number>();
  const byName = new Map<string, number>();

  const result: RawLead[] = [];

  for (const lead of leads) {
    const domain = extractDomain(lead.website);
    const phoneDigits = lead.phone?.replace(/\D/g, "") ?? null;
    // City-qualified name key prevents cross-location false positives
    const normalizedName = normalizeCompanyName(lead.companyName);
    const cityKey = (lead.city ?? "").toLowerCase().trim();
    const nameKey = `${normalizedName}::${cityKey}`;

    // Skip leads with no meaningful name after normalization
    if (!normalizedName) continue;

    // Check each dedup tier in priority order
    let existingIdx: number | undefined;

    if (domain && byDomain.has(domain)) {
      existingIdx = byDomain.get(domain);
    } else if (phoneDigits && phoneDigits.length >= 7 && byPhone.has(phoneDigits)) {
      existingIdx = byPhone.get(phoneDigits);
    } else if (nameKey && byName.has(nameKey)) {
      existingIdx = byName.get(nameKey);
    }

    if (existingIdx !== undefined) {
      // Merge: higher confidence becomes the base
      const existing = result[existingIdx];
      const merged =
        existing.confidence >= lead.confidence
          ? mergeLeads(existing, lead)
          : mergeLeads(lead, existing);
      result[existingIdx] = merged;
      continue;
    }

    // New unique lead — register all available dedup keys
    const idx = result.length;
    if (domain) byDomain.set(domain, idx);
    if (phoneDigits && phoneDigits.length >= 7) byPhone.set(phoneDigits, idx);
    if (nameKey) byName.set(nameKey, idx);

    result.push(lead);
  }

  return result;
}
