# PROJECT_STATE.md

## Projektzweck
**Leads Scraper** - B2B Lead Generator mit SaaS-faehiger Architektur.
Sammelt oeffentlich auffindbare Unternehmensdaten nach Branche, Ort und Radius.
Speichert in PostgreSQL, stellt Vertriebsstatus, Projekte, Lead-Listen und CSV/XLSX-Export bereit.
Auth via next-auth (JWT), plan-basierte Limits, Billing-Felder vorbereitet.

## Aktueller Stand (2026-03-11, Release Audit)

**Release-Audit auf `dev` und `main` fehlgeschlagen. Keine weitere Promotion nach `main`, bis alle Blocker behoben und erneut verifiziert sind.**

- `main` zeigt bereits auf `c1a2276` (UX-Merge), dieser Stand ist aber noch nicht als stabil freigegeben
- `dev` zeigt auf `308425d` und hat inhaltlich denselben Stand wie `main`
- `npm run db:generate` scheitert mit Prisma 7 (`datasource.url` ist in `prisma/schema.prisma` nicht mehr zulaessig)
- `npm run build` scheitert dadurch am fehlenden generierten Prisma Client
- `npm run lint` scheitert an `react-hooks/set-state-in-effect` in `app/page.tsx` und `app/projects/page.tsx`
- Es gibt weiterhin keine Unit-/Integration-Tests und keine verifizierte DB-Migration

## Tech Stack

| Technologie | Version | Status |
|-------------|---------|--------|
| Next.js App Router | 16.1.6 | aktiv |
| TypeScript | 5.x | aktiv |
| Tailwind CSS | 4.x | aktiv |
| Prisma ORM | 7.x | aktiv, aktuelle Konfiguration release-blockierend |
| PostgreSQL | 16 | Docker Compose bereit |
| next-auth | v5 beta | JWT-Auth implementiert |
| bcryptjs | 3.x | Passwort-Hashing aktiv |
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
| Normalisierung (Phone/URL/Email/Domain) | verbessert |
| Confidence Scoring (transparent, mit Signalen) | verbessert |
| Deduplizierung (Merge-Logik, stadtbasiert) | verbessert |
| sourceName Tracking (DB + Exporte) | fertig |
| CSV Export (Quelle, Qualitaet, Metadaten) | verbessert |
| XLSX Export (Hyperlinks, Farben, Meta-Sheet) | verbessert |
| Tags auf Leads (DB + API + UI) | fertig |
| Follow-up Datum (DB + API + UI) | fertig |
| KPI-Bar Dashboard (Zaehler pro Status) | fertig |
| Sort-Control Dashboard | fertig |
| Bulk-Status-Aenderung | fertig |
| Firmenname -> Detailseite Link | fertig |
| Lead-Detailseite (2 Spalten, Tags, Follow-up) | verbessert |
| /api/leads/stats | fertig |
| /api/leads/bulk | fertig |

## Bekannte Probleme / Luecken

- **Prisma 7 Konfiguration defekt** - `npm run db:generate` bricht mit `P1012` ab, weil `datasource.url` nicht mehr in `prisma/schema.prisma` unterstuetzt wird
- **Build aktuell rot** - `npm run build` scheitert an `@prisma/client/default` -> `.prisma/client/default`, solange kein Client generiert wird
- **Lint aktuell rot** - `react-hooks/set-state-in-effect` in `app/page.tsx` und `app/projects/page.tsx`
- **DB Migration ungeprueft** - Schema hat neue Felder `Lead.sourceName`, `Lead.tags`, `Lead.followUpAt`; Migration wurde noch nicht gegen eine laufende DB validiert
- **AUTH_SECRET muss gesetzt werden** - in `.env`, nie committen
- **Keine Test-Suite** - keine Unit/Integration Tests vorhanden
- **Playwright nicht aktiv** - installiert, aber keine Quelle nutzt es
- **Gelbe Seiten Selektoren heuristisch** - koennen brechen
- **Admin-UI fehlt** - ADMIN-Rolle im Schema, aber kein Admin-Bereich
- **Einladungslogik fehlt** - noch nicht implementiert
- **Plan-Upgrade Flow fehlt** - Stripe vorbereitet, aber kein Code
- **README veraltet** - Setup- und Betriebsanleitung entspricht nicht dem aktuellen Stack

## Risiken

- next-auth v5 beta kann noch API-Aenderungen haben
- Zod v4 weicht in Details von v3 ab
- Migration muss sorgfaeltig getestet werden (neue FKs und neue Lead-Felder)
- Auth-Middleware laeuft ueber `middleware.ts -> lib/auth.ts -> lib/db.ts`; dieser Edge/Proxy-Pfad muss nach dem Prisma-Fix separat validiert werden
