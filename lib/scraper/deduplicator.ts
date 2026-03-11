/**
 * Deduplication for raw leads before DB insert.
 *
 * Priority order:
 *   1. Domain
 *   2. Phone
 *   3. Normalized company name + normalized city
 *
 * Duplicate rows are merged instead of dropped so multi-source enrichment survives.
 */

import {
  classifyEmail,
  extractDomain,
  normalizeComparableText,
  normalizeCompanyName,
} from "@/lib/parser/normalize";
import type { RawLead } from "./sources/overpass";

type LeadMaps = {
  byDomain: Map<string, number>;
  byPhone: Map<string, number>;
  byName: Map<string, number>;
};

function combineSourceNames(
  primary: string | null,
  secondary: string | null
): string | null {
  const values = [
    ...(primary ?? "").split(","),
    ...(secondary ?? "").split(","),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  if (!values.length) return null;
  return [...new Set(values)].join(",");
}

function choosePreferredEmail(
  primary: string | null,
  secondary: string | null
): string | null {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const primaryType = classifyEmail(primary);
  const secondaryType = classifyEmail(secondary);

  const score = (value: ReturnType<typeof classifyEmail>) =>
    value === "business" ? 2 : value === "generic" ? 1 : 0;

  if (score(secondaryType) > score(primaryType)) {
    return secondary;
  }

  return primary;
}

function chooseLongerValue(
  primary: string | null,
  secondary: string | null
): string | null {
  if (!primary) return secondary;
  if (!secondary) return primary;
  return secondary.length > primary.length ? secondary : primary;
}

function choosePhone(primary: string | null, secondary: string | null): string | null {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const primaryDigits = primary.replace(/\D/g, "").length;
  const secondaryDigits = secondary.replace(/\D/g, "").length;
  return secondaryDigits > primaryDigits ? secondary : primary;
}

function chooseSourceUrl(
  primary: string | null,
  secondary: string | null
): string | null {
  if (!primary) return secondary;
  if (!secondary) return primary;

  const score = (value: string) => {
    let result = 0;
    if (/\/gsbiz\//.test(value)) result += 3;
    if (/openstreetmap\.org/.test(value)) result += 2;
    if (/\/suche\//.test(value) || /\/branchen\//.test(value)) result -= 1;
    result += Math.min(value.length / 100, 1);
    return result;
  };

  return score(secondary) > score(primary) ? secondary : primary;
}

function mergeLeads(base: RawLead, fallback: RawLead): RawLead {
  return {
    companyName: chooseLongerValue(base.companyName, fallback.companyName) ?? base.companyName,
    website: base.website ?? fallback.website,
    email: choosePreferredEmail(base.email, fallback.email),
    phone: choosePhone(base.phone, fallback.phone),
    address: chooseLongerValue(base.address, fallback.address),
    city: chooseLongerValue(base.city, fallback.city),
    category: chooseLongerValue(base.category, fallback.category),
    sourceUrl: chooseSourceUrl(base.sourceUrl, fallback.sourceUrl),
    sourceName: combineSourceNames(base.sourceName, fallback.sourceName),
    confidence: base.confidence,
  };
}

function getNameKey(lead: RawLead) {
  const normalizedName = normalizeCompanyName(lead.companyName);
  const normalizedCity = normalizeComparableText(lead.city);

  if (!normalizedName || !normalizedCity) {
    return null;
  }

  return `${normalizedName}::${normalizedCity}`;
}

function registerLeadKeys(lead: RawLead, index: number, maps: LeadMaps) {
  const domain = extractDomain(lead.website);
  const phoneDigits = lead.phone?.replace(/\D/g, "") ?? null;
  const nameKey = getNameKey(lead);

  if (domain) {
    maps.byDomain.set(domain, index);
  }

  if (phoneDigits && phoneDigits.length >= 7) {
    maps.byPhone.set(phoneDigits, index);
  }

  if (nameKey) {
    maps.byName.set(nameKey, index);
  }
}

export function deduplicateLeads(leads: RawLead[]): RawLead[] {
  const maps: LeadMaps = {
    byDomain: new Map<string, number>(),
    byPhone: new Map<string, number>(),
    byName: new Map<string, number>(),
  };

  const result: RawLead[] = [];

  for (const lead of leads) {
    const normalizedName = normalizeCompanyName(lead.companyName);
    if (!normalizedName) continue;

    const domain = extractDomain(lead.website);
    const phoneDigits = lead.phone?.replace(/\D/g, "") ?? null;
    const nameKey = getNameKey(lead);

    let existingIdx: number | undefined;

    if (domain && maps.byDomain.has(domain)) {
      existingIdx = maps.byDomain.get(domain);
    } else if (phoneDigits && phoneDigits.length >= 7 && maps.byPhone.has(phoneDigits)) {
      existingIdx = maps.byPhone.get(phoneDigits);
    } else if (nameKey && maps.byName.has(nameKey)) {
      existingIdx = maps.byName.get(nameKey);
    }

    if (existingIdx !== undefined) {
      const existing = result[existingIdx];
      const merged =
        existing.confidence >= lead.confidence
          ? mergeLeads(existing, lead)
          : mergeLeads(lead, existing);

      result[existingIdx] = merged;
      registerLeadKeys(merged, existingIdx, maps);
      continue;
    }

    const index = result.length;
    result.push(lead);
    registerLeadKeys(lead, index, maps);
  }

  return result;
}
