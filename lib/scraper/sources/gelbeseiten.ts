/**
 * Gelbe Seiten scraper (gelbeseiten.de)
 * Public business directory — Germany. Respectful rate-limited scraping.
 * Only reads publicly visible business listings.
 */

import * as cheerio from "cheerio";
import {
  normalizePhone,
  normalizeUrl,
  normalizeEmail,
  computeConfidence,
} from "@/lib/parser/normalize";
import type { RawLead } from "./overpass";

const BASE_URL = "https://www.gelbeseiten.de";
const DELAY_MS = parseInt(process.env.SCRAPE_DELAY_MS ?? "2000", 10);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; LeadsScraper/1.0; +https://github.com/local/leads-scraper)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function scrapeGelbeSeiten(
  query: string,
  location: string,
  maxResults: number = 30
): Promise<RawLead[]> {
  const leads: RawLead[] = [];
  const searchUrl = `${BASE_URL}/suche/${encodeURIComponent(query)}/${encodeURIComponent(location)}`;

  const html = await fetchPage(searchUrl);
  if (!html) return leads;

  const $ = cheerio.load(html);

  // Each listing article
  const articles = $("article[data-wle-id], [class*='teilnehmer']").toArray();

  for (const el of articles.slice(0, maxResults)) {
    if (leads.length >= maxResults) break;

    const $el = $(el);

    const companyName =
      $el.find("[class*='name'], h2, h3").first().text().trim() ||
      $el.find("[itemprop='name']").first().text().trim();

    if (!companyName) continue;

    const rawPhone =
      $el.find("[class*='phone'], [itemprop='telephone']").first().text().trim() ||
      $el.find("[href^='tel:']").first().attr("href")?.replace("tel:", "") ||
      null;

    const rawWebsite =
      $el.find("[class*='website'] a, [itemprop='url'] a").first().attr("href") ||
      $el.find("a[href*='http']").not("[href*='gelbeseiten']").first().attr("href") ||
      null;

    const rawEmail =
      $el.find("[href^='mailto:']").first().attr("href")?.replace("mailto:", "") ||
      null;

    const addressParts: string[] = [];
    const street = $el.find("[itemprop='streetAddress']").first().text().trim();
    const postcode = $el.find("[itemprop='postalCode']").first().text().trim();
    const city = $el.find("[itemprop='addressLocality']").first().text().trim() || location;
    if (street) addressParts.push(street);
    if (postcode) addressParts.push(postcode);
    if (city) addressParts.push(city);

    const category =
      $el.find("[class*='category'], [class*='branche']").first().text().trim() || query;

    const sourceUrl =
      $el.find("a[href*='/firmen/']").first().attr("href") ||
      $el.find("a").first().attr("href") ||
      searchUrl;

    const lead: RawLead = {
      companyName,
      website: normalizeUrl(rawWebsite),
      email: normalizeEmail(rawEmail),
      phone: normalizePhone(rawPhone),
      address: addressParts.join(", ") || null,
      city: city || location,
      category: category || null,
      sourceUrl: sourceUrl?.startsWith("http")
        ? sourceUrl
        : sourceUrl
        ? BASE_URL + sourceUrl
        : searchUrl,
      sourceName: "gelbeseiten",
      confidence: 0,
    };
    lead.confidence = computeConfidence(lead).score;
    leads.push(lead);
    // Note: sleep is only meaningful at HTTP request boundaries.
    // This scraper currently fetches one page; delay here is a no-op.
    // Re-enable if pagination / detail-page fetching is added.
  }

  return leads;
}
