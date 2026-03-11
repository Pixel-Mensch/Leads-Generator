/**
 * Normalization utilities for lead data fields.
 * Produces consistent, auditable data across all scraping sources.
 *
 * Design principles:
 * - Transparent heuristics, no black-box magic
 * - Prefer null over garbage data
 * - Keep normalization deterministic so dedup and exports stay explainable
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "referrer",
  "_ga",
  "mc_cid",
  "mc_eid",
]);

const GENERIC_EMAIL_PREFIXES = new Set([
  "info",
  "kontakt",
  "contact",
  "mail",
  "office",
  "hello",
  "hallo",
  "service",
  "support",
  "noreply",
  "no-reply",
  "anfrage",
  "buchung",
  "reservierung",
  "anfragen",
  "team",
  "admin",
  "post",
  "webmaster",
  "impressum",
  "datenschutz",
  "bestellung",
  "vertrieb",
]);

const EMAIL_DOMAIN_BLOCKLIST = [
  "example.com",
  "example.de",
  "test.com",
  "test.de",
  "placeholder.com",
  "dummy.de",
  "mustermann.de",
];

const COMPANY_LEGAL_SUFFIXES = /\b(gmbh|ug|haftungsbeschraenkt|haftungsbeschränkt|kg|ohg|ag|gbr|e\.?\s*v\.?|e\.?\s*k\.?|co\.?|mbh|llc|ltd)\b/gi;

export type EmailType = "business" | "generic" | null;

export interface ConfidenceResult {
  score: number;
  tier: "HIGH" | "MEDIUM" | "LOW";
  signals: string[];
  warnings: string[];
}

type LeadFields = {
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  sourceName?: string | null;
};

function transliterateGerman(value: string) {
  return value
    .replace(/\u00e4/g, "ae")
    .replace(/\u00f6/g, "oe")
    .replace(/\u00fc/g, "ue")
    .replace(/\u00df/g, "ss")
    .replace(/\u00c3\u00a4/g, "ae")
    .replace(/\u00c3\u00b6/g, "oe")
    .replace(/\u00c3\u00bc/g, "ue")
    .replace(/\u00c3\u009f/g, "ss");
}

export function normalizeComparableText(raw: string | undefined | null): string {
  if (!raw) return "";

  return transliterateGerman(raw.toLowerCase())
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize phone numbers toward a German E.164-like format (+49XXXXXXXXX).
 * Returns null if the number is clearly invalid.
 */
export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;

  let cleaned = raw.trim().replace(/^tel:/i, "");
  cleaned = cleaned.replace(/[\s\-()/.]/g, "");
  cleaned = cleaned.replace(/(?!^\+)[^\d]/g, "");

  if (cleaned.startsWith("0049")) {
    cleaned = "+49" + cleaned.slice(4);
  }

  if (cleaned.startsWith("0") && !cleaned.startsWith("00")) {
    cleaned = "+49" + cleaned.slice(1);
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (/^(\d)\1{5,}$/.test(digits)) return null;

  return cleaned;
}

/**
 * Normalize a URL while preserving path/query casing.
 * Only http/https URLs are accepted.
 */
export function normalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;

  let url = raw.trim();
  if (!url) return null;

  if (/^(mailto|tel|javascript|data):/i.test(url)) {
    return null;
  }

  if (url.startsWith("//")) {
    url = "https:" + url;
  } else if (!/^[a-z][a-z\d+\-.]*:/i.test(url)) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    const params = [...parsed.searchParams.entries()];
    parsed.search = "";
    for (const [key, value] of params) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.append(key, value);
      }
    }

    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.protocol = parsed.protocol.toLowerCase();

    if (
      (parsed.protocol === "http:" && parsed.port === "80") ||
      (parsed.protocol === "https:" && parsed.port === "443")
    ) {
      parsed.port = "";
    }

    const pathname = parsed.pathname === "/" ? "" : parsed.pathname;
    const search = parsed.searchParams.toString()
      ? `?${parsed.searchParams.toString()}`
      : "";

    return `${parsed.protocol}//${parsed.host}${pathname}${search}`;
  } catch {
    return null;
  }
}

export function extractDomain(url: string | null | undefined): string | null {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;

  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Normalize and validate an email address.
 * Returns null for invalid, placeholder, or unparseable input.
 */
export function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;

  const email = raw
    .trim()
    .replace(/^mailto:/i, "")
    .replace(/\?.*$/, "")
    .toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) return null;
  if (EMAIL_DOMAIN_BLOCKLIST.some((blocked) => email.endsWith(`@${blocked}`))) {
    return null;
  }

  return email;
}

export function classifyEmail(email: string | null): EmailType {
  if (!email) return null;

  const local = email.split("@")[0].toLowerCase();
  if (
    GENERIC_EMAIL_PREFIXES.has(local) ||
    [...GENERIC_EMAIL_PREFIXES].some((prefix) => local.startsWith(prefix + "."))
  ) {
    return "generic";
  }

  return "business";
}

/**
 * Normalize a company name for deduplication matching.
 * This is not intended for UI display.
 */
export function normalizeCompanyName(name: string): string {
  return normalizeComparableText(name)
    .replace(COMPANY_LEGAL_SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function domainsMatch(emailDomain: string | null, websiteDomain: string | null) {
  if (!emailDomain || !websiteDomain) return false;

  return (
    emailDomain === websiteDomain ||
    emailDomain.endsWith(`.${websiteDomain}`) ||
    websiteDomain.endsWith(`.${emailDomain}`)
  );
}

function parseSourceNames(sourceName: string | null | undefined) {
  return new Set(
    (sourceName ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Compute a transparent confidence score for a lead.
 */
export function computeConfidence(lead: LeadFields): ConfidenceResult {
  let score = 0;
  const signals: string[] = [];
  const warnings: string[] = [];

  if (lead.companyName?.trim()) {
    score += 0.15;
    signals.push("Firmenname vorhanden");
  }

  if (lead.phone) {
    const digits = lead.phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      score += 0.2;
      signals.push("Telefonnummer vollstaendig");
    } else {
      score += 0.08;
      warnings.push("Telefonnummer kurz oder unvollstaendig");
    }
  } else {
    warnings.push("Keine Telefonnummer");
  }

  if (lead.email) {
    const emailType = classifyEmail(lead.email);
    if (emailType === "business") {
      score += 0.25;
      signals.push("Direkte E-Mail-Adresse");
    } else {
      score += 0.12;
      warnings.push("Generische E-Mail");
    }
  } else {
    warnings.push("Keine E-Mail-Adresse");
  }

  if (lead.website) {
    score += 0.12;
    signals.push("Website vorhanden");

    if (lead.email) {
      const emailDomain = lead.email.split("@")[1] ?? null;
      const websiteDomain = extractDomain(lead.website);
      if (domainsMatch(emailDomain, websiteDomain)) {
        score += 0.1;
        signals.push("E-Mail-Domain stimmt mit Website ueberein");
      }
    }
  } else {
    warnings.push("Keine Website");
  }

  if (lead.address) {
    score += 0.05;
    signals.push("Adresse vorhanden");
  } else if (lead.city) {
    score += 0.02;
    signals.push("Ort bekannt");
  } else {
    warnings.push("Kein Standort");
  }

  const sources = parseSourceNames(lead.sourceName);
  if (sources.has("overpass") && sources.has("gelbeseiten")) {
    score += 0.06;
    signals.push("Mehrere Quellen bestaetigen den Lead");
  } else if (sources.has("gelbeseiten")) {
    score += 0.05;
    signals.push("Quelle: Gelbe Seiten");
  } else if (sources.has("overpass")) {
    score += 0.03;
    signals.push("Quelle: OpenStreetMap");
  }

  const finalScore = Math.min(Math.round(score * 100) / 100, 1);
  const tier: ConfidenceResult["tier"] =
    finalScore >= 0.65 ? "HIGH" : finalScore >= 0.35 ? "MEDIUM" : "LOW";

  return { score: finalScore, tier, signals, warnings };
}

export function getConfidenceTier(
  score: number | null | undefined
): "HIGH" | "MEDIUM" | "LOW" {
  if (!score) return "LOW";
  return score >= 0.65 ? "HIGH" : score >= 0.35 ? "MEDIUM" : "LOW";
}
