/**
 * Normalization utilities for lead data fields.
 * Produces consistent, auditable data across all scraping sources.
 *
 * Design principles:
 * - Transparent heuristics — no black-box magic
 * - Signals and warnings logged for auditability
 * - Prefer null over garbage data
 */

// ─── Phone ────────────────────────────────────────────────────────────────────

/**
 * Normalize phone numbers toward E.164-compatible format (+49XXXXXXXXX).
 * Returns null if the number is clearly invalid.
 */
export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;

  let cleaned = raw.trim();
  // Strip common visual separators before processing
  cleaned = cleaned.replace(/[\s\-\(\)\/\.]/g, "");

  // Remove everything except digits and leading +
  cleaned = cleaned.replace(/(?!^\+)[^\d]/g, "");

  // Normalize 0049 international dialing prefix → +49
  if (cleaned.startsWith("0049")) {
    cleaned = "+49" + cleaned.slice(4);
  }

  // Normalize German local format: leading 0 → +49
  if (cleaned.startsWith("0") && !cleaned.startsWith("00")) {
    cleaned = "+49" + cleaned.slice(1);
  }

  // Validate digit count: E.164 allows 7–15 digits (excl. leading +)
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;

  // Reject obviously fake numbers (all same digit, e.g. 000000000, 111111111)
  if (/^(\d)\1{5,}$/.test(digits)) return null;

  return cleaned;
}

// ─── URL / Domain ────────────────────────────────────────────────────────────

/** Tracking/analytics parameters to strip from URLs before storing */
const TRACKING_PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
  "fbclid", "gclid", "ref", "referrer", "_ga", "mc_cid", "mc_eid",
];

/**
 * Normalize a URL: add https if missing, strip tracking params, lowercase.
 * Returns null for unparseable or empty input.
 */
export function normalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;

  // Add https if no protocol present
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  try {
    const parsed = new URL(url);

    // Strip tracking/analytics params
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // Rebuild clean canonical URL
    const path = parsed.pathname !== "/" ? parsed.pathname : "";
    const search = parsed.searchParams.toString()
      ? "?" + parsed.searchParams.toString()
      : "";
    return (parsed.origin + path + search).toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Extract a clean domain (no www prefix) from a URL.
 */
export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const normalized = normalizeUrl(url);
    if (!normalized) return null;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// ─── Email ───────────────────────────────────────────────────────────────────

/**
 * Generic/role-based email prefixes.
 * These are valid addresses but carry less commercial signal than direct contacts.
 */
const GENERIC_EMAIL_PREFIXES = new Set([
  "info", "kontakt", "contact", "mail", "office", "hello", "hallo",
  "service", "support", "noreply", "no-reply", "anfrage", "buchung",
  "reservierung", "anfragen", "team", "admin", "post", "webmaster",
  "impressum", "datenschutz", "bestellung", "vertrieb",
]);

/** Domain blocklist for clearly invalid or placeholder addresses */
const EMAIL_DOMAIN_BLOCKLIST = [
  "example.com", "example.de", "test.com", "test.de",
  "placeholder.com", "dummy.de", "mustermann.de",
];

export type EmailType = "business" | "generic" | null;

/**
 * Normalize and validate an email address.
 * Returns null for invalid, placeholder, or unparseable input.
 */
export function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;

  // Strip mailto: prefix (common in href values)
  const email = raw.trim().toLowerCase().replace(/^mailto:/, "");

  // Basic RFC 5322 structural check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) return null;

  // Block known placeholder domains
  if (EMAIL_DOMAIN_BLOCKLIST.some((b) => email.endsWith("@" + b))) return null;

  return email;
}

/**
 * Classify an email as 'business' (direct contact) or 'generic' (role account).
 * Generic emails are still valid data, just lower commercial priority.
 */
export function classifyEmail(email: string | null): EmailType {
  if (!email) return null;
  const local = email.split("@")[0].toLowerCase();
  // Match exact prefix or prefix followed by dot (e.g. "info.berlin@...")
  if (GENERIC_EMAIL_PREFIXES.has(local) || [...GENERIC_EMAIL_PREFIXES].some((p) => local.startsWith(p + "."))) {
    return "generic";
  }
  return "business";
}

// ─── Company Name ─────────────────────────────────────────────────────────────

/**
 * Normalize a company name for deduplication matching.
 * NOT for display — use the original companyName for that.
 * Handles German umlauts, common legal suffixes, and punctuation.
 */
export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Normalize German umlauts for ASCII matching
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    // Strip common legal entity suffixes
    .replace(/\b(gmbh|ug|kg|ohg|ag|gbr|e\.?\s*v\.?|e\.?\s*k\.?|co\.|&\s*co|mbh)\b/gi, "")
    // Strip punctuation and collapse whitespace
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Confidence Scoring ───────────────────────────────────────────────────────

export interface ConfidenceResult {
  /** Normalized score 0.0 – 1.0 */
  score: number;
  /** Human-readable tier for display and export */
  tier: "HIGH" | "MEDIUM" | "LOW";
  /** Positive signals that contributed to the score */
  signals: string[];
  /** Issues that reduced the score or flag data quality concerns */
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

/**
 * Compute a transparent, heuristic confidence score for a lead.
 *
 * Signal weights (total possible ≈ 1.0):
 *   name present          +0.15
 *   phone ≥10 digits      +0.20  (short phone +0.08)
 *   business email        +0.25  (generic email +0.12)
 *   website present       +0.12
 *   email domain matches  +0.10  (bonus on top of website + email)
 *   address present       +0.05  (city only +0.02)
 *   source bonus          +0.03–0.05
 */
export function computeConfidence(lead: LeadFields): ConfidenceResult {
  let score = 0;
  const signals: string[] = [];
  const warnings: string[] = [];

  // ── Name ────────────────────────────────────────────────────────
  if (lead.companyName?.trim()) {
    score += 0.15;
    signals.push("Firmenname vorhanden");
  }

  // ── Phone ────────────────────────────────────────────────────────
  if (lead.phone) {
    const digits = lead.phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      score += 0.20;
      signals.push("Telefonnummer vollständig");
    } else {
      score += 0.08;
      warnings.push("Telefonnummer kurz oder unvollständig");
    }
  } else {
    warnings.push("Keine Telefonnummer");
  }

  // ── Email ────────────────────────────────────────────────────────
  if (lead.email) {
    const emailType = classifyEmail(lead.email);
    if (emailType === "business") {
      score += 0.25;
      signals.push("Direkte/persönliche E-Mail-Adresse");
    } else {
      score += 0.12;
      warnings.push("Generische E-Mail (info@, kontakt@ etc.)");
    }
  } else {
    warnings.push("Keine E-Mail-Adresse");
  }

  // ── Website ──────────────────────────────────────────────────────
  if (lead.website) {
    score += 0.12;
    signals.push("Website vorhanden");

    // Email domain matches website domain — strong signal for data coherence
    if (lead.email) {
      const emailDomain = lead.email.split("@")[1];
      const websiteDomain = extractDomain(lead.website);
      if (emailDomain && websiteDomain && emailDomain === websiteDomain) {
        score += 0.10;
        signals.push("E-Mail-Domain stimmt mit Website überein");
      }
    }
  } else {
    warnings.push("Keine Website");
  }

  // ── Address / Location ──────────────────────────────────────────
  if (lead.address) {
    score += 0.05;
    signals.push("Vollständige Adresse vorhanden");
  } else if (lead.city) {
    score += 0.02;
    signals.push("Ort bekannt");
  } else {
    warnings.push("Kein Standort");
  }

  // ── Source quality ───────────────────────────────────────────────
  if (lead.sourceName === "overpass") {
    score += 0.03;
    signals.push("Quelle: OpenStreetMap (strukturierte Daten)");
  } else if (lead.sourceName === "gelbeseiten") {
    score += 0.05;
    signals.push("Quelle: Gelbe Seiten (Unternehmensverzeichnis DE)");
  }

  const finalScore = Math.min(Math.round(score * 100) / 100, 1.0);
  const tier: ConfidenceResult["tier"] =
    finalScore >= 0.65 ? "HIGH" : finalScore >= 0.35 ? "MEDIUM" : "LOW";

  return { score: finalScore, tier, signals, warnings };
}

/**
 * Derive confidence tier from a stored numeric score.
 * Use when recalculating tier from a DB lead without re-running full scoring.
 */
export function getConfidenceTier(score: number | null | undefined): "HIGH" | "MEDIUM" | "LOW" {
  if (!score) return "LOW";
  return score >= 0.65 ? "HIGH" : score >= 0.35 ? "MEDIUM" : "LOW";
}
