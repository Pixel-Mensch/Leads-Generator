# PROJECT_STATE.md

## Projektzweck
**Leads Scraper** — Lokal nutzbares MVP eines B2B Lead Generators.
Sammelt öffentlich auffindbare Unternehmensdaten (Firmenname, Website, E-Mail, Telefon, Adresse, Branche) anhand von Branche, Ort und Radius. Speichert strukturiert in PostgreSQL, stellt Vertriebsstatus und CSV/XLSX-Export bereit.

## Aktueller Stand (2026-03-11)

**Phase 1 MVP: Code vollständig implementiert. Noch nicht produktiv getestet (Build + DB stehen aus).**

## Tech Stack

| Technologie | Version | Status |
|-------------|---------|--------|
| Next.js App Router | 16.1.6 | initialisiert |
| TypeScript | 5.x | aktiv |
| Tailwind CSS | 4.x | aktiv |
| Prisma ORM | 7.x | Schema definiert, Migration ausstehend |
| PostgreSQL | 16 | Docker Compose bereit, DB noch nicht gestartet |
| Cheerio | 1.x | aktiv (Gelbe Seiten Scraper) |
| Playwright | 1.x | installiert, noch kein aktiver Scraper |
| ExcelJS | 4.x | aktiv (XLSX Export) |
| csv-stringify | 6.x | aktiv (CSV Export) |
| Zod | 4.x | aktiv (API Validation) |

## Implementierte Module

| Modul | Datei(en) | Status |
|-------|-----------|--------|
| Datenmodell | prisma/schema.prisma | fertig |
| DB Client | lib/db.ts | fertig |
| Overpass Scraper (OSM) | lib/scraper/sources/overpass.ts | fertig |
| Gelbe Seiten Scraper | lib/scraper/sources/gelbeseiten.ts | fertig |
| Job Orchestrator | lib/scraper/orchestrator.ts | fertig |
| Deduplizierung | lib/scraper/deduplicator.ts | fertig |
| Normalizer (Phone, URL, Email) | lib/parser/normalize.ts | fertig |
| CSV Export | lib/export/csv.ts | fertig |
| XLSX Export | lib/export/xlsx.ts | fertig |
| API: Jobs CRUD | app/api/jobs/ | fertig |
| API: Leads CRUD | app/api/leads/ | fertig |
| API: Export | app/api/export/ | fertig |
| UI: Dashboard / Lead-Liste | app/page.tsx | fertig |
| UI: Suchmaske | app/search/page.tsx | fertig |
| UI: Lead-Detailseite | app/leads/[id]/page.tsx | fertig |
| UI: LeadsTable (responsive) | components/leads/LeadsTable.tsx | fertig |
| UI: JobStatus mit Auto-Poll | components/leads/JobStatus.tsx | fertig |
| Docker Setup | docker-compose.yml, Dockerfile | fertig |

## Abgeschlossene Arbeit

- [2026-03-11] Repo + Git-Workflow initialisiert
- [2026-03-11] .gitignore-Bug behoben: `*.json` hatte package.json/tsconfig.json ausgeschlossen
- [2026-03-11] Vollständiger MVP-Stack implementiert (Session 2)

## Bekannte Probleme / Lücken

- Prisma Migration noch nicht ausgeführt — DB läuft noch nicht
- `npm run build` noch nicht ausgeführt — TypeScript-Fehler möglich
- Gelbe Seiten Selektoren heuristisch — können bei HTML-Änderungen brechen
- Kein Test-Suite
- Background Jobs laufen im Request-Kontext (fire-and-forget) — kein persistenter Queue

## Aktuelle Risiken

- Gelbe Seiten scraping: respektvoll und rate-limited, aber ToS im Auge behalten
- OSM Datenlücken: kleine Unternehmen oft nicht in OpenStreetMap gepflegt
- Noch nicht produktiv validiert — Build-Test ist zwingend nächster Schritt
