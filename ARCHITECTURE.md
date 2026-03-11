# ARCHITECTURE.md

> Stand: 2026-03-11 - `dev` lokal startbar und mit Overpass + Gelbe Seiten live verifiziert; `main` wurde kontrolliert auf denselben Release-Stand aktualisiert

## High-Level Struktur

```text
leads-scraper/
|-- app/
|   |-- layout.tsx                    # Root Layout, Session-aware Nav
|   |-- page.tsx                      # Dashboard: KPI-Bar, Lead-Liste, Filter, Sort, Export, Bulk-Aktionen
|   |-- login/page.tsx                # Anmelde-Seite
|   |-- register/page.tsx             # Registrierung
|   |-- search/page.tsx               # Suchmaske mit Projekt-Auswahl + Usage-Hinweisen
|   |-- leads/[id]/page.tsx           # Lead-Detailseite mit Tags, Follow-up und Notizen
|   |-- projects/page.tsx             # Projekt-Uebersicht + Projektlimit-Hinweise
|   |-- projects/[id]/page.tsx        # Projekt-Detail: Jobs + Listen + Listenlimit-Hinweise
|   `-- api/
|       |-- auth/[...nextauth]/       # next-auth Handler
|       |-- register/route.ts         # Registrierung
|       |-- me/route.ts               # User-Profil + Usage-Stats
|       |-- projects/route.ts         # Projektliste
|       |-- projects/[id]/route.ts    # Projekt-CRUD
|       |-- projects/[id]/lists/      # Lead-Listen
|       |-- jobs/route.ts             # Job erstellen
|       |-- jobs/[id]/route.ts        # Job lesen / loeschen
|       |-- jobs/[id]/run/route.ts    # Job starten
|       |-- leads/route.ts            # Leads lesen
|       |-- leads/stats/route.ts      # KPI-Zaehler pro Status
|       |-- leads/bulk/route.ts       # Bulk-Status-Aenderung
|       |-- leads/[id]/route.ts       # Lead lesen / aendern / loeschen
|       |-- export/csv/route.ts       # CSV Export
|       `-- export/xlsx/route.ts      # XLSX Export
|-- components/
|   |-- NavUser.tsx                   # User-Badge, Plan-Anzeige, Abmelden
|   `-- leads/
|       |-- LeadsTable.tsx            # Tabelle, Detail-Link, Tier-Badge, Bulk-Auswahl
|       `-- JobStatus.tsx             # Job-Statusbanner mit Auto-Poll
|-- lib/
|   |-- db.ts                         # Prisma Client mit `@prisma/adapter-pg`
|   |-- auth.ts                       # next-auth v5 Konfiguration (JWT + authorized callback)
|   |-- session.ts                    # requireAuth() Helper
|   |-- limits.ts                     # Plan-Limits
|   |-- leads/
|   |   `-- filters.ts               # Gemeinsame Lead-Filter fuer API + Export
|   |-- sourceLabels.ts              # Lesbare Quellenlabels fuer UI und Exporte
|   |-- scraper/
|   |   |-- orchestrator.ts           # Job Runner
|   |   |-- deduplicator.ts           # Domain/Phone/Name Dedup
|   |   `-- sources/
|   |       |-- overpass.ts           # OpenStreetMap / Overpass API
|   |       `-- gelbeseiten.ts        # Gelbe Seiten
|   |-- parser/normalize.ts           # Phone, URL, Email + Confidence
|   `-- export/
|       |-- leadExport.ts             # Export-View + Meta-Zusammenfassung
|       |-- csv.ts                    # CSV Export
|       `-- xlsx.ts                   # XLSX Export
|-- prisma/
|   |-- schema.prisma                 # Datenmodell
|   `-- migrations/                   # versionierte SQL-Migrationen
|-- prisma.config.ts                  # Prisma-7-CLI-Konfiguration
|-- playwright.config.ts              # Playwright Smoke-Test-Konfiguration
|-- tests/
|   `-- e2e/
|       `-- core-workflow.spec.ts     # Register/Login/Projekt/Suche/Export Smoke-Test
|-- proxy.ts                          # Next.js 16 Route-Protection fuer App-Seiten
|-- types/next-auth.d.ts              # Session-Typ-Erweiterungen
|-- docker-compose.yml                # PostgreSQL + App
|-- Dockerfile                        # Multi-Stage Build
`-- .env.example                      # Umgebungsvariablen-Vorlage
```

## Datenmodell

### User
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | cuid | Primaerschluessel |
| email | String unique | Login-E-Mail |
| name | String? | Anzeigename |
| passwordHash | String? | bcrypt-Hash |
| role | UserRole | ADMIN / USER |
| plan | Plan | FREE / PRO / ENTERPRISE |
| planExpiresAt | DateTime? | Plan-Ablaufdatum |
| stripeCustomerId | String? unique | Billing-Vorbereitung |
| stripeSubscriptionId | String? unique | Billing-Vorbereitung |
| isActive | Boolean | Soft-Disable moeglich |

### Project
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | cuid | Primaerschluessel |
| name | String | Projektname |
| description | String? | Optionale Beschreibung |
| userId | String FK | Eigentuemer |
| deletedAt | DateTime? | Soft Delete |

### LeadList
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | cuid | Primaerschluessel |
| name | String | Listenname |
| projectId | String FK | Zugehoeriges Projekt |

### SearchJob
| Feld | Beschreibung |
|------|--------------|
| userId | FK -> User (nullable, Ownership) |
| projectId | FK -> Project (nullable) |
| source | Quelle des Suchlaufs |
| status | PENDING / RUNNING / COMPLETED / FAILED |

### Lead
| Feld | Beschreibung |
|------|--------------|
| listId | FK -> LeadList (optional, nullable) |
| sourceName | Quelle des Datensatzes |
| tags | Freie Lead-Tags als PostgreSQL-Array |
| followUpAt | Optionales Follow-up Datum |
| status | Vertriebstatus |
| confidence | Score fuer Datenqualitaet |

## Ownership-Modell

```text
User
`-- Project (userId, soft delete)
    |-- LeadList (projectId)
    |   `-- Lead.listId (optional)
    `-- SearchJob (projectId + userId)
        `-- Lead (jobId) - Ownership via job.userId
```

API-Schutz:
- `proxy.ts` schuetzt nur App-Seiten und leitet unautorisierte Requests auf `/login` um
- API-Routen verlassen sich auf `requireAuth()` fuer JSON-konforme 401/403-Antworten
- `requireAuth()` liest den aktuellen User-Status authoritativ aus der DB
- Alle Queries filtern per `userId: session.user.id`
- Lead-Listen duerfen nur innerhalb desselben eigenen Projekts zugeordnet werden
- Ownership-Verletzungen geben 404

## Authentifizierung

- next-auth v5 beta mit Credentials Provider
- JWT-Strategie ohne Session-Table
- `proxy.ts` schuetzt App-Seiten, API-Auth bleibt in den Route-Handlern
- `AUTH_SECRET` und `AUTH_URL` kommen aus `.env`
- `AUTH_SECRET` wird nur fuer Auth.js JWT-/Cookie-Signing benoetigt; es gibt aktuell keine OAuth-Provider
- Login und Registrierung normalisieren E-Mail-Adressen auf lowercase

## Prisma- / DB-Architektur

- Prisma 7 CLI wird ueber `prisma.config.ts` konfiguriert
- Runtime-Zugriff laeuft ueber `@prisma/adapter-pg` und `pg`
- Initiale SQL-Migration liegt in `prisma/migrations/20260311081500_init`
- Lokaler Standard-DB-String zeigt auf die Docker-Postgres-Instanz unter `localhost:5432`
- Minimaler lokaler Runtime-Pfad braucht `DATABASE_URL`, `AUTH_SECRET` und `AUTH_URL`; `POSTGRES_*` wird nur fuer `docker compose` benoetigt
- `docker compose up db -d`, `npm run db:generate` und `npm run db:migrate` wurden am 2026-03-11 lokal erfolgreich verifiziert

## Externe Schnittstellen

- PostgreSQL ueber `DATABASE_URL`
- Overpass API via `https://overpass-api.de/api/interpreter`
- Nominatim via `https://nominatim.openstreetmap.org/search`
- Gelbe Seiten via `https://www.gelbeseiten.de`
- Fuer diese Quellen sind aktuell keine API-Keys oder OAuth-Secrets notwendig

## Plan-Limits (`lib/limits.ts`)

| Plan | Jobs/Monat | Leads/Job | Projekte | Listen |
|------|------------|-----------|----------|--------|
| FREE | 10 | 50 | 2 | 5 |
| PRO | 200 | 200 | 20 | 100 |
| ENTERPRISE | unendlich | 500 | unendlich | unendlich |

## Wichtige Architekturentscheide

- Kein Multi-Tenant Magic: einfache `userId`-FKs auf allen Ressourcen
- Kein Session-Table: JWT reicht fuer MVP + SaaS-Start
- Soft Delete nur auf Projects
- Kein RBAC-Framework: `UserRole` Enum reicht
- Fire-and-forget Jobs bleiben ohne Queue-System
- `SCRAPE_MAX_RESULTS` ist nur ein optionaler globaler Hard-Cap; das effektive Lead-Limit kommt aus dem Plan
- Gelbe Seiten bleibt ein statischer HTML-Scraper mit Cheerio; Playwright ist installiert, aber bewusst noch nicht im aktiven Pfad, solange die relevanten Daten statisch in HTML / `data-*`-Feldern vorliegen
- Overpass-Requests retryen bei transienten `429`-/`5xx`- und Timeout-Fehlern, um Demo- und Smoke-Flakes durch die externe API zu reduzieren
- Playwright wird jetzt fuer einen schlanken Browser-Smoke-Test des Kernworkflows genutzt, nicht fuer den aktiven Scraper
- Der Smoke-Test startet die App ueber `webServer` selbst; nur Docker-Postgres muss vorab laufen
- Exporte sind absichtlich nachvollziehbar statt minimal: Kontaktkanaele, Confidence-Signale/-Warnungen und Filter-Metadaten werden fuer CSV und XLSX mit ausgegeben
- Dashboard, KPI und Export sollen denselben serverseitigen Lead-Filterkontext verwenden; gemeinsame Helfer liegen in `lib/leads/filters.ts`
- Release-Gate fuer `main`: `npm run db:generate`, `npm run lint`, `npm run build`, erfolgreiche Live-Migration und ein bestandener Kernworkflow-Smoke-Test; bei Scraper-Aenderungen zusaetzlich mindestens ein Live-Check pro betroffener Quelle
- Promotion nach `main` nur aus einem sauberen Worktree (`git status --short` leer), damit ein freigegebener Release-Stand eindeutig einem verifizierten Commit entspricht
- Der aktuelle stabile Basisstand auf `main` ist der am 2026-03-11 auf sauberem Worktree verifizierte `dev`-Release-Stand
