# ARCHITECTURE.md

> Stand: 2026-03-11 — MVP Session 2 (SaaS Foundation)

## High-Level Struktur

```
leads-scraper/
├── app/
│   ├── layout.tsx                    # Root Layout, Session-aware Nav
│   ├── page.tsx                      # Dashboard: Lead-Liste, Filter, Export
│   ├── login/page.tsx                # Anmelde-Seite (next-auth Credentials)
│   ├── register/page.tsx             # Registrierung
│   ├── search/page.tsx               # Suchmaske mit Projekt-Auswahl
│   ├── leads/[id]/page.tsx           # Lead-Detailseite
│   ├── projects/page.tsx             # Projekt-Übersicht
│   ├── projects/[id]/page.tsx        # Projekt-Detail: Jobs + Listen
│   └── api/
│       ├── auth/[...nextauth]/       # next-auth Handler
│       ├── register/route.ts         # POST: Registrierung (öffentlich)
│       ├── me/route.ts               # GET: User-Profil + Usage-Stats
│       ├── projects/route.ts         # GET/POST: Projektliste
│       ├── projects/[id]/route.ts    # GET/PATCH/DELETE (soft delete)
│       ├── projects/[id]/lists/      # GET/POST: Lead-Listen
│       ├── jobs/route.ts             # POST: Job erstellen (limit-geprüft)
│       ├── jobs/[id]/route.ts        # GET/DELETE (ownership-geschützt)
│       ├── jobs/[id]/run/route.ts    # POST: Job starten (ownership)
│       ├── leads/route.ts            # GET: user-scoped, paginated
│       ├── leads/[id]/route.ts       # GET/PATCH/DELETE (ownership)
│       ├── export/csv/route.ts       # GET: CSV Download (user-scoped)
│       └── export/xlsx/route.ts      # GET: XLSX Download (user-scoped)
├── components/
│   ├── NavUser.tsx                   # User-Badge, Plan-Anzeige, Abmelden
│   └── leads/
│       ├── LeadsTable.tsx            # Responsive Tabelle + Inline-Edit
│       └── JobStatus.tsx             # Job-Statusbanner mit Auto-Poll
├── lib/
│   ├── db.ts                         # Prisma Client Singleton
│   ├── auth.ts                       # next-auth v5 Konfiguration (JWT)
│   ├── session.ts                    # requireAuth() Helper
│   ├── limits.ts                     # Plan-Limits Konstanten + Checker
│   ├── scraper/
│   │   ├── orchestrator.ts           # Job Runner
│   │   ├── deduplicator.ts           # Domain/Phone/Name Dedup
│   │   └── sources/
│   │       ├── overpass.ts           # OpenStreetMap / Overpass API
│   │       └── gelbeseiten.ts        # Gelbe Seiten (Cheerio)
│   ├── parser/normalize.ts           # Phone, URL, Email + Confidence
│   └── export/
│       ├── csv.ts                    # CSV mit BOM
│       └── xlsx.ts                   # XLSX mit ExcelJS
├── middleware.ts                     # next-auth JWT-Schutz aller Routen
├── types/next-auth.d.ts              # Session-Typ-Erweiterungen
├── prisma/schema.prisma              # Datenmodell
├── docker-compose.yml                # PostgreSQL + App
├── Dockerfile                        # Multi-Stage Build
└── .env.example                      # Umgebungsvariablen-Vorlage
```

## Datenmodell (aktuell)

### User
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | cuid | Primärschlüssel |
| email | String unique | Login-E-Mail |
| name | String? | Anzeigename |
| passwordHash | String? | bcrypt (12 Rounds) |
| role | UserRole | ADMIN / USER |
| plan | Plan | FREE / PRO / ENTERPRISE |
| planExpiresAt | DateTime? | Plan-Ablaufdatum |
| stripeCustomerId | String? unique | Billing-Vorbereitung |
| stripeSubscriptionId | String? unique | Billing-Vorbereitung |
| isActive | Boolean | Soft-Disable möglich |

### Project
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | cuid | Primärschlüssel |
| name | String | Projektname |
| description | String? | Optionale Beschreibung |
| userId | String FK | Eigentümer |
| deletedAt | DateTime? | Soft Delete |

### LeadList
| Feld | Typ | Beschreibung |
|------|-----|-------------|
| id | cuid | Primärschlüssel |
| name | String | Listenname |
| projectId | String FK | Zugehöriges Projekt |

### SearchJob (erweitert)
| Feld | Beschreibung |
|------|-------------|
| userId | FK → User (nullable, Ownership) |
| projectId | FK → Project (nullable) |
| (alle MVP-Felder wie bisher) | |

### Lead (erweitert)
| Feld | Beschreibung |
|------|-------------|
| listId | FK → LeadList (optional, nullable) |
| (alle MVP-Felder wie bisher) | |

## Ownership-Modell

```
User
└── Project (userId, soft delete)
    ├── LeadList (projectId)
    │   └── Lead.listId (optional)
    └── SearchJob (projectId + userId)
        └── Lead (jobId) — Ownership via job.userId
```

API-Schutz:
- `requireAuth()` in jeder Route: gibt 401 bei fehlendem JWT
- Alle Queries filtern per `userId: session.user.id`
- Ownership-Verletzungen geben 404 (nicht 403 — kein Information Leak)

## Plan-Limits (lib/limits.ts)

| Plan | Jobs/Monat | Leads/Job | Projekte |
|------|-----------|-----------|---------|
| FREE | 10 | 50 | 2 |
| PRO | 200 | 200 | 20 |
| ENTERPRISE | ∞ | 500 | ∞ |

## Authentifizierung

- **next-auth v5 beta** mit Credentials Provider (Email + Passwort)
- **JWT-Strategie** — kein Session-Table nötig
- **AUTH_SECRET** aus .env — nie committen
- Passwörter mit **bcrypt (12 Rounds)** gehasht
- Middleware schützt alle Routen außer `/login`, `/register`, `/api/auth`, `/api/register`

## Billing-Vorbereitung

- `User.stripeCustomerId` und `User.stripeSubscriptionId` im Schema
- `User.plan` und `User.planExpiresAt` bereit
- PLAN_LIMITS als Code-Konstanten — beim Plan-Upgrade einfach DB-Feld setzen
- Stripe-Code: **nicht vorhanden** — bewusste Entscheidung für MVP

## Wichtige Architekturentscheide

- Kein Multi-Tenant Magic: einfache `userId`-FKs auf allen Ressourcen
- Kein Session-Table: JWT reicht für MVP + SaaS-Start
- Soft Delete nur auf Projects: Daten bleiben erhalten
- Kein RBAC-Framework: `UserRole` enum reicht (ADMIN-Flag für spätere Admin-UI)
- Fire-and-forget Jobs bleiben so: kein Queue-System für MVP
