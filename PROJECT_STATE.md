# PROJECT_STATE.md

## Projektzweck
**Leads Scraper** — B2B Lead Generator mit SaaS-fähiger Architektur.
Sammelt öffentlich auffindbare Unternehmensdaten nach Branche, Ort und Radius.
Speichert in PostgreSQL, stellt Vertriebsstatus, Projekte, Lead-Listen und CSV/XLSX-Export bereit.
Auth via next-auth (JWT), plan-basierte Limits, Billing-Felder vorbereitet.

## Aktueller Stand (2026-03-11, Session 5)

**UX-Session abgeschlossen auf `feat/ux-improvements`. Build-Test und DB-Migration noch ausstehend.**

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
| **Normalisierung (Phone/URL/Email/Domain)** | **verbessert Session 4** |
| **Confidence Scoring (transparent, mit Signalen)** | **verbessert Session 4** |
| **Deduplizierung (Merge-Logik, stadtbasiert)** | **verbessert Session 4** |
| **sourceName Tracking (DB + Exporte)** | **neu Session 4** |
| **CSV Export (Quelle, Qualität, Metadaten)** | **verbessert Session 4** |
| **XLSX Export (Hyperlinks, Farben, Meta-Sheet)** | **verbessert Session 4** |
| **Tags auf Leads (DB + API + UI)** | **neu Session 5** |
| **Follow-up Datum (DB + API + UI)** | **neu Session 5** |
| **KPI-Bar Dashboard (Zähler pro Status)** | **neu Session 5** |
| **Sort-Control Dashboard** | **neu Session 5** |
| **Bulk-Status-Änderung** | **neu Session 5** |
| **Firmenname → Detailseite Link** | **neu Session 5** |
| **Lead-Detailseite (2-Spalten, Tags, Follow-up)** | **verbessert Session 5** |
| **/api/leads/stats** | **neu Session 5** |
| **/api/leads/bulk** | **neu Session 5** |

## Bekannte Probleme / Lücken

- **Build nicht ausgeführt** — `npm run build` steht aus; TypeScript-Fehler möglich
- **DB Migration ausstehend** — Schema hat neue Felder `Lead.sourceName`, `Lead.tags`, `Lead.followUpAt` (alle nullable/default, rückwärtskompatibel)
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
- Migration muss sorgfältig getestet werden (neue Non-Null FKs + sourceName)
