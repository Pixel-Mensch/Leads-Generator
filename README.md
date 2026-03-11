# Leads Scraper

B2B Lead Generator auf Next.js 16 mit Auth, Projekten, Lead-Listen, Scraping, CRM-artigem Lead-Workflow und CSV/XLSX-Export.

## Aktueller Verifikationsstand

- `npm run db:generate` laeuft
- `npm run lint` laeuft
- `npm run build` laeuft
- Dev-Server-Boot wurde lokal geprueft: `GET /login -> HTTP 200`
- `docker compose config` ist valide
- Eine Initial-Migration liegt in `prisma/migrations/20260311081500_init`
- Nicht verifiziert auf diesem Host: `docker compose up db -d` und `npm run db:migrate`, weil der Docker-Desktop-Daemon zum Pruefzeitpunkt nicht lief

## Funktionsumfang

- next-auth Credentials Login mit JWT-Strategie
- User, Projects, LeadLists, SearchJobs und Leads in PostgreSQL
- Overpass- und Gelbe-Seiten-Scraper
- Lead-Workflow mit Status, Tags, Follow-up und Notizen
- KPI-Bar, Sortierung, Filter und Bulk-Status-Update
- CSV- und XLSX-Export

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

Pflichtwerte in `.env`:

- `AUTH_SECRET`: mit `openssl rand -base64 32` erzeugen
- `AUTH_URL`: lokal normalerweise `http://localhost:3000`
- `DATABASE_URL`: Standard fuer Docker-DB ist bereits in `.env.example` enthalten

### 3. PostgreSQL starten

```bash
docker compose up db -d
```

Wenn Docker Desktop nicht laeuft, scheitert dieser Schritt mit einem Engine-/Pipe-Fehler. In dem Fall zuerst Docker Desktop starten.

### 4. Migration anwenden

```bash
npm run db:migrate
```

### 5. Entwicklungsserver starten

```bash
npm run dev
```

Danach ist die App lokal unter `http://localhost:3000` erreichbar.

## Wichtige Skripte

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:migrate:deploy
npm run db:migrate:status
```

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

## Docker

- `docker-compose.yml` startet `db` und `app`
- Das Compose-File ist syntaktisch validiert
- Der reale Container-Start konnte in dieser Session nicht abgeschlossen werden, weil der Docker-Daemon nicht verfuegbar war

## Bekannte Luecken

- Keine automatisierten Tests
- Keine verifizierte End-to-End-Suche in dieser Session
- Gelbe-Seiten-Selektoren sind weiterhin heuristisch
- Kein CI/CD-Setup
