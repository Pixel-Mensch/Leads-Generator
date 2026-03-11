# ARCHITECTURE.md

> Stand: 2026-03-11 — MVP Session 1

## High-Level Struktur

```
leads-scraper/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root Layout, Navigation
│   ├── page.tsx                  # Dashboard: Lead-Liste, Filter, Paginierung, Export
│   ├── search/page.tsx           # Suchmaske (Branche, Ort, Radius, Quelle)
│   ├── leads/[id]/page.tsx       # Lead-Detailseite
│   └── api/
│       ├── jobs/route.ts         # POST (erstellen), GET (Liste)
│       ├── jobs/[id]/route.ts    # GET (Status), DELETE
│       ├── jobs/[id]/run/route.ts # POST (Job starten, fire-and-forget)
│       ├── leads/route.ts        # GET (Liste, paginiert, gefiltert)
│       ├── leads/[id]/route.ts   # GET, PATCH (Status/Notizen), DELETE
│       ├── export/csv/route.ts   # GET → CSV Download
│       └── export/xlsx/route.ts  # GET → XLSX Download
├── components/
│   └── leads/
│       ├── LeadsTable.tsx        # Responsive Tabelle + Status-Inline-Edit
│       └── JobStatus.tsx         # Job-Statusanzeige mit Auto-Poll
├── lib/
│   ├── db.ts                     # Prisma Client Singleton
│   ├── scraper/
│   │   ├── orchestrator.ts       # Job-Runner: wählt Quelle, scrapt, dedupliziert, speichert
│   │   ├── deduplicator.ts       # Domain, Phone, Name Deduplizierung
│   │   └── sources/
│   │       ├── overpass.ts       # OpenStreetMap / Overpass API (frei, ToS-konform)
│   │       └── gelbeseiten.ts    # Gelbe Seiten DE (Cheerio, rate-limited)
│   ├── parser/
│   │   └── normalize.ts          # Phone, URL, Email Normalisierung + Confidence Score
│   └── export/
│       ├── csv.ts                # CSV mit UTF-8 BOM (Excel-kompatibel)
│       └── xlsx.ts               # XLSX mit ExcelJS (Header-Styling, AutoFilter)
├── prisma/
│   └── schema.prisma             # Datenmodell (SearchJob, Lead, Enums)
├── docker-compose.yml            # PostgreSQL + App Container
├── Dockerfile                    # Multi-Stage Build (Node 20 Alpine, standalone)
├── next.config.ts                # standalone output, serverExternalPackages
├── package.json                  # Dependencies + DB-Skripte
└── .env.example                  # Vorlage für Umgebungsvariablen
```

## Datenmodell

### SearchJob
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | cuid | Primärschlüssel |
| query | String | Suchbegriff (Branche) |
| location | String | Ort |
| radius | Int? | Radius in km |
| source | String | overpass / gelbeseiten / both |
| status | JobStatus | PENDING / RUNNING / COMPLETED / FAILED |
| totalFound | Int | Anzahl gefundener Rohdaten |
| error | String? | Fehlermeldung bei FAILED |

### Lead
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | cuid | Primärschlüssel |
| companyName | String | Firmenname |
| website | String? | Normalisierte URL |
| email | String? | Normalisierte E-Mail |
| phone | String? | Normalisierte Telefonnummer |
| address | String? | Vollständige Adresse |
| city | String? | Ort |
| category | String? | Branche / Kategorie |
| sourceUrl | String? | Direkte URL des Treffers |
| confidence | Float? | 0–1, berechneter Qualitätsscore |
| status | LeadStatus | NEW / CONTACTED / INTERESTED / NOT_INTERESTED / CONVERTED / INVALID |
| notes | String? | Freitext für Vertriebsnotizen |
| contactedAt | DateTime? | Zeitpunkt der Kontaktaufnahme |
| jobId | String | FK → SearchJob |

## Hauptfluss: Lead-Erfassung

```
User: Suchmaske ausfüllen (query, location, radius, source)
  → POST /api/jobs           (Job anlegen, Status: PENDING)
  → POST /api/jobs/:id/run   (Job starten, fire-and-forget, 202 Accepted)
  → orchestrator.runJob()
      → geocodeLocation()    (Nominatim OSM → lat/lon)
      → scrapeOverpass()     (Overpass API → strukturierte Daten)
      → scrapeGelbeSeiten()  (Cheerio auf gelbeseiten.de, rate-limited)
      → deduplicateLeads()   (Domain + Phone + Name dedup)
      → db.lead.createMany() (Prisma, skipDuplicates)
      → Job Status: COMPLETED
  → UI pollt /api/jobs/:id alle 4s
  → Dashboard zeigt Leads, nach Confidence sortiert
```

## Technologie-Entscheidungen

| Technologie | Begründung |
|-------------|-----------|
| Next.js 16 App Router | Server Components, API Routes, standalone build |
| Prisma 7 + PostgreSQL | Typsicheres ORM, migrations-fähig |
| Overpass API (OSM) | Kostenlos, ToS-konform, strukturierte Daten |
| Gelbe Seiten | Öffentliches Verzeichnis, Cheerio reicht für HTML |
| Playwright | Installiert, bereit für JS-heavy Quellen in Phase 2 |
| ExcelJS | XLSX mit Styling und AutoFilter |
| csv-stringify | Zuverlässig, BOM-Support für Excel |
| Zod | Schema-Validierung für API-Inputs |
| Tailwind CSS 4 | Utility-first, kein schweres Framework |

## Bekannte Architekturentscheide und Grenzen

- **Background Jobs:** Fire-and-forget im Request-Kontext (MVP). Kein BullMQ/Queue. Bei langen Jobs kann das Node-Timeout zuschlagen. Für SaaS-Erweiterung: pg-boss oder BullMQ nachrüsten.
- **Kein Auth:** MVP ist lokal. Auth-Schicht kann über next-auth oder eigene Middleware später ergänzt werden.
- **Rate Limiting:** Gelbe Seiten: 2s Delay pro Seite (konfigurierbar via SCRAPE_DELAY_MS). Overpass hat eingebautes Throttling.
- **Playwright:** Installiert, aber noch kein aktiver Scraper nutzt es. Bereit für JS-gerenderte Quellen.
