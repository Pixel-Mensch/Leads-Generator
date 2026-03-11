# SESSION_HANDOFF.md

## Was in dieser Session umgesetzt wurde (2026-03-11, Session 2)

### Vollständiger MVP-Stack implementiert auf `dev`:

**Infrastruktur:**
- Next.js 16 App Router Projekt initialisiert (TypeScript, Tailwind CSS 4)
- Prisma Schema: `SearchJob` + `Lead` + Enums (`JobStatus`, `LeadStatus`)
- Docker Compose: PostgreSQL 16 + App Container
- Multi-Stage Dockerfile (Node 20 Alpine, standalone output)
- `.env.example` mit allen konfigurierbaren Variablen
- `package.json` mit DB-Scripts (`db:generate`, `db:migrate`, `db:push`, `db:studio`)
- `next.config.ts` mit standalone output für Docker

**Scraping & Daten:**
- `lib/scraper/sources/overpass.ts` — Overpass API (OpenStreetMap, kostenlos, ToS-konform)
  - Geocoding via Nominatim, dynamisches OSM-Tagging (amenity/shop/office/tourism)
  - 20+ vordefinierte Kategorie-Mappings (DE)
- `lib/scraper/sources/gelbeseiten.ts` — Cheerio-basierter Scraper für gelbeseiten.de
  - Rate-Limiting (SCRAPE_DELAY_MS konfigurierbar, default 2000ms)
- `lib/scraper/orchestrator.ts` — Job-Runner (PENDING → RUNNING → COMPLETED/FAILED)
- `lib/scraper/deduplicator.ts` — Deduplizierung nach Domain, Phone, Name
- `lib/parser/normalize.ts` — Normalisierung Phone (+49), URL (https), Email, Confidence Score

**API-Routen:**
- `POST /api/jobs` — Job erstellen (zod-validiert)
- `GET /api/jobs` — Job-Liste mit Lead-Count
- `GET /api/jobs/:id` — Job-Status
- `DELETE /api/jobs/:id` — Job löschen (cascade)
- `POST /api/jobs/:id/run` — Job starten (fire-and-forget, 202)
- `GET /api/leads` — Lead-Liste (paginiert, filterbar nach jobId + status)
- `GET /api/leads/:id` — Lead-Detail inkl. Job
- `PATCH /api/leads/:id` — Status, Notizen, contactedAt updaten
- `DELETE /api/leads/:id` — Lead löschen
- `GET /api/export/csv` — CSV Download (UTF-8 BOM für Excel)
- `GET /api/export/xlsx` — XLSX Download (ExcelJS, Styling, AutoFilter)

**UI:**
- `app/page.tsx` — Dashboard: Lead-Liste, Status-Filter-Chips, Paginierung, CSV/XLSX-Buttons
- `app/search/page.tsx` — Suchmaske (Branche, Ort, Radius, Quelle)
- `app/leads/[id]/page.tsx` — Lead-Detailseite mit Notiz-Editor und Status-Dropdown
- `components/leads/LeadsTable.tsx` — Responsive Tabelle (Desktop) + Card-Liste (Mobile)
  - Inline-Status-Änderung, Inline-Notiz-Editor
- `components/leads/JobStatus.tsx` — Job-Statusbanner mit Auto-Refresh

**Bug-Fix:**
- `.gitignore` hatte `*.json` global ausgeschlossen → `package.json`, `tsconfig.json`, `package-lock.json` waren nicht trackbar. Behoben: nur `output/*.json` und `data/*.json` ausgeschlossen.

---

## Was bewusst NICHT umgesetzt wurde

- Kein Auth / Benutzerverwaltung (lokales MVP)
- Kein Background-Queue (BullMQ/pg-boss) — fire-and-forget für MVP ausreichend
- Kein Playwright-aktiver Scraper (installiert, aber kein Source nutzt es)
- Kein Geocoding / Kartenbezug
- Keine CI/CD Pipeline
- Keine Unit Tests (Normalizer und Deduplicator sind testbereit, aber Tests fehlen)
- Kein Link von LeadsTable → Lead-Detail (Detailseite existiert, Verlinkung fehlt noch)

---

## Aktueller Repo-Stand

- **Branch:** `dev`
- **Commits auf dev:** 2 (Control-Files, README/.gitignore)
- **Ungetrackt (bereit für Commit):** Gesamter MVP-Code
- **Build:** Noch nicht ausgeführt — `npm run build` steht aus
- **DB:** Noch nicht gestartet — `docker compose up db` + Migration stehen aus
- **Tests:** Keine

---

## Was als nächstes getan werden muss

**Priorität 1 — vor Produktivbetrieb zwingend:**

1. `npm run build` ausführen → TypeScript-Fehler finden und beheben
2. `.env` aus `.env.example` anlegen, Docker starten:
   ```bash
   cp .env.example .env
   docker compose up db -d
   npm run db:migrate
   ```
3. `npm run dev` starten, erste Suche in der UI testen
4. Ergebnis prüfen: Landen Leads in der DB? Export korrekt?

**Priorität 2 — nach erstem erfolgreichen Test:**

5. Gelbe Seiten Selektoren live validieren
6. Lead-Detail-Link aus der Tabelle ergänzen ([id]/page.tsx ist fertig, nur Link fehlt)
7. README Setup-Anleitung vervollständigen

---

## Relevante Dateien für die nächste Session

| Datei | Warum relevant |
|-------|---------------|
| [lib/scraper/sources/overpass.ts](lib/scraper/sources/overpass.ts) | Erste zu testende Scraping-Quelle |
| [lib/scraper/sources/gelbeseiten.ts](lib/scraper/sources/gelbeseiten.ts) | Selektoren validieren |
| [prisma/schema.prisma](prisma/schema.prisma) | Migration ausführen |
| [components/leads/LeadsTable.tsx](components/leads/LeadsTable.tsx) | Detail-Link ergänzen |
| [app/page.tsx](app/page.tsx) | Dashboard-Verhalten im Live-Test prüfen |

---

## Warnungen und Annahmen

- **Build nicht getestet:** TypeScript-Kompilierungsfehler sind möglich (insbesondere Prisma-Typen vor `prisma generate`).
- **Prisma generate:** Muss vor dem Build ausgeführt werden, da `@prisma/client` generierte Typen braucht. Script: `npm run db:generate`.
- **Zod 4:** Die Zod-API (v4) unterscheidet sich leicht von v3. Falls Fehler auftreten, prüfe ob `.safeParse`, `.flatten()` etc. korrekt aufgerufen werden.
- **Gelbe Seiten:** HTML-Struktur der Seite kann sich jederzeit ändern. Selektoren sind heuristisch — leere Ergebnisse sind möglich.
- **Playwright nicht aktiv:** Installiert aber nicht verwendet. Beim nächsten `npm install` wird `playwright install` für Browser-Binaries benötigt, falls Playwright-Scraper gebaut werden.
- **Keine Secrets im Repo:** `.env` ist in `.gitignore`. Nie `.env` committen.
