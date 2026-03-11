/**
 * Overpass API scraper (OpenStreetMap)
 * Fully open, ToS-compliant, structured business data.
 * Docs: https://overpass-api.de/
 */

import {
  normalizePhone,
  normalizeUrl,
  normalizeEmail,
  computeConfidence,
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
  confidence: number;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

/**
 * Geocode a city name to lat/lon using Nominatim (OSM).
 */
async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": "LeadsScraper/1.0 (local MVP)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.length) return null;
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

/**
 * Map user query to OSM amenity/shop/office tags.
 */
function queryToOsmFilter(query: string): string {
  const q = query.toLowerCase().trim();
  const mapping: Record<string, string> = {
    restaurant: 'node["amenity"="restaurant"]',
    restaurants: 'node["amenity"="restaurant"]',
    café: 'node["amenity"="cafe"]',
    cafe: 'node["amenity"="cafe"]',
    cafés: 'node["amenity"="cafe"]',
    hotel: 'node["tourism"="hotel"]',
    hotels: 'node["tourism"="hotel"]',
    arzt: 'node["amenity"="doctors"]',
    ärzte: 'node["amenity"="doctors"]',
    zahnarzt: 'node["amenity"="dentist"]',
    rechtsanwalt: 'node["amenity"="lawyers"]',
    anwalt: 'node["amenity"="lawyers"]',
    apotheke: 'node["amenity"="pharmacy"]',
    friseur: 'node["shop"="hairdresser"]',
    supermarkt: 'node["shop"="supermarket"]',
    bäckerei: 'node["shop"="bakery"]',
    metzger: 'node["shop"="butcher"]',
    fitnessstudio: 'node["leisure"="fitness_centre"]',
    gym: 'node["leisure"="fitness_centre"]',
    bank: 'node["amenity"="bank"]',
    tankstelle: 'node["amenity"="fuel"]',
    werkstatt: 'node["shop"="car_repair"]',
    kfz: 'node["shop"="car_repair"]',
    büro: 'node["office"]',
    office: 'node["office"]',
  };

  for (const [key, filter] of Object.entries(mapping)) {
    if (q.includes(key)) return filter;
  }

  // Fallback: search by name wildcard
  return `node["name"~"${query}",i]`;
}

function formatAddress(tags: Record<string, string>, lat?: number, lon?: number): string | null {
  const parts: string[] = [];
  if (tags["addr:street"]) {
    parts.push(tags["addr:street"] + (tags["addr:housenumber"] ? " " + tags["addr:housenumber"] : ""));
  }
  if (tags["addr:postcode"]) parts.push(tags["addr:postcode"]);
  if (tags["addr:city"]) parts.push(tags["addr:city"]);
  if (parts.length > 0) return parts.join(", ");
  if (lat && lon) return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
  return null;
}

export async function scrapeOverpass(
  query: string,
  location: string,
  radiusKm: number = 5,
  maxResults: number = 50
): Promise<RawLead[]> {
  const geo = await geocodeLocation(location);
  if (!geo) throw new Error(`Ort nicht gefunden: "${location}"`);

  const radiusM = radiusKm * 1000;
  const osmFilter = queryToOsmFilter(query);

  // Build Overpass QL — also search ways and relations for the same filter
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

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "data=" + encodeURIComponent(overpassQuery),
  });

  if (!res.ok) throw new Error(`Overpass API Fehler: ${res.status}`);
  const data = await res.json();

  const leads: RawLead[] = [];

  for (const element of data.elements ?? []) {
    const tags: Record<string, string> = element.tags ?? {};
    const name = tags["name"];
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
      confidence: 0,
    };
    lead.confidence = computeConfidence(lead);
    leads.push(lead);
  }

  return leads;
}
