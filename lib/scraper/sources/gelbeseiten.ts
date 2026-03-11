/**
 * Gelbe Seiten scraper (gelbeseiten.de)
 * Public business directory, Germany. Respectful and read-only.
 */

import * as cheerio from "cheerio";
import {
  computeConfidence,
  normalizeEmail,
  normalizePhone,
  normalizeUrl,
} from "@/lib/parser/normalize";
import type { RawLead } from "./overpass";

const BASE_URL = "https://www.gelbeseiten.de";

type EmbeddedContact = {
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  companyName: string | null;
};

function cleanText(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function decodeBase64Value(value: string | null | undefined) {
  if (!value) return null;

  try {
    const decoded = Buffer.from(value, "base64").toString("utf8").trim();
    return decoded || null;
  } catch {
    return null;
  }
}

function absolutizeUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return value.startsWith("/") ? `${BASE_URL}${value}` : `${BASE_URL}/${value}`;
}

function parseEmbeddedContact(value: string | null | undefined): EmbeddedContact {
  if (!value) {
    return {
      email: null,
      phone: null,
      street: null,
      city: null,
      companyName: null,
    };
  }

  try {
    const parsed = JSON.parse(value);
    const generic = parsed?.organizationQuery?.generic ?? {};
    const phones = Array.isArray(generic.phones) ? generic.phones : [];

    return {
      email: cleanText(generic.email),
      phone: cleanText(phones[0]),
      street: cleanText(generic.street),
      city: cleanText(generic.city),
      companyName: cleanText(generic.name),
    };
  } catch {
    return {
      email: null,
      phone: null,
      street: null,
      city: null,
      companyName: null,
    };
  }
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
  maxResults = 30
): Promise<RawLead[]> {
  const leads: RawLead[] = [];
  const searchUrl = `${BASE_URL}/suche/${encodeURIComponent(query)}/${encodeURIComponent(location)}`;
  const html = await fetchPage(searchUrl);
  if (!html) return leads;

  const $ = cheerio.load(html);
  const articles = $("#teilnehmer_block article.mod-Treffer, article[data-teilnehmerid]").toArray();

  for (const element of articles.slice(0, maxResults)) {
    if (leads.length >= maxResults) break;

    const $el = $(element);
    const embedded = parseEmbeddedContact(
      $el.find("[data-parameters]").first().attr("data-parameters")
    );

    const companyName =
      cleanText($el.find("h2.mod-Treffer__name").first().text()) ??
      cleanText($el.find("[class*='name'], h2, h3").first().text()) ??
      embedded.companyName;

    if (!companyName) continue;

    const detailUrl =
      absolutizeUrl($el.find("a[href*='/gsbiz/']").first().attr("href")) ??
      absolutizeUrl(
        $el
          .find(".mod-TelefonnummerKompakt__phoneNumber")
          .first()
          .attr("data-detailseiteurl")
      ) ??
      searchUrl;

    const rawPhone =
      cleanText(
        $el.find(".mod-TelefonnummerKompakt__phoneNumber").first().text()
      ) ??
      decodeBase64Value(
        $el
          .find(".mod-TelefonnummerKompakt__phoneNumber")
          .first()
          .attr("data-prg")
      ) ??
      embedded.phone;

    const rawWebsite =
      decodeBase64Value(
        $el.find("[data-webseitelink]").first().attr("data-webseitelink")
      ) ??
      $el.find("a[href*='http']").not("[href*='gelbeseiten']").first().attr("href") ??
      null;

    const rawEmail =
      cleanText(
        $el.find("[href^='mailto:']").first().attr("href")?.replace(/^mailto:/i, "")
      ) ?? embedded.email;

    const addressNode = $el.find(".mod-AdresseKompakt__adress-text").first().clone();
    addressNode.find(".mod-AdresseKompakt__entfernung").remove();
    const addressText = cleanText(addressNode.text());
    const city = embedded.city ?? location;
    const address =
      addressText ??
      cleanText(
        [embedded.street, embedded.city].filter(Boolean).join(", ")
      );

    const category =
      cleanText($el.find(".mod-Treffer--besteBranche, [class*='branche']").first().text()) ??
      query;

    const lead: RawLead = {
      companyName,
      website: normalizeUrl(rawWebsite),
      email: normalizeEmail(rawEmail),
      phone: normalizePhone(rawPhone),
      address,
      city,
      category: category || null,
      sourceUrl: detailUrl,
      sourceName: "gelbeseiten",
      confidence: 0,
    };

    lead.confidence = computeConfidence(lead).score;
    leads.push(lead);
  }

  return leads;
}
