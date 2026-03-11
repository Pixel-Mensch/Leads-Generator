# TASK_QUEUE.md

## Priority Legend
- P1 - Blocking / sofort erforderlich
- P2 - Hoch, naechste Session
- P3 - Mittel
- P4 - Nice to have / Zukunft

---

## Erledigte Aufgaben

- [2026-03-11] Repo + Control-Dateien initialisiert
- [2026-03-11] .gitignore + README erstellt
- [2026-03-11] Tech-Stack festgelegt (TypeScript, Next.js, Prisma, PostgreSQL, Cheerio)
- [2026-03-11] MVP vollstaendig implementiert: Scraper, Parser, Exporte, API, UI, Docker
- [2026-03-11] .gitignore-Bug behoben (*.json hatte Konfig-Dateien ausgeschlossen)
- [2026-03-11] SaaS Foundation implementiert: User/Project/LeadList, next-auth JWT, Middleware/Proxy, Plan-Limits, Auth-UI, Projekt-UI
- [2026-03-11] Datenqualitaet Session 4: Normalisierung, Confidence-Scoring, Deduplication-Merge, sourceName-Tracking, Export-Verbesserungen
- [2026-03-11] UX Session 5: Tags, Follow-up-Datum, KPI-Bar, Sort, Bulk-Aktionen, Lead-Detail-Ueberarbeitung, Company-Link
- [2026-03-11] Release-Audit dokumentiert: `main` vorerst blockiert
- [2026-03-11] Prisma-7-Setup repariert (`prisma.config.ts`, `@prisma/adapter-pg`, Build-/Lint-Fixes)
- [2026-03-11] Next.js 16 von `middleware.ts` auf `proxy.ts` umgestellt
- [2026-03-11] Initial-Migration erzeugt und versioniert
- [2026-03-11] README auf echten Stack und Startpfad aktualisiert
- [2026-03-11] Dev-Boot lokal geprueft (`GET /login -> HTTP 200`)
- [2026-03-11] SaaS-Audit abgeschlossen: API-Ownership, Listen-Limits, E-Mail-Normalisierung und PENDING-only Job-Start gehaertet
- [2026-03-11] Protected-Page-Redirect real verifiziert (`GET /projects -> 307 /login`)
- [2026-03-11] Kernqualitaet gehaertet: URL-/Firmennamen-Normalisierung, Dedup-Merge und Overpass-Fallback verbessert
- [2026-03-11] Scraper-/Export-Qualitaet gehaertet: Gelbe-Seiten-Live-HTML validiert, Filter-Exporte vervollstaendigt, Confidence-Transparenz verbessert
- [2026-03-11] UX-Dashboard gehaertet: serverseitige Suche, Follow-up-Filter, konsistente KPI-/Export-Kontexte und stabileres Job-Status-Polling
- [2026-03-11] Lead-UX gehaertet: Schnellaktionen in Tabelle/Detailseite, besserer Ruecksprung in Suchlaeufe und sauberere Mobile-Navigation
- [2026-03-11] Docker Desktop lokal gestartet, `docker compose up db -d` erfolgreich ausgefuehrt und Postgres-Container healthy verifiziert
- [2026-03-11] Initial-Migration live gegen lokale Docker-Postgres-DB angewendet und `npm run db:migrate:status` geprueft
- [2026-03-11] Lokaler Kernflow real verifiziert: Register, Credentials-Login, `/api/me`, `/api/projects`, Overpass-Suche mit 50 Leads, CSV/XLSX-Export und authentifizierte Seiten `/`, `/projects`, `/search`
- [2026-03-11] Vollstaendiger Browser-E2E-Kernflow erfolgreich durchlaufen: Register, Login, Projektanlage, Overpass-Suche, Lead-Detailseite, Statuswechsel und gefilterter CSV/XLSX-Export
- [2026-03-11] Kernflow-Formulare fuer echte Browser- und Accessibility-Nutzung gehaertet (`htmlFor`/`id`, `aria-label`)
- [2026-03-11] Playwright-Smoke-Test fuer den Kernworkflow angelegt und lokal gruen ausgefuehrt (`npm run test:e2e:core`)

---

## Aktive Aufgaben

### [P1] Gelbe-Seiten-Quelle erneut als echter Job smoke-testen
- **Status:** TODO
- **Problem:** In dieser Session wurde nur der Overpass-Pfad als kompletter Suchlauf mit echter DB verifiziert
- **Erwartetes Ergebnis:** `source=gelbeseiten` oder `source=both` laeuft ebenfalls nachvollziehbar durch

### [P1] Release-Entscheidung fuer `main` auf Basis des jetzt verifizierten Lokalstarts treffen
- **Status:** TODO
- **Voraussetzungen:** `db:generate`, `lint`, `build`, Live-Migration und lokaler Browser-Kernflow sind gruen; Gelbe-Seiten-Smoke klaert das Restrisiko
- **Erwartetes Ergebnis:** dokumentiertes Ja/Nein fuer Promotion nach `main`

### [P2] Session-Freshness bei Plan- oder Statuswechsel pruefen
- **Status:** TODO
- **Problem:** API-Schutz ist DB-authoritativ, das Layout zeigt Session-Daten weiter aus JWT
- **Erwartetes Ergebnis:** Klar dokumentiert, ob Plan-/Deactivate-Aenderungen ohne Re-Login im UI sofort sichtbar sein muessen

### [P2] Neue Dashboard-Filter im Browser gegen echte DB pruefen
- **Status:** TODO
- **Schritte:** Volltextsuche, Follow-up-Filter, Status-Chips, Export aus gefilterter Ansicht und Job-Status-Polling gegen laufende Daten pruefen
- **Erwartetes Ergebnis:** Filterkontext ist in Tabelle, KPI und Export konsistent

### [P2] Lead-Tabelle und Detailseite breiter gegen echte Daten pruefen
- **Status:** TODO
- **Schritte:** Schnellaktionen, Notizspeicherung, Follow-up morgen, Ruecksprung in Suchlauf und Mobile-Karten gegen echte Leads pruefen
- **Erwartetes Ergebnis:** Demo- und Vertriebsflow fuehlt sich im Browser stabil und klar an

### [P3] Unit Tests fuer Normalizer, Deduplicator und Export-Builder
- **Status:** TODO
- **Dateien:** `lib/parser/normalize.ts`, `lib/scraper/deduplicator.ts`, `lib/export/leadExport.ts`
- **Erwartetes Ergebnis:** Zuverlaessige Tests fuer Randfaelle

### [P3] Suchhistorie / Job-Uebersicht als eigene Seite
- **Status:** TODO
- **Datei:** `app/jobs/page.tsx` (neu)
- **Erwartetes Ergebnis:** Uebersicht aller vergangenen Jobs mit Status und Lead-Anzahl

### [P3] Playwright-Smoke-Test auf weitere Filter- und Fehlerfaelle erweitern
- **Status:** TODO
- **Datei:** `tests/e2e/core-workflow.spec.ts`
- **Erwartetes Ergebnis:** mehr Abdeckung fuer Follow-up, Bulk-Status und Fehlerzustaende

### [P3] Playwright-Scraper fuer JS-gerenderte Quellen
- **Status:** TODO
- **Datei:** `lib/scraper/sources/` (neue Datei)
- **Erwartetes Ergebnis:** Mindestens eine weitere Quelle via Playwright erschlossen

### [P4] Plan-Upgrade Flow (Stripe)
- **Status:** Bewusst zurueckgestellt - Stripe-Felder im Schema vorbereitet
- **Voraussetzung:** Stripe-Account, `STRIPE_SECRET_KEY` in `.env`
- **Erwartetes Ergebnis:** User kann Plan upgraden, Limits werden sofort angewendet

### [P4] Admin-UI
- **Status:** TODO - ADMIN-Rolle im Schema vorhanden, kein UI
- **Erwartetes Ergebnis:** Einfache Admin-Seite mit User-Liste, Plan-Aenderung und `isActive`-Toggle

### [P4] Einladungslogik
- **Status:** TODO
- **Erwartetes Ergebnis:** User kann andere per E-Mail einladen

### [P4] Rate Limiting auf API-Ebene
- **Status:** TODO
- **Erwartetes Ergebnis:** API hat einfaches Rate Limiting per IP

---

## Bewusst nicht umgesetzt (Scope-Entscheidungen)

- Kein Background-Queue-System - fire-and-forget reicht fuer MVP
- Kein komplexes RBAC-Framework - `UserRole` Enum reicht fuer MVP
- Kein Session-Table - JWT reicht fuer MVP + SaaS-Start
- Kein Geocoding / Kartenansicht
- Keine CI/CD Pipeline
