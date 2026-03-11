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

---

## Aktive Aufgaben

### [P1] Docker-Daemon starten und Live-Migration anwenden
- **Status:** TODO
- **Problem:** `docker compose up db -d` scheiterte lokal, weil der Docker-Desktop-Daemon nicht verfuegbar war
- **Befehle:**
  ```bash
  docker compose up db -d
  npm run db:migrate
  ```
- **Erwartetes Ergebnis:** PostgreSQL laeuft lokal und die Initial-Migration ist angewendet

### [P1] Authentifizierten Smoke-Test komplett ausfuehren
- **Status:** TODO
- **Schritte:** Register -> Login -> Projekt anlegen -> Suche starten -> Dashboard pruefen -> Export pruefen
- **Erwartetes Ergebnis:** kompletter Kernflow laeuft mit echter DB stabil durch

### [P1] Release-Entscheidung fuer `main` nach Live-DB-Test treffen
- **Status:** TODO
- **Voraussetzungen:** `db:generate`, `lint`, `build`, Live-Migration und Smoke-Test gruen
- **Erwartetes Ergebnis:** dokumentiertes Ja/Nein fuer Promotion nach `main`

### [P2] Session-Freshness bei Plan- oder Statuswechsel pruefen
- **Status:** TODO
- **Problem:** API-Schutz ist DB-authoritativ, das Layout zeigt Session-Daten weiter aus JWT
- **Erwartetes Ergebnis:** Klar dokumentiert, ob Plan-/Deactivate-Aenderungen ohne Re-Login im UI sofort sichtbar sein muessen

### [P2] Export- und Scraper-Smoke-Test gegen echte DB ausfuehren
- **Status:** TODO
- **Schritte:** Suche starten -> Leads pruefen -> CSV/XLSX mit `tag`, `category`, `sourceName` und `listId` testen
- **Erwartetes Ergebnis:** reale Scraper-Ergebnisse und Exporte stimmen mit UI-Filtern und Meta-Infos ueberein

### [P3] Unit Tests fuer Normalizer, Deduplicator und Export-Builder
- **Status:** TODO
- **Dateien:** `lib/parser/normalize.ts`, `lib/scraper/deduplicator.ts`, `lib/export/leadExport.ts`
- **Erwartetes Ergebnis:** Zuverlaessige Tests fuer Randfaelle

### [P3] Suchhistorie / Job-Uebersicht als eigene Seite
- **Status:** TODO
- **Datei:** `app/jobs/page.tsx` (neu)
- **Erwartetes Ergebnis:** Uebersicht aller vergangenen Jobs mit Status und Lead-Anzahl

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
