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
- [2026-03-11] SaaS Foundation implementiert: User/Project/LeadList, next-auth JWT, Middleware, Plan-Limits, Auth-UI, Projekt-UI
- [2026-03-11] Datenqualitaet Session 4: Normalisierung, Confidence-Scoring, Deduplication-Merge, sourceName-Tracking, Export-Verbesserungen
- [2026-03-11] UX Session 5: Tags, Follow-up-Datum, KPI-Bar, Sort, Bulk-Aktionen, Lead-Detail-Ueberarbeitung, Company-Link
- [2026-03-11] Release-Audit durchgefuehrt: Promotion nach `main` nicht freigegeben

---

## Aktive Aufgaben

### [P1] Prisma 7 Konfiguration releasefaehig machen
- **Status:** TODO - `npm run db:generate` scheitert aktuell mit `P1012`
- **Problem:** `datasource.url = env("DATABASE_URL")` in `prisma/schema.prisma` ist mit Prisma 7 in dieser Form nicht mehr zulaessig
- **Dateien:** `prisma/schema.prisma`, neue `prisma.config.ts`, ggf. `lib/db.ts`
- **Erwartetes Ergebnis:** `npm run db:generate` laeuft wieder erfolgreich und generiert `.prisma/client`

### [P1] Build und Lint wieder gruen herstellen
- **Status:** TODO - aktueller Release-Blocker
- **Build-Fehler:** `npm run build` scheitert an `@prisma/client/default` -> `.prisma/client/default`
- **Lint-Fehler:** `react-hooks/set-state-in-effect` in `app/page.tsx` und `app/projects/page.tsx`
- **Erwartetes Ergebnis:** `npm run lint` und `npm run build` laufen ohne Fehler durch

### [P1] Auth-/Middleware-Laufzeitpfad unter Next.js 16 validieren
- **Status:** TODO - Build-Trace zeigt `middleware.ts -> lib/auth.ts -> lib/db.ts`
- **Problem:** Prisma im Auth-Pfad kann im Edge/Proxy-Kontext zusaetzliche Laufzeitprobleme verursachen, auch nach erfolgreicher Generierung
- **Dateien:** `middleware.ts`, `lib/auth.ts`, `lib/db.ts`
- **Erwartetes Ergebnis:** Auth-Schutz funktioniert in Produktion ohne Edge/Prisma-Inkompatibilitaet

### [P1] AUTH_SECRET in .env setzen
- **Status:** TODO - App startet nicht ohne diesen Wert
- **Befehl:** `openssl rand -base64 32` -> in `.env` als `AUTH_SECRET` eintragen
- **Datei:** `.env` (nicht committen)

### [P1] Build-Test erneut ausfuehren und Release-Gate schliessen
- **Status:** TODO - nach Prisma-/Lint-Fix erneut ausfuehren
- **Befehl:** `npm run db:generate && npm run build && npm run lint`
- **Bekannte Risiken:** next-auth v5 beta API, Zod v4, Prisma generierte Typen, Edge/Proxy Auth-Pfad
- **Aktueller Befund:** `db:generate`, `build` und `lint` sind nicht releasefaehig
- **Erwartetes Ergebnis:** Alle drei Befehle laufen ohne Fehler

### [P1] Datenbank starten und Migration ausfuehren
- **Status:** TODO
- **Befehle:**
  ```bash
  cp .env.example .env
  docker compose up db -d
  npm run db:migrate
  ```
- **Dateien:** `prisma/schema.prisma`, `.env`
- **Hinweis:** Schema hat neue FKs und neue Lead-Felder - Migration sorgfaeltig mit echten Daten pruefen
- **Erwartetes Ergebnis:** PostgreSQL laeuft, alle Tabellen existieren inkl. User/Project/LeadList

### [P1] Erste echte Suche als eingeloggter User testen
- **Status:** TODO
- **Schritte:** Registrieren -> Login -> Projekt anlegen -> Suche starten -> Ergebnis pruefen
- **Erwartetes Ergebnis:** Leads erscheinen user-scoped in der UI, Export funktioniert

### [P2] Gelbe Seiten Selektoren validieren
- **Status:** TODO
- **Datei:** `lib/scraper/sources/gelbeseiten.ts`
- **Problem:** Cheerio-Selektoren sind heuristisch und koennen brechen
- **Erwartetes Ergebnis:** Reale Ergebnisse aus gelbeseiten.de oder angepasste Selektoren

### [P2] README Setup-Anleitung aktualisieren
- **Status:** TODO
- **Datei:** `README.md`
- **Inhalt:** AUTH_SECRET generieren, Registration-Flow, docker compose up, npm run dev

### [P3] Unit Tests fuer Normalizer und Deduplicator
- **Status:** TODO
- **Dateien:** `lib/parser/normalize.ts`, `lib/scraper/deduplicator.ts`
- **Erwartetes Ergebnis:** Zuverlaessige Tests, die Randfaelle abdecken

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
- **Erwartetes Ergebnis:** Einfache Admin-Seite: User-Liste, Plan-Aenderung, `isActive` toggle

### [P4] Einladungslogik
- **Status:** TODO
- **Erwartetes Ergebnis:** User kann andere per E-Mail einladen (Team-Feature)

### [P4] Rate Limiting auf API-Ebene
- **Status:** TODO
- **Erwartetes Ergebnis:** API hat einfaches Rate Limiting per IP (zusaetzlich zu Plan-Limits)

---

## Bewusst nicht umgesetzt (Scope-Entscheidungen)

- Kein Background-Queue-System - fire-and-forget reicht fuer MVP
- Kein komplexes RBAC-Framework - `UserRole` Enum reicht fuer MVP
- Kein Session-Table - JWT reicht fuer MVP + SaaS-Start
- Kein Geocoding / Kartenansicht
- Keine CI/CD Pipeline
