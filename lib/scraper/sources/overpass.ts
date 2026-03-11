/**
 * Overpass API scraper (OpenStreetMap)
 * Fully open, ToS-compliant, structured business data.
 */

import {
  computeConfidence,
  normalizeEmail,
  normalizePhone,
  normalizeUrl,
} from "@/lib/parser/normalize";

export interface RawLead {
  companyName: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  confidence: number;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const OVERPASS_MAX_ATTEMPTS = 3;

function normalizeQueryToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\u00e4/g, "ae")
    .replace(/\u00f6/g, "oe")
    .replace(/\u00fc/g, "ue")
    .replace(/\u00df/g, "ss")
    .replace(/\u00c3\u00a4/g, "ae")
    .replace(/\u00c3\u00b6/g, "oe")
    .replace(/\u00c3\u00bc/g, "ue")
    .replace(/\u00c3\u009f/g, "ss");
}

function escapeOverpassRegex(value: string) {
  return value.replace(/[\\"]/g, "\\$&");
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableOverpassError(error: unknown) {
  if (!(error instanceof Error)) return false;

  if (
    error.name === "TimeoutError" ||
    error.message.includes("aborted due to timeout")
  ) {
    return true;
  }

  return /Overpass API Fehler: (429|5\d{2})/.test(error.message);
}

async function fetchOverpassData(overpassQuery: string) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= OVERPASS_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(OVERPASS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(overpassQuery),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        throw new Error(`Overpass API Fehler: ${res.status}`);
      }

      return await res.json();
    } catch (error) {
      lastError = error;

      if (attempt >= OVERPASS_MAX_ATTEMPTS || !isRetryableOverpassError(error)) {
        throw error;
      }

      await wait(attempt * 2000);
    }
  }

  throw lastError;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}` +
    "&format=json&limit=1";

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "LeadsScraper/1.0 (local validation)" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || !data.length) return null;

    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function queryToOsmFilter(query: string): string {
  const normalizedQuery = normalizeQueryToken(query);
  const mapping: Record<string, string> = {
    restaurant: 'node["amenity"="restaurant"]',
    restaurants: 'node["amenity"="restaurant"]',
    cafe: 'node["amenity"="cafe"]',
    cafes: 'node["amenity"="cafe"]',
    hotel: 'node["tourism"="hotel"]',
    hotels: 'node["tourism"="hotel"]',
    arzt: 'node["amenity"="doctors"]',
    aerzte: 'node["amenity"="doctors"]',
    zahnarzt: 'node["amenity"="dentist"]',
    rechtsanwalt: 'node["amenity"="lawyers"]',
    anwalt: 'node["amenity"="lawyers"]',
    apotheke: 'node["amenity"="pharmacy"]',
    friseur: 'node["shop"="hairdresser"]',
    supermarkt: 'node["shop"="supermarket"]',
    baeckerei: 'node["shop"="bakery"]',
    metzger: 'node["shop"="butcher"]',
    fitnessstudio: 'node["leisure"="fitness_centre"]',
    gym: 'node["leisure"="fitness_centre"]',
    bank: 'node["amenity"="bank"]',
    tankstelle: 'node["amenity"="fuel"]',
    werkstatt: 'node["shop"="car_repair"]',
    kfz: 'node["shop"="car_repair"]',
    buero: 'node["office"]',
    office: 'node["office"]',
  };

  for (const [key, filter] of Object.entries(mapping)) {
    if (normalizedQuery.includes(key)) return filter;
  }

  return `node["name"~"${escapeOverpassRegex(query)}",i]`;
}

function formatAddress(
  tags: Record<string, string>,
  lat?: number,
  lon?: number
): string | null {
  const parts: string[] = [];

  if (tags["addr:street"]) {
    parts.push(
      tags["addr:street"] +
        (tags["addr:housenumber"] ? ` ${tags["addr:housenumber"]}` : "")
    );
  }
  if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  if (tags["addr:city"]) parts.push(tags["addr:city"]);

  if (parts.length > 0) return parts.join(", ");
  if (typeof lat === "number" && typeof lon === "number") {
    return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  }

  return null;
}

export async function scrapeOverpass(
  query: string,
  location: string,
  radiusKm = 5,
  maxResults = 50
): Promise<RawLead[]> {
  const geo = await geocodeLocation(location);
  if (!geo) throw new Error(`Ort nicht gefunden: "${location}"`);

  const radiusM = radiusKm * 1000;
  const osmFilter = queryToOsmFilter(query);
  const filterBase = osmFilter.replace(/^node/, "");
  const overpassQuery = `
[out:json][timeout:30];
(
  node${filterBase}(around:${radiusM},${geo.lat},${geo.lon});
  way${filterBase}(around:${radiusM},${geo.lat},${geo.lon});
  relation${filterBase}(around:${radiusM},${geo.lat},${geo.lon});
);
out center tags ${maxResults};
  `.trim();

  const data = await fetchOverpassData(overpassQuery);

  const leads: RawLead[] = [];

  for (const element of data.elements ?? []) {
    const tags: Record<string, string> = element.tags ?? {};
    const name = tags["name"]?.trim();
    if (!name) continue;

    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    const rawPhone = tags["phone"] ?? tags["contact:phone"] ?? null;
    const rawWebsite = tags["website"] ?? tags["contact:website"] ?? null;
    const rawEmail = tags["email"] ?? tags["contact:email"] ?? null;
    const city = tags["addr:city"] ?? location;
    const category =
      tags["amenity"] ??
      tags["shop"] ??
      tags["office"] ??
      tags["tourism"] ??
      tags["leisure"] ??
      null;

    const lead: RawLead = {
      companyName: name,
      website: normalizeUrl(rawWebsite),
      email: normalizeEmail(rawEmail),
      phone: normalizePhone(rawPhone),
      address: formatAddress(tags, lat, lon),
      city,
      category,
      sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
      sourceName: "overpass",
      confidence: 0,
    };

    lead.confidence = computeConfidence(lead).score;
    leads.push(lead);
  }

  return leads;
}
