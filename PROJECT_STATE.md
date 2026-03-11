# PROJECT_STATE.md

## Projektzweck
**Leads Scraper** - B2B Lead Generator mit SaaS-faehiger Architektur.
Sammelt oeffentlich auffindbare Unternehmensdaten nach Branche, Ort und Radius.
Speichert in PostgreSQL, stellt Vertriebsstatus, Projekte, Lead-Listen und CSV/XLSX-Export bereit.
Auth via next-auth (JWT), plan-basierte Limits, Billing-Felder vorbereitet.

## Aktueller Stand (2026-03-11, Stabilisierung + SaaS-Haertung + Scraper-Qualitaet)

**Der technische Unterbau auf `dev` ist lokal glaubwuerdig und die SaaS-Grundschutzpfade sind gehaertet. `main` bleibt trotzdem blockiert, bis DB-Migration und echter Auth/Search/Export-Smoke-Test gegen eine laufende Postgres-Instanz erfolgt sind.**

- `dev` enthaelt nach dem Release-Audit weitere Stabilisierungs- und SaaS-Haertungs-Commits
- `npm run db:generate` laeuft wieder
- `npm run lint` laeuft wieder
- `npm run build` laeuft wieder
- Prisma 7 laeuft jetzt ueber `prisma.config.ts` und `@prisma/adapter-pg`
- Next.js 16 nutzt `proxy.ts` statt `middleware.ts`, und unautorisierte Seitenzugriffe auf `/projects` wurden real mit `307 -> /login` verifiziert
- Eine Initial-Migration ist versioniert in `prisma/migrations/20260311081500_init`
- Lokaler Dev-Boot wurde gegen `/login` mit `HTTP 200` geprueft
- Docker Compose ist syntaktisch valide, aber der reale DB-Start konnte auf diesem Host nicht abgeschlossen werden, weil der Docker-Daemon nicht lief
- `requireAuth()` holt den aktuellen User-Status jetzt authoritativ aus der DB
- Ownership fuer Lead-Listen-Zuordnung wird jetzt projektbezogen serverseitig validiert
- Listen-Limits werden serverseitig erzwungen und in der UI sichtbar gemacht
- `SearchJob`-Re-Runs sind auf `PENDING` begrenzt
- Suchlauf-Caps respektieren jetzt echte Plan-Limits statt nur `SCRAPE_MAX_RESULTS`
- E-Mail-Adressen werden bei Register und Login normalisiert
- `normalizeUrl()` behandelt Schemes, Tracking-Parameter und Nicht-HTTP-Links jetzt sauberer
- Dedup-Merge fuellt nicht nur Luecken, sondern behaelt reichere Kontaktfelder und kombiniert Quellen nachvollziehbar
- Overpass-Fallback escaped Freitext sauberer und DB-Dedup gegen vorhandene Leads nutzt jetzt normalisierte Name+Ort-Keys
- Gelbe-Seiten-Parsing wurde gegen reales Live-HTML validiert und nutzt jetzt eingebettete Kontaktdaten, Base64-Website-Links und robustere Detail-URL-/Adress-Selektoren
- CSV- und XLSX-Exporte ziehen jetzt `listId`, `tag`, `category` und `sourceName` als Filter sauber durch
- Exporte enthalten jetzt Kontaktkanaele, Confidence-Signale und Confidence-Warnungen fuer nachvollziehbarere Lead-Qualitaet
- `sourceName`-Filter matchen jetzt auch deduplizierte Multi-Source-Leads in Dashboard und Export
- Dashboard hat jetzt serverseitige Volltextsuche, Follow-up-Filter, klarere Fehlerzustaende und filterkonsistente KPI-/Export-Kontexte
- Job-Statusbanner pollt jetzt bis zu einem terminalen Job-Status statt nach dem ersten Laden zu veralten
- Lead-Tabelle bietet jetzt klarere Kontakt-Schnellaktionen, sichtbare Follow-up-Signale und robustere Inline-Fehler fuer Status-/Notiz-Aenderungen
- Lead-Detailseite bietet jetzt echte Vertriebs-Schnellaktionen, Kontakt-/Follow-up-Zusammenfassung und Ruecksprung in den zugehoerigen Suchlauf
- Mobile Top-Navigation und User-Bereich umbrechen jetzt sauberer statt auf schmalen Screens zu klemmen

## Tech Stack

| Technologie | Version | Status |
|-------------|---------|--------|
| Next.js App Router | 16.1.6 | aktiv |
| React | 19.2.3 | aktiv |
| TypeScript | 5.x | aktiv |
| Tailwind CSS | 4.x | aktiv |
| Prisma ORM | 7.4.2 | aktiv, mit `prisma.config.ts` |
| `@prisma/adapter-pg` | 7.4.2 | aktiv |
| PostgreSQL | 16 | Docker Compose vorbereitet |
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
| `proxy.ts` Routenschutz | fertig |
| requireAuth() Helper | fertig, DB-authoritativ |
| Plan-Limits (FREE/PRO/ENTERPRISE) | fertig |
| /api/register | fertig |
| /api/me (usage stats) | fertig |
| /api/projects CRUD | fertig |
| /api/projects/[id]/lists | fertig, mit serverseitigem Listen-Limit |
| Alle Jobs/Leads/Export APIs | ownership-gesichert, fertig |
| Login UI | fertig |
| Register UI | fertig |
| Projekte UI (Liste + Detail) | fertig, mit Limit-/Fehlerfeedback |
| NavUser (Plan-Badge, Sign-out) | fertig |
| Suchmaske mit Projekt-Auswahl | fertig, mit Usage-Hinweisen |
| Overpass Scraper | fertig |
| Gelbe Seiten Scraper | verbessert, gegen Live-HTML validiert |
| Normalisierung (Phone/URL/Email/Domain) | verbessert |
| Confidence Scoring (transparent, mit Signalen) | verbessert |
| Deduplizierung (Merge-Logik, stadtbasiert) | verbessert |
| sourceName Tracking (DB + Exporte) | fertig |
| CSV Export (Quelle, Filter, Qualitaet, Metadaten) | verbessert |
| XLSX Export (Hyperlinks, Filter, Farben, Meta-Sheet) | verbessert |
| Tags auf Leads (DB + API + UI) | fertig |
| Follow-up Datum (DB + API + UI) | fertig |
| KPI-Bar Dashboard (Zaehler pro Status) | fertig |
| Sort-Control Dashboard | fertig |
| Bulk-Status-Aenderung | fertig |
| Firmenname -> Detailseite Link | fertig |
| Lead-Detailseite (2 Spalten, Tags, Follow-up, Schnellaktionen) | verbessert |
| Lead-Tabelle (Mobile + Schnellaktionen) | verbessert |
| /api/leads/stats | fertig |
| /api/leads/bulk | fertig |
| Dashboard-Filterkontext (Suche, Follow-up, Export) | verbessert |
| Initial-Migration | fertig, aber noch nicht live angewendet |

## Bekannte Probleme / Luecken

- **Live-DB nicht verifiziert** - `docker compose up db -d` scheiterte auf diesem Host, weil der Docker-Desktop-Daemon nicht lief
- **Migration nicht live angewendet** - Initial-Migration ist erzeugt, aber `npm run db:migrate` wurde in dieser Session nicht gegen eine laufende DB ausgefuehrt
- **Kein End-to-End-Smoke-Test** - Register/Login/Projekt/Suche/Export wurden noch nicht als kompletter Flow durchgetestet
- **Keine Test-Suite** - keine Unit- oder Integration-Tests vorhanden
- **Playwright nicht aktiv** - installiert, aber keine Quelle nutzt es; fuer Gelbe Seiten reicht der aktuelle statische HTML-Pfad im validierten Fall noch aus
- **Gelbe Seiten Selektoren bleiben extern abhaengig** - Live-HTML wurde geprueft, kann sich aber jederzeit wieder aendern
- **Keine automatisierten Parser-/Dedup-/Export-Tests** - reproduzierbare Inline-Checks gemacht, aber noch keine committed Testdateien
- **Dashboard nur gegen API verifiziert** - neue Such-/Follow-up-Filter sind build- und lint-gruen, aber noch nicht in einem manuellen Browser-Smoke-Test mit echter DB durchgeklickt
- **Lead-Arbeitsflaechen nur technisch verifiziert** - Schnellaktionen, Mobile-Karten und Detailseiten-Workflows sind build-/lint-gruen, aber noch nicht manuell im Browser gegen echte Daten abgenommen
- **Admin-UI fehlt** - ADMIN-Rolle im Schema, aber kein Admin-Bereich
- **Einladungslogik fehlt** - noch nicht implementiert
- **Plan-Upgrade Flow fehlt** - Stripe vorbereitet, aber kein Code
- **Layout-Session bleibt JWT-basiert** - API-Guards sind authoritativ ueber DB, aber ein reiner UI-Planwechsel ohne neues Session-Issue ist nicht separat getestet

## Risiken

- next-auth v5 beta kann noch API-Aenderungen haben
- Prisma 7 + Adapter-Pfad ist build-verifiziert, sollte aber nach echter DB-Migration noch einmal gegen reale Queries geprueft werden
- Es gibt weiterhin keine CI-Absicherung
- `main` ist noch nicht release-faehig, solange DB-Migration und Smoke-Test fehlen
