# Leads Scraper

B2B Lead Generator auf Next.js 16 mit Auth, Projekten, Lead-Listen, Scraping, CRM-artigem Lead-Workflow und CSV/XLSX-Export.

## Aktueller Verifikationsstand

- `docker compose up db -d` laeuft lokal; der `db`-Container ist healthy auf `localhost:5432`
- `npm run db:generate` laeuft
- `npm run db:migrate` laeuft gegen die lokale Docker-Postgres-Instanz
- `npm run db:migrate:status` meldet `Database schema is up to date`
- `npm run lint` laeuft
- `npm run build` laeuft
- Dev-Server-Boot wurde lokal geprueft: `GET /login -> HTTP 200`
- Protected-Route-Redirect wurde lokal geprueft: `GET /projects -> 307 /login?...`
- Auth-Flow wurde lokal geprueft: `POST /api/register`, Auth.js Credentials-Login, `GET /api/me`, `GET /api/projects`
- Kernflow wurde lokal geprueft: authentifizierte Seiten `GET / -> 200`, `GET /projects -> 200`, `GET /search -> 200`
- Vollstaendiger Browser-E2E-Kernflow wurde lokal geprueft: Register -> Login -> Projekt anlegen -> Suche starten -> Leads anzeigen -> Lead-Detail -> Statuswechsel -> CSV/XLSX Export
- Overpass-Suche wurde lokal geprueft: ein echter Job lief auf `COMPLETED` und speicherte 50 Leads
- CSV- und XLSX-Export wurden lokal geprueft: beide Routen antworteten mit `HTTP 200` gegen echte Lead-Daten
- Reproduzierbarer Playwright-Smoke-Test fuer den Kernworkflow ist vorhanden und lief lokal gruen
- `docker compose config` ist valide
- Eine Initial-Migration liegt in `prisma/migrations/20260311081500_init`
- Zentrale Formulare im Kernflow wurden fuer echte Browser- und Accessibility-Nutzung nachgeschaerft: Labels sind jetzt programmatisch mit Inputs verknuepft

## Funktionsumfang

- next-auth Credentials Login mit JWT-Strategie
- User, Projects, LeadLists, SearchJobs und Leads in PostgreSQL
- Overpass- und Gelbe-Seiten-Scraper
- Lead-Workflow mit Status, Tags, Follow-up und Notizen
- KPI-Bar, Sortierung, Filter und Bulk-Status-Update
- CSV- und XLSX-Export mit Filter-Metadaten und Confidence-Transparenz

## SaaS-Schutzpfade

- Geschuetzte App-Seiten werden in `proxy.ts` auf `/login` umgeleitet
- API-Routen pruefen Auth immer explizit mit `requireAuth()`
- Ownership folgt der Kette `User -> Project -> (LeadList, SearchJob) -> Lead`
- Lead-Listen duerfen nur im eigenen Projekt angelegt und zugewiesen werden
- Plan-Limits werden serverseitig fuer Jobs, Projekte, Listen und Leads pro Job erzwungen

### Plan-Limits

| Plan | Jobs / Monat | Leads / Job | Projekte | Listen |
|------|---------------|-------------|----------|--------|
| FREE | 10 | 50 | 2 | 5 |
| PRO | 200 | 200 | 20 | 100 |
| ENTERPRISE | unendlich | 500 | unendlich | unendlich |

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Prisma 7
- `@prisma/adapter-pg` + `pg`
- PostgreSQL 16
- next-auth v5 beta
- Tailwind CSS 4
- Zod 4

## Lokales Setup

### 1. Abhaengigkeiten installieren

```bash
npm install
```

### 2. Umgebungsvariablen anlegen

```bash
cp .env.example .env
```

### Lokale Konfiguration

Pflichtwerte fuer den lokalen Start:

- `DATABASE_URL`: Prisma- und App-DB-Verbindung. Der Default in `.env.example` passt zur lokalen Docker-DB.
- `AUTH_SECRET`: fuer Auth.js JWT-/Cookie-Signing. Erzeuge lokal einen eigenen Wert.
- `AUTH_URL`: lokal normalerweise `http://localhost:3000`

Nur fuer `docker compose up db -d` relevant:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`

Optional:

- `SCRAPE_DELAY_MS`: Wartezeit zwischen Requests
- `SCRAPE_MAX_RESULTS`: globaler Hard-Cap fuer Leads pro Job

Secret lokal erzeugen:

```bash
openssl rand -base64 32
```

Oder ohne OpenSSL:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. PostgreSQL starten

```bash
docker compose up db -d
```

Wenn Docker Desktop nicht laeuft, scheitert dieser Schritt mit einem Engine-/Pipe-Fehler. In dem Fall zuerst Docker Desktop starten.

### 4. Prisma Client generieren

```bash
npm run db:generate
```

### 5. Migration anwenden

```bash
npm run db:migrate
```

Optionaler Status-Check:

```bash
npm run db:migrate:status
```

### 6. Entwicklungsserver starten

```bash
npm run dev
```

Danach ist die App lokal unter `http://localhost:3000` erreichbar.

### Minimaler verifizierter Startpfad

```bash
npm install
cp .env.example .env
docker compose up db -d
npm run db:generate
npm run db:migrate
npm run dev
```

Erwartetes Ergebnis:

- `/login` und `/register` laden
- `/projects` leitet unangemeldet auf `/login` um
- Registrierung und Login funktionieren
- `/projects` kann ein Projekt anlegen
- `/search` startet einen Suchlauf
- Leads erscheinen im Dashboard und in der Detailseite
- Statusfilter und Exporte sind nutzbar

## Externe Schnittstellen

Aktuell direkt verwendet:

- PostgreSQL lokal oder in Docker ueber `DATABASE_URL`
- Overpass API: `https://overpass-api.de/api/interpreter`
- Nominatim: `https://nominatim.openstreetmap.org/search`
- Gelbe Seiten: `https://www.gelbeseiten.de`

Aktuell nicht noetig:

- keine OAuth-Provider
- keine SMTP- oder Mail-API
- keine Stripe-Keys fuer den lokalen Start
- keine API-Keys fuer Overpass, Nominatim oder Gelbe Seiten

## Wichtige Skripte

```bash
npm run dev
npm run build
npm run lint
npm run test:e2e:core
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:migrate:status
```

## Browser-Smoke-Test

Ein schlanker Playwright-Test deckt den Kernworkflow ab:

```bash
npx playwright install chromium
npm run test:e2e:core
```

Voraussetzungen:

- Docker-DB laeuft
- `.env` ist gesetzt

Hinweis:

- `npm run test:e2e:core` startet die lokale App ueber Playwright `webServer` selbst auf `http://localhost:3000`

Der Test deckt ab:

- Register
- Login
- Projektanlage
- Overpass-Suche
- Lead-Detailseite
- Statuswechsel auf `CONTACTED`
- gefilterten CSV-Export
- gefilterten XLSX-Export

## Release-Check

Vor einer Promotion nach `main` muessen mindestens diese Befehle gruen sein:

```bash
npm run db:generate
npm run lint
npm run build
```

Zusaetzlich erforderlich:

- Postgres starten
- `npm run db:migrate` erfolgreich ausfuehren
- Smoke-Test fuer Register, Login, Projekt, Suche und Export

## Smoke-Test-Checkliste

1. `/register` aufrufen und einen User anlegen
2. `/login` nutzen und anmelden
3. `/projects` ein Projekt anlegen
4. `/search` eine Suche gegen Overpass starten
5. Dashboard pruefen: KPI-Bar, Sortierung, Filter, Bulk-Status
6. Lead-Detailseite pruefen: Tags, Follow-up, Notizen
7. CSV- und XLSX-Export aus dem Dashboard pruefen
8. Unangemeldet `/projects` oder `/search` aufrufen und Redirect auf `/login` pruefen

## Troubleshooting

- Fehlendes `AUTH_SECRET`: Auth.js startet dann nicht sauber. Wert in `.env` setzen und Dev-Server neu starten.
- Fehlende `DATABASE_URL`: Prisma und API-Routen schlagen beim ersten DB-Zugriff fehl. `.env.example` als Basis verwenden.
- Datenbank nicht erreichbar: `docker compose ps` pruefen. Der `db`-Container muss healthy sein und `localhost:5432` offen haben.
- Prisma Client nicht generiert: `npm run db:generate` ausfuehren.
- Migration nicht angewendet: `npm run db:migrate` und danach optional `npm run db:migrate:status`.
- Playwright-Browser fehlt: `npx playwright install chromium` ausfuehren.
- Playwright-Smoke startet nicht: pruefen, ob `docker compose up db -d` laeuft; die App wird vom Test selbst gestartet, die DB nicht.

## Docker

- `docker-compose.yml` startet `db` und `app`
- Das Compose-File ist syntaktisch validiert
- Der reale lokale DB-Start wurde in dieser Session erfolgreich mit `docker compose up db -d` verifiziert

## Bekannte Luecken

- Keine breite Test-Suite; aktuell nur ein schlanker Playwright-Kernworkflow-Smoke-Test
- Gelbe-Seiten-Suche wurde in dieser Session nicht erneut live bis zum Ende durchlaufen
- Gelbe-Seiten-Selektoren wurden gegen Live-HTML validiert, bleiben aber extern aenderungsanfaellig
- Kein CI/CD-Setup
