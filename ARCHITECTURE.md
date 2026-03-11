# ARCHITECTURE.md

> Stand: 2026-03-11 - Session 5 + Release Audit (nicht fuer `main` freigegeben)

## High-Level Struktur

```text
leads-scraper/
|-- app/
|   |-- layout.tsx                    # Root Layout, Session-aware Nav
|   |-- page.tsx                      # Dashboard: KPI-Bar, Lead-Liste, Filter, Sort, Export, Bulk-Aktionen
|   |-- login/page.tsx                # Anmelde-Seite (next-auth Credentials)
|   |-- register/page.tsx             # Registrierung
|   |-- search/page.tsx               # Suchmaske mit Projekt-Auswahl
|   |-- leads/[id]/page.tsx           # Lead-Detailseite mit Tags, Follow-up und Notizen
|   |-- projects/page.tsx             # Projekt-Uebersicht
|   |-- projects/[id]/page.tsx        # Projekt-Detail: Jobs + Listen
|   `-- api/
|       |-- auth/[...nextauth]/       # next-auth Handler
|       |-- register/route.ts         # POST: Registrierung (oeffentlich)
|       |-- me/route.ts               # GET: User-Profil + Usage-Stats
|       |-- projects/route.ts         # GET/POST: Projektliste
|       |-- projects/[id]/route.ts    # GET/PATCH/DELETE (soft delete)
|       |-- projects/[id]/lists/      # GET/POST: Lead-Listen
|       |-- jobs/route.ts             # POST: Job erstellen (limit-geprueft)
|       |-- jobs/[id]/route.ts        # GET/DELETE (ownership-geschuetzt)
|       |-- jobs/[id]/run/route.ts    # POST: Job starten (ownership)
|       |-- leads/route.ts            # GET: user-scoped, paginated
|       |-- leads/stats/route.ts      # GET: KPI-Zaehler pro Status
|       |-- leads/bulk/route.ts       # PATCH: Bulk-Status-Aenderung
|       |-- leads/[id]/route.ts       # GET/PATCH/DELETE (ownership)
|       |-- export/csv/route.ts       # GET: CSV Download (user-scoped)
|       `-- export/xlsx/route.ts      # GET: XLSX Download (user-scoped)
|-- components/
|   |-- NavUser.tsx                   # User-Badge, Plan-Anzeige, Abmelden
|   `-- leads/
|       |-- LeadsTable.tsx            # Responsive Tabelle, Detail-Link, Tier-Badge, Bulk-Auswahl
|       `-- JobStatus.tsx             # Job-Statusbanner mit Auto-Poll
|-- lib/
|   |-- db.ts                         # Prisma Client Singleton
|   |-- auth.ts                       # next-auth v5 Konfiguration (JWT)
|   |-- session.ts                    # requireAuth() Helper
|   |-- limits.ts                     # Plan-Limits Konstanten + Checker
|   |-- scraper/
|   |   |-- orchestrator.ts           # Job Runner
|   |   |-- deduplicator.ts           # Domain/Phone/Name Dedup
|   |   `-- sources/
|   |       |-- overpass.ts           # OpenStreetMap / Overpass API
|   |       `-- gelbeseiten.ts        # Gelbe Seiten (Cheerio)
|   |-- parser/normalize.ts           # Phone, URL, Email + Confidence
|   `-- export/
|       |-- csv.ts                    # CSV mit BOM
|       `-- xlsx.ts                   # XLSX mit ExcelJS
|-- middleware.ts                     # next-auth Schutz aller Routen
|-- types/next-auth.d.ts              # Session-Typ-Erweiterungen
|-- prisma/schema.prisma              # Datenmodell
|-- docker-compose.yml                # PostgreSQL + App
|-- Dockerfile                        # Multi-Stage Build
`-- .env.example                      # Umgebungsvariablen-Vorlage
```

## Datenmodell (aktuell)

### User
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | cuid | Primaerschluessel |
| email | String unique | Login-E-Mail |
| name | String? | Anzeigename |
| passwordHash | String? | bcrypt (12 Rounds) |
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
| sourceName | Quelle des Datensatzes (`overpass`, `gelbeseiten`, ...) |
| tags | Freie Lead-Tags als PostgreSQL-Array |
| followUpAt | Optionales Follow-up Datum pro Lead |
| status | Vertriebstatus (NEW bis INVALID) |
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
- `requireAuth()` in jeder Route: gibt 401 bei fehlendem JWT
- Alle Queries filtern per `userId: session.user.id`
- Ownership-Verletzungen geben 404 (kein Information Leak)

## Plan-Limits (`lib/limits.ts`)

| Plan | Jobs/Monat | Leads/Job | Projekte |
|------|------------|-----------|----------|
| FREE | 10 | 50 | 2 |
| PRO | 200 | 200 | 20 |
| ENTERPRISE | unendlich | 500 | unendlich |

## Authentifizierung

- next-auth v5 beta mit Credentials Provider (Email + Passwort)
- JWT-Strategie - kein Session-Table noetig
- `AUTH_SECRET` aus `.env` - nie committen
- Passwoerter mit bcrypt gehasht
- `middleware.ts` schuetzt alle Routen ausser `/login`, `/register`, `/api/auth`, `/api/register`

## Billing-Vorbereitung

- `User.stripeCustomerId` und `User.stripeSubscriptionId` im Schema
- `User.plan` und `User.planExpiresAt` bereit
- `PLAN_LIMITS` als Code-Konstanten
- Stripe-Code ist bewusst noch nicht vorhanden

## Wichtige Architekturentscheide

- Kein Multi-Tenant Magic: einfache `userId`-FKs auf allen Ressourcen
- Kein Session-Table: JWT reicht fuer MVP + SaaS-Start
- Soft Delete nur auf Projects
- Kein RBAC-Framework: `UserRole` Enum reicht
- Fire-and-forget Jobs bleiben ohne Queue-System
- Release-Gate bleibt ausserhalb der App-Architektur: `db:generate`, `build`, `lint`, Migration und manueller Flow-Test muessen vor jeder Promotion nach `main` gruen sein
