# PROJECT_STATE.md

## Projektzweck
**Leads Scraper** — B2B Lead Generator mit SaaS-fähiger Architektur.
Sammelt öffentlich auffindbare Unternehmensdaten nach Branche, Ort und Radius.
Speichert in PostgreSQL, stellt Vertriebsstatus, Projekte, Lead-Listen und CSV/XLSX-Export bereit.
Auth via next-auth (JWT), plan-basierte Limits, Billing-Felder vorbereitet.

## Aktueller Stand (2026-03-11, Session 3)

**SaaS Foundation implementiert auf `feat/saas-foundation`. Build-Test und DB noch ausstehend.**

## Tech Stack

| Technologie | Version | Status |
|-------------|---------|--------|
| Next.js App Router | 16.1.6 | aktiv |
| TypeScript | 5.x | aktiv |
| Tailwind CSS | 4.x | aktiv |
| Prisma ORM | 7.x | Schema fertig, Migration ausstehend |
| PostgreSQL | 16 | Docker Compose bereit |
| next-auth | v5 beta | JWT-Auth implementiert |
| bcryptjs | 2.x | Passwort-Hashing aktiv |
| Cheerio | 1.x | Gelbe Seiten Scraper |
| Playwright | 1.x | installiert, kein aktiver Scraper |
| ExcelJS | 4.x | XLSX Export |
| csv-stringify | 6.x | CSV Export |
| Zod | 4.x | API Validation |

## Implementierte Module

| Modul | Status |
|-------|--------|
| User-Modell (plan, role, billing fields) | fertig |
| Project-Modell (soft delete) | fertig |
| LeadList-Modell | fertig |
| next-auth JWT Auth | fertig |
| Middleware (Routenschutz) | fertig |
| requireAuth() Helper | fertig |
| Plan-Limits (FREE/PRO/ENTERPRISE) | fertig |
| /api/register | fertig |
| /api/me (usage stats) | fertig |
| /api/projects CRUD | fertig |
| /api/projects/[id]/lists | fertig |
| Alle Jobs/Leads/Export APIs | ownership-gesichert, fertig |
| Login UI | fertig |
| Register UI | fertig |
| Projekte UI (Liste + Detail) | fertig |
| NavUser (Plan-Badge, Sign-out) | fertig |
| Suchmaske mit Projekt-Auswahl | fertig |
| Billing-Felder im Schema | vorbereitet, kein Code |
| Overpass Scraper | fertig |
| Gelbe Seiten Scraper | fertig |
| CSV/XLSX Export | fertig |

## Bekannte Probleme / Lücken

- **Build nicht ausgeführt** — `npm run build` steht aus; TypeScript-Fehler möglich
- **DB Migration ausstehend** — neues Schema (User, Project, LeadList) noch nicht migriert
- **AUTH_SECRET muss gesetzt werden** — in .env, nie committen
- **Playwright nicht aktiv** — installiert aber kein Source nutzt es
- **Gelbe Seiten Selektoren heuristisch** — können brechen
- **Kein Test-Suite** — keine Unit/Integration Tests
- **Admin-UI fehlt** — ADMIN-Rolle im Schema, aber kein Admin-Bereich
- **Einladungslogik fehlt** — noch nicht implementiert
- **Plan-Upgrade Flow fehlt** — Stripe vorbereitet aber kein Code

## Risiken

- next-auth v5 beta: kann noch API-Änderungen haben
- Zod v4: leicht unterschiedliche API zu v3 (prüfen beim Build)
- Migration muss sorgfältig getestet werden (neue Non-Null FKs)
