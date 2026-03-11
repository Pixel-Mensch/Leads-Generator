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

---

## Aktive Aufgaben

### [P1] Build-Test ausführen und TypeScript-Fehler beheben
- **Status:** TODO — zwingend vor Produktivbetrieb
- **Befehl:** `npm run build`
- **Dateien:** Alle lib/, app/, components/ Dateien
- **Erwartetes Ergebnis:** Build durchläuft ohne Fehler
- **Blocker:** Keine — kann sofort ausgeführt werden

### [P1] Datenbank starten und Migration ausführen
- **Status:** TODO
- **Befehle:**
  ```bash
  cp .env.example .env        # und Werte anpassen
  docker compose up db -d
  npm run db:migrate
  ```
- **Dateien:** prisma/schema.prisma, .env
- **Erwartetes Ergebnis:** PostgreSQL läuft, Tabellen existieren

### [P1] Erste echte Suche testen
- **Status:** TODO
- **Schritte:** App starten (`npm run dev`), Suche "Restaurant" in "Berlin", Ergebnis prüfen
- **Dateien:** lib/scraper/sources/overpass.ts
- **Erwartetes Ergebnis:** Leads erscheinen in der UI, Export funktioniert

### [P2] Gelbe Seiten Selektoren validieren
- **Status:** TODO
- **Datei:** lib/scraper/sources/gelbeseiten.ts
- **Problem:** Cheerio-Selektoren sind heuristisch, können brechen
- **Erwartetes Ergebnis:** Reale Ergebnisse aus gelbeseiten.de, oder Selektoren angepasst

### [P2] Playwright-Scraper für JS-gerenderte Quellen
- **Status:** TODO
- **Datei:** lib/scraper/sources/ (neue Datei)
- **Erwartetes Ergebnis:** Mindestens eine weitere Quelle via Playwright erschlossen

### [P3] Unit Tests für Normalizer und Deduplicator
- **Status:** TODO
- **Dateien:** lib/parser/normalize.ts, lib/scraper/deduplicator.ts
- **Erwartetes Ergebnis:** Zuverlässige Tests, die Randfälle abdecken

### [P3] README aktualisieren (Setup-Anleitung fertigstellen)
- **Status:** TODO
- **Datei:** README.md
- **Erwartetes Ergebnis:** Vollständige Anleitung für lokales Setup inkl. Docker

### [P3] Suchhistorie / Job-Übersicht als eigene Seite
- **Status:** TODO
- **Datei:** app/jobs/page.tsx (neu)
- **Erwartetes Ergebnis:** Übersicht aller vergangenen Jobs mit Status und Lead-Anzahl

### [P3] Lead-Detail-Link aus der Tabelle
- **Status:** TODO
- **Datei:** components/leads/LeadsTable.tsx
- **Problem:** Detailseite existiert, aber noch kein Link aus der Tabelle heraus
- **Erwartetes Ergebnis:** Klick auf Firmenname öffnet /leads/:id

### [P4] Playwright Headless für captcha-freie dynamische Seiten
- **Status:** Bereit für Implementierung wenn Bedarf besteht
- **Hinweis:** Nur für Quellen ohne Captcha/Anti-Bot, ethisch vertretbar

### [P4] Rate Limiting auf API-Ebene
- **Status:** TODO — für SaaS-Vorbereitung
- **Erwartetes Ergebnis:** API hat einfaches Rate Limiting (z.B. per IP)

### [P4] Auth / Zugriffsschutz
- **Status:** TODO — nicht für lokales MVP nötig
- **Erwartetes Ergebnis:** Einfacher Passwortschutz oder next-auth für SaaS-Ausbau

---

## Bewusst nicht umgesetzt (MVP-Scope)

- Keine Benutzerverwaltung / Multi-Tenant
- Keine Abrechnung / SaaS-Logik
- Kein komplexes Queue-System (pg-boss / BullMQ) — fire-and-forget reicht für MVP
- Kein Geocoding / Kartenansicht (vorbereitet, aber nicht implementiert)
- Keine CI/CD Pipeline
