# ARCHITECTURE.md

> Stand: 2026-03-11 - Stabilisierung auf `dev`, nicht fuer `main` freigegeben

## High-Level Struktur

```text
leads-scraper/
|-- app/
|   |-- layout.tsx                    # Root Layout, Session-aware Nav
|   |-- page.tsx                      # Dashboard: KPI-Bar, Lead-Liste, Filter, Sort, Export, Bulk-Aktionen
|   |-- login/page.tsx                # Anmelde-Seite
|   |-- register/page.tsx             # Registrierung
|   |-- search/page.tsx               # Suchmaske mit Projekt-Auswahl
|   |-- leads/[id]/page.tsx           # Lead-Detailseite mit Tags, Follow-up und Notizen
|   |-- projects/page.tsx             # Projekt-Uebersicht
|   |-- projects/[id]/page.tsx        # Projekt-Detail: Jobs + Listen
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
|   |-- auth.ts                       # next-auth v5 Konfiguration (JWT)
|   |-- session.ts                    # requireAuth() Helper
|   |-- limits.ts                     # Plan-Limits
|   |-- scraper/
|   |   |-- orchestrator.ts           # Job Runner
|   |   |-- deduplicator.ts           # Domain/Phone/Name Dedup
|   |   `-- sources/
|   |       |-- overpass.ts           # OpenStreetMap / Overpass API
|   |       `-- gelbeseiten.ts        # Gelbe Seiten
|   |-- parser/normalize.ts           # Phone, URL, Email + Confidence
|   `-- export/
|       |-- csv.ts                    # CSV Export
|       `-- xlsx.ts                   # XLSX Export
|-- prisma/
|   |-- schema.prisma                 # Datenmodell
|   `-- migrations/                   # versionierte SQL-Migrationen
|-- prisma.config.ts                  # Prisma-7-CLI-Konfiguration
|-- proxy.ts                          # Next.js 16 Route-Protection
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
- `requireAuth()` in jeder geschuetzten Route
- Alle Queries filtern per `userId: session.user.id`
- Ownership-Verletzungen geben 404

## Authentifizierung

- next-auth v5 beta mit Credentials Provider
- JWT-Strategie ohne Session-Table
- `proxy.ts` schuetzt alle internen Routen ausser Login/Register/Auth-Endpunkte
- `AUTH_SECRET` und `AUTH_URL` kommen aus `.env`

## Prisma- / DB-Architektur

- Prisma 7 CLI wird ueber `prisma.config.ts` konfiguriert
- Runtime-Zugriff laeuft ueber `@prisma/adapter-pg` und `pg`
- Initiale SQL-Migration liegt in `prisma/migrations/20260311081500_init`
- Lokaler Standard-DB-String zeigt auf die Docker-Postgres-Instanz unter `localhost:5432`

## Plan-Limits (`lib/limits.ts`)

| Plan | Jobs/Monat | Leads/Job | Projekte |
|------|------------|-----------|----------|
| FREE | 10 | 50 | 2 |
| PRO | 200 | 200 | 20 |
| ENTERPRISE | unendlich | 500 | unendlich |

## Wichtige Architekturentscheide

- Kein Multi-Tenant Magic: einfache `userId`-FKs auf allen Ressourcen
- Kein Session-Table: JWT reicht fuer MVP + SaaS-Start
- Soft Delete nur auf Projects
- Kein RBAC-Framework: `UserRole` Enum reicht
- Fire-and-forget Jobs bleiben ohne Queue-System
- Release-Gate fuer `main`: `npm run db:generate`, `npm run lint`, `npm run build`, erfolgreiche Live-Migration und manueller Smoke-Test
