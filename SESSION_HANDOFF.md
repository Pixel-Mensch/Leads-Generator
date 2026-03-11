# SESSION_HANDOFF.md

## Stabilisierungssession (2026-03-11)

### Ergebnis

**`dev` ist jetzt lokal real startbar, der Kernworkflow wurde im Browser voll durchlaufen und liegt als Playwright-Smoke-Test vor. Docker-Postgres, Prisma-Migration, Register/Login, Projektanlage, authentifizierte App-Seiten, ein echter Overpass-Suchlauf mit 50 Leads, Lead-Detailseite, Statuswechsel sowie CSV/XLSX-Export wurden erfolgreich gegen laufende lokale Dienste verifiziert. `main` wurde in dieser Session trotzdem nicht automatisch promoted.**

### Was umgesetzt wurde

**Tooling und Runtime:**
- Prisma 7 auf `prisma.config.ts` umgestellt
- Runtime auf `@prisma/adapter-pg` + `pg` angepasst
- Next.js 16 von `middleware.ts` auf `proxy.ts` umgestellt
- Dockerfile fuer Build-Zeit-Env abgesichert

**Code-Fixes:**
- React-Lint-Fehler in `app/page.tsx` und `app/projects/page.tsx` behoben
- XLSX-Export-Rueckgabe fuer `NextResponse` typkorrigiert
- `requireAuth()` liest User-Status jetzt aus der DB statt nur aus dem JWT
- Login und Registrierung normalisieren E-Mail-Adressen
- Listen-Limits werden serverseitig erzwungen
- Lead-Listen-Zuordnung ist auf das eigene Projekt begrenzt
- Job-Starts sind nur noch aus `PENDING` moeglich
- Scraper respektiert echte Plan-Limits fuer Leads pro Job
- Protected Pages leiten jetzt real auf `/login` um
- Search-/Project-UI zeigen Limit- und Fehlerfeedback
- URL-, Firmennamen- und Vergleichsnormalisierung wurden fuer reale Konfliktfaelle gehaertet
- Dedup-Merge behaelt reichere Kontaktfelder, kombiniert Quellen nachvollziehbar und aktualisiert Schluessel nach Merges korrekt
- Overpass-Freitext-Fallback escaped Regex sauberer, und DB-Dedup nutzt jetzt normalisierte Name+Ort-Keys
- Gelbe-Seiten-Scraper wurde gegen reales Live-HTML validiert und liest jetzt Base64-Website-Links, eingebettete JSON-Kontaktdaten, robustere Detail-URLs und kompakte Adressbloecke
- CSV- und XLSX-Exporte uebernehmen jetzt `listId`, `tag`, `category` und `sourceName` konsistent als Filter
- Exporte zeigen jetzt Kontaktkanaele, Confidence-Signale und Confidence-Warnungen fuer bessere Nachvollziehbarkeit
- `sourceName`-Filter in Lead- und Export-APIs matchen jetzt auch kombinierte deduplizierte Quellenwerte
- Dashboard hat jetzt serverseitige Volltextsuche, Follow-up-Filter, klarere Fehlerzustaende, bessere Paginationsnavigation und filterkonsistente KPI-/Export-Kontexte
- `JobStatus` pollt jetzt bis zum terminalen Status und veraltet nicht mehr nach dem ersten Laden
- Lead-Tabelle zeigt jetzt klarere Kontakt-Schnellaktionen, Follow-up-Badges und bessere Inline-Fehler fuer Status-/Notiz-Aenderungen
- Lead-Detailseite hat jetzt Vertriebs-Schnellaktionen (`kontaktiert`, `Follow-up morgen`, Kontakt-/Quelllinks) und einen Ruecksprung in den Suchlauf
- Top-Navigation und User-Bereich umbrechen auf Mobile sauberer
- Login-, Register- und Suchformulare verknuepfen Labels jetzt korrekt mit Inputs
- Projekt- und Listenanlage wurden mit `aria-label` fuer stabile Browser- und Accessibility-Nutzung nachgeschaerft
- `playwright.config.ts` und `tests/e2e/core-workflow.spec.ts` angelegt
- `npm run test:e2e:core` in `package.json` hinterlegt
- `.gitignore` um `playwright-report/` und `test-results/` erweitert
- Playwright startet die App fuer `npm run test:e2e:core` jetzt selbst ueber `webServer`

**DB / Ops:**
- Initial-Migration erzeugt: `prisma/migrations/20260311081500_init/migration.sql`
- `migration_lock.toml` angelegt
- `db:migrate:deploy` und `db:migrate:status` in `package.json` ergaenzt
- Compose-Warnung bereinigt (`version` entfernt)
- `.env.example` auf echten globalen Scrape-Cap gebracht
- Docker Desktop lokal gestartet und `docker compose up db -d` erfolgreich ausgefuehrt
- `npm run db:migrate` erfolgreich gegen die lokale Docker-Postgres-DB ausgefuehrt
- `npm run db:migrate:status` meldet `Database schema is up to date`

**Doku:**
- README auf echten Stack, echte SaaS-Schutzpfade und echten Startpfad gebracht
- PROJECT_STATE, TASK_QUEUE, ARCHITECTURE und Copilot-Instruktionen synchronisiert

### Reale Verifikation

- `npm run db:generate` -> erfolgreich
- `docker compose up db -d` -> erfolgreich, `db`-Container healthy auf `localhost:5432`
- `npm run db:migrate` -> erfolgreich
- `npm run db:migrate:status` -> erfolgreich
- `npm run lint` -> erfolgreich
- `npm run build` -> erfolgreich
- `docker compose config` -> erfolgreich
- Dev-Boot-Test -> `GET /login` lieferte `HTTP 200`
- Protected-Route-Test -> `GET /projects` lieferte `307 -> /login?...`
- Register-Smoke -> `POST /api/register` erfolgreich, Default-Projekt automatisch angelegt
- Login-Smoke -> Auth.js Credentials-Login erfolgreich, `/api/auth/session` liefert Session
- Auth-API-Smoke -> `/api/me` und `/api/projects` erfolgreich gegen echte Session
- Authentifizierte Seiten -> `/`, `/projects` und `/search` liefern `HTTP 200`
- Overpass-Smoke -> echter Job auf `COMPLETED`, 50 Leads gespeichert
- Browser-E2E-Smoke -> Register, Login, Projektanlage, Suche, Lead-Detailseite, Statuswechsel und gefilterte Exporte erfolgreich
- `npm run test:e2e:core` -> erfolgreich
- `npm run test:e2e:core` ohne manuell gestartete App -> erfolgreich
- Export-Smoke -> `/api/export/csv` und `/api/export/xlsx` liefern `HTTP 200` gegen den echten Job-Bestand
- Offline-Migrationscheck -> frisch generierter Empty->Schema-Diff stimmt mit der committed Migration ueberein
- Live-HTML-Check fuer Gelbe Seiten -> reales Suchergebnis enthielt die jetzt verwendeten `data-webseitelink`, `data-parameters`, `data-detailseiteurl` und `.mod-AdresseKompakt__adress-text` Pfade
- Neue Dashboard-Filterlogik (`q`, `followUp`) sowie Export-/Stats-Pfade sind build-, lint- und Prisma-generate-verifiziert
- Lead-Tabelle, Detailseite und Navigation sind build-, lint- und Prisma-generate-verifiziert

### Nicht erfolgreich bzw. noch offen

- Gelbe-Seiten-Quelle wurde in dieser Session nicht erneut als kompletter Suchjob verifiziert
- Keine breite Test-Suite vorhanden; aktuell nur der neue Kernworkflow-Smoke-Test

---

## Aktueller Repo-Stand

- **Branch:** `dev`
- **Remote-Status:** `origin/dev` steht bei `481e362`; diese Session fuegt dazu neue lokale Verifikations- und Doku-Aenderungen hinzu
- **Relevante neue Commits auf `dev`:**
  - `a59d27d` - `fix: sharpen dashboard lead workflow`
  - `e0180ed` - `fix: improve lead action surfaces`
  - `80c583b` - `docs: refresh ux handoff state`
  - `481e362` - `docs: note dev push state`
  - Vorherige Stabilisierung darunter: Prisma-/Build-Reparatur, SaaS-Haertung sowie Scraper-/Export-Qualitaetsfixes
- **Relevanter `main`-Stand:** `c1a2276`
- **Status von `main`:** nicht freigegeben

---

## Was als naechstes getan werden muss

1. Gelbe-Seiten-Quelle als echten Job erneut smoke-testen
2. Danach Release-Entscheidung fuer `main` explizit treffen
3. Optional: Smoke-Test um Follow-up-, Bulk- und Fehlerpfade erweitern

---

## Relevante Dateien fuer die naechste Session

| Datei | Warum relevant |
|-------|----------------|
| `prisma.config.ts` | Prisma-7-CLI-Konfiguration |
| `lib/db.ts` | Prisma-Adapter fuer PostgreSQL |
| `proxy.ts` | Next.js 16 Schutzpfad fuer App-Seiten |
| `lib/session.ts` | DB-authoritative API-Auth |
| `lib/limits.ts` | SaaS-Limits fuer Jobs, Projekte, Listen und Leads |
| `prisma/migrations/20260311081500_init/migration.sql` | Initiale Datenbankmigration |
| `docker-compose.yml` | lokaler Postgres-Start |
| `README.md` | aktueller Start- und Verifikationspfad |
| `lib/scraper/sources/gelbeseiten.ts` | live-validierte Gelbe-Seiten-Heuristiken |
| `lib/export/leadExport.ts` | Export-View, Kontaktkanaele und Confidence-Transparenz |
| `lib/leads/filters.ts` | gemeinsamer Filterkontext fuer Leads, KPI und Export |
| `components/leads/LeadsTable.tsx` | Schnellaktionen, Mobile-Karten und Inline-Arbeitsflaeche |
| `app/leads/[id]/page.tsx` | Detailseite fuer taegliche Vertriebsarbeit |

---

## Warnungen und bekannte Grenzfaelle

- `.env` wurde lokal fuer die Verifikation angelegt und ist nicht committed
- Die lokale Docker-DB enthaelt jetzt Smoke-Daten (ein Test-User, Default-Projekt und ein Overpass-Job mit 50 Leads)
- `.claude/settings.local.json` ist weiterhin lokal modifiziert und wurde bewusst nicht angeruehrt
- `main` sollte erst nach einer expliziten Release-Entscheidung und idealerweise einem kurzen Browser-Smoke-Test aktualisiert werden
