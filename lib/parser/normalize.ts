/**
 * Normalization utilities for lead data fields.
 * Keeps data consistent across different scraping sources.
 */

export function normalizePhone(raw: string | undefined | null): string | null {
  if (!raw) return null;
  // Remove everything except digits and leading +
  let cleaned = raw.replace(/[^\d+]/g, "");
  // Normalize German local numbers: replace leading 0 with +49
  if (cleaned.startsWith("0") && cleaned.length >= 6) {
    cleaned = "+49" + cleaned.slice(1);
  }
  // Must have at least 7 digits to be valid
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 7) return null;
  return cleaned;
}

export function normalizeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;
  // Add https if no protocol
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  try {
    const parsed = new URL(url);
    // Return clean origin + pathname without trailing slash on root
    const clean = parsed.origin + (parsed.pathname !== "/" ? parsed.pathname : "");
    return clean.toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeEmail(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  // Basic RFC 5322 sanity check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailRegex.test(email)) return null;
  // Skip generic/placeholder-looking emails
  const blocked = ["info@example.com", "test@test.com", "noreply@"];
  if (blocked.some((b) => email.includes(b))) return null;
  return email;
}

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

export function computeConfidence(lead: {
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
}): number {
  let score = 0.3; // base for having a name
  if (lead.phone) score += 0.25;
  if (lead.email) score += 0.25;
  if (lead.website) score += 0.15;
  if (lead.address) score += 0.05;
  return Math.min(score, 1.0);
}
