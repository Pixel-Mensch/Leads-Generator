# TASK_QUEUE.md

## Priority Legend
- P1 — Blocking / sofort erforderlich
- P2 — Hoch, nächste Session
- P3 — Mittel
- P4 — Nice to have / Zukunft

---

## Erledigte Aufgaben

- [2026-03-11] Repo + Control-Dateien initialisiert
- [2026-03-11] .gitignore + README erstellt
- [2026-03-11] Tech-Stack festgelegt (TypeScript, Next.js, Prisma, PostgreSQL, Cheerio)
- [2026-03-11] MVP vollständig implementiert: Scraper, Parser, Exporte, API, UI, Docker
- [2026-03-11] .gitignore-Bug behoben (*.json hatte Konfig-Dateien ausgeschlossen)
- [2026-03-11] SaaS Foundation implementiert: User/Project/LeadList, next-auth JWT, Middleware, Plan-Limits, Auth-UI, Projekt-UI
- [2026-03-11] Datenqualität Session 4: Normalisierung, Confidence-Scoring, Deduplication-Merge, sourceName-Tracking, Export-Verbesserungen
- [2026-03-11] UX Session 5: Tags, Follow-up-Datum, KPI-Bar, Sort, Bulk-Aktionen, Lead-Detail-Überarbeitung, Company-Link

---

## Aktive Aufgaben

### [P1] AUTH_SECRET in .env setzen
- **Status:** TODO — App startet nicht ohne diesen Wert
- **Befehl:** `openssl rand -base64 32` → in .env als AUTH_SECRET eintragen
- **Datei:** .env (nicht committen!)

### [P1] Build-Test ausführen und TypeScript-Fehler beheben
- **Status:** TODO — zwingend vor Produktivbetrieb
- **Befehl:** `npm run db:generate && npm run build`
- **Bekannte Risiken:** next-auth v5 beta API, Zod v4 (flatten-Aufrufe), Prisma generierte Typen
- **Erwartetes Ergebnis:** Build durchläuft ohne Fehler

### [P1] Datenbank starten und Migration ausführen
- **Status:** TODO
- **Befehle:**
  ```bash
  cp .env.example .env        # Werte anpassen (AUTH_SECRET, DATABASE_URL)
  docker compose up db -d
  npm run db:migrate
  ```
- **Dateien:** prisma/schema.prisma, .env
- **Hinweis:** Schema hat neue Non-Null FKs (User, Project, LeadList) — Migration sorgfältig testen bei existierenden Daten
- **Erwartetes Ergebnis:** PostgreSQL läuft, alle Tabellen existieren inkl. User/Project/LeadList

### [P1] Erste echte Suche als eingeloggter User testen
- **Status:** TODO
- **Schritte:** Registrieren → Login → Projekt anlegen → Suche starten → Ergebnis prüfen
- **Erwartetes Ergebnis:** Leads erscheinen user-scoped in der UI, Export funktioniert

### [P2] Gelbe Seiten Selektoren validieren
- **Status:** TODO
- **Datei:** lib/scraper/sources/gelbeseiten.ts
- **Problem:** Cheerio-Selektoren sind heuristisch, können brechen
- **Erwartetes Ergebnis:** Reale Ergebnisse aus gelbeseiten.de, oder Selektoren angepasst

### [P2] UI: Confidence-Tier in LeadsTable anzeigen
- **Status:** TODO
- **Datei:** components/leads/LeadsTable.tsx
- **Erwartetes Ergebnis:** HIGH/MEDIUM/LOW Badge neben dem Firmennamen oder in eigener Spalte

### [P2] Lead-Detail-Link aus der Tabelle ergänzen
- **Status:** TODO
- **Datei:** components/leads/LeadsTable.tsx
- **Problem:** /leads/[id] existiert, aber kein Link aus der Tabelle heraus
- **Erwartetes Ergebnis:** Klick auf Firmenname öffnet /leads/:id

### [P2] README Setup-Anleitung aktualisieren
- **Status:** TODO
- **Datei:** README.md
- **Inhalt:** AUTH_SECRET generieren, Registration-Flow, docker compose up, npm run dev

### [P3] Playwright-Scraper für JS-gerenderte Quellen
- **Status:** TODO
- **Datei:** lib/scraper/sources/ (neue Datei)
- **Erwartetes Ergebnis:** Mindestens eine weitere Quelle via Playwright erschlossen

### [P3] Unit Tests für Normalizer und Deduplicator
- **Status:** TODO
- **Dateien:** lib/parser/normalize.ts, lib/scraper/deduplicator.ts
- **Erwartetes Ergebnis:** Zuverlässige Tests, die Randfälle abdecken

### [P3] Suchhistorie / Job-Übersicht als eigene Seite
- **Status:** TODO
- **Datei:** app/jobs/page.tsx (neu)
- **Erwartetes Ergebnis:** Übersicht aller vergangenen Jobs mit Status und Lead-Anzahl

### [P4] Plan-Upgrade Flow (Stripe)
- **Status:** Bewusst zurückgestellt — Stripe-Felder im Schema vorbereitet
- **Voraussetzung:** Stripe-Account, STRIPE_SECRET_KEY in .env
- **Erwartetes Ergebnis:** User kann Plan upgraden, Limits werden sofort angewendet

### [P4] Admin-UI
- **Status:** TODO — ADMIN-Rolle im Schema vorhanden, kein UI
- **Erwartetes Ergebnis:** Einfache Admin-Seite: User-Liste, Plan-Änderung, isActive toggle

### [P4] Einladungslogik
- **Status:** TODO
- **Erwartetes Ergebnis:** User kann andere per E-Mail einladen (Team-Feature)

### [P4] Rate Limiting auf API-Ebene
- **Status:** TODO
- **Erwartetes Ergebnis:** API hat einfaches Rate Limiting per IP (zusätzlich zu Plan-Limits)

---

## Bewusst nicht umgesetzt (Scope-Entscheidungen)

- Kein Background-Queue (BullMQ/pg-boss) — fire-and-forget reicht für MVP
- Kein komplexes RBAC-Framework — UserRole enum reicht für MVP
- Kein Session-Table — JWT reicht für MVP + SaaS-Start
- Kein Geocoding / Kartenansicht
- Keine CI/CD Pipeline
