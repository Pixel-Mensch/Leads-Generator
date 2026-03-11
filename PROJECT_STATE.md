# PROJECT_STATE.md

## Projektzweck
**Leads Scraper** - B2B Lead Generator mit SaaS-faehiger Architektur.
Sammelt oeffentlich auffindbare Unternehmensdaten nach Branche, Ort und Radius.
Speichert in PostgreSQL, stellt Vertriebsstatus, Projekte, Lead-Listen und CSV/XLSX-Export bereit.
Auth via next-auth (JWT), plan-basierte Limits, Billing-Felder vorbereitet.

## Aktueller Stand (2026-03-11, lokaler E2E-Kernworkflow real verifiziert)

**`dev` ist jetzt lokal real startbar, der Kernworkflow wurde im Browser voll durchlaufen und als Playwright-Smoke-Test abgelegt. Docker-Postgres, Prisma-Migration, Register, Login, Projektanlage, Overpass-Suche, Lead-Anzeige, Detailseite, Statuswechsel sowie CSV/XLSX-Export wurden gegen laufende lokale Dienste verifiziert. `main` wird in dieser Session trotzdem nicht automatisch promoted; offenes Restrisiko bleibt vor allem der fehlende frische Gelbe-Seiten-Live-Smoke-Test.**

- `dev` enthaelt nach dem Release-Audit weitere Stabilisierungs- und SaaS-Haertungs-Commits
- `npm run db:generate` laeuft wieder
- `docker compose up db -d` wurde erfolgreich gegen Docker Desktop ausgefuehrt; der `db`-Container ist healthy
- `npm run db:migrate` wurde erfolgreich gegen die laufende lokale Postgres-DB ausgefuehrt
- `npm run db:migrate:status` meldet jetzt `Database schema is up to date`
- `npm run lint` laeuft wieder
- `npm run build` laeuft wieder
- Prisma 7 laeuft jetzt ueber `prisma.config.ts` und `@prisma/adapter-pg`
- Next.js 16 nutzt `proxy.ts` statt `middleware.ts`, und unautorisierte Seitenzugriffe auf `/projects` wurden real mit `307 -> /login` verifiziert
- Eine Initial-Migration ist versioniert in `prisma/migrations/20260311081500_init`
- Lokaler Dev-Boot wurde gegen `/login` mit `HTTP 200` geprueft
- Registrierung, Credentials-Login, `/api/me` und `/api/projects` wurden gegen die echte lokale DB verifiziert
- Authentifizierte Seiten `/`, `/projects` und `/search` liefern mit Session `HTTP 200`
- Ein vollstaendiger Browser-E2E-Kernflow wurde erfolgreich durchlaufen: Register -> Login -> Projekt anlegen -> Suche -> Leads -> Detailseite -> Statuswechsel -> Export
- Ein reproduzierbarer Playwright-Smoke-Test fuer genau diesen Kernworkflow liegt jetzt in `tests/e2e/core-workflow.spec.ts`
- `npm run test:e2e:core` startet die App jetzt selbst ueber Playwright `webServer` statt einen manuell laufenden Dev-Server vorauszusetzen
- Ein echter Overpass-Job lief lokal auf `COMPLETED` und speicherte 50 Leads
- CSV- und XLSX-Export wurden lokal mit echtem Job/Lead-Bestand auf `HTTP 200` verifiziert
- Login-, Register- und Suchformulare besitzen jetzt saubere Label-zu-Input-Verknuepfungen; Projekt- und Listenanlage wurden fuer Browser- und Accessibility-Nutzung mit `aria-label` nachgeschaerft
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
| PostgreSQL | 16 | Docker Compose lokal verifiziert |
| next-auth | v5 beta | JWT-Auth implementiert |
| bcryptjs | 3.x | Passwort-Hashing aktiv |
| Cheerio | 1.x | Gelbe Seiten Scraper |
| Playwright | 1.x | installiert, E2E-Smoke-Test aktiv |
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
| Initial-Migration | fertig, live auf lokaler Docker-DB angewendet |

## Bekannte Probleme / Luecken

- **Keine breite Test-Suite** - ein Playwright-Kernworkflow-Smoke-Test ist vorhanden, aber keine Unit- oder Integrations-Tests
- **Gelbe Seiten in dieser Session nicht live als kompletter Job erneut verifiziert** - der lokale Such-Smoke lief ueber Overpass
- **Playwright nicht aktiv** - installiert, aber keine Quelle nutzt es; fuer Gelbe Seiten reicht der aktuelle statische HTML-Pfad im validierten Fall noch aus
- **Gelbe Seiten Selektoren bleiben extern abhaengig** - Live-HTML wurde geprueft, kann sich aber jederzeit wieder aendern
- **Keine automatisierten Parser-/Dedup-/Export-Tests** - reproduzierbare Inline-Checks gemacht, aber noch keine committed Testdateien
- **Dashboard-Filter nicht breit regressionsgesichert** - Kernpfad und Statusfilter wurden im Browser verifiziert, aber nicht alle Filterkombinationen
- **Lead-Arbeitsflaechen nur im Kernpfad regressionsgesichert** - Detailseite und Statuswechsel sind im Playwright-Smoke abgedeckt, aber nicht alle Varianten
- **Admin-UI fehlt** - ADMIN-Rolle im Schema, aber kein Admin-Bereich
- **Einladungslogik fehlt** - noch nicht implementiert
- **Plan-Upgrade Flow fehlt** - Stripe vorbereitet, aber kein Code
- **Layout-Session bleibt JWT-basiert** - API-Guards sind authoritativ ueber DB, aber ein reiner UI-Planwechsel ohne neues Session-Issue ist nicht separat getestet

## Risiken

- next-auth v5 beta kann noch API-Aenderungen haben
- Prisma 7 + Adapter-Pfad ist jetzt build- und live-query-verifiziert, bleibt aber ohne automatisierte Tests regressionsanfaellig
- Es gibt weiterhin keine CI-Absicherung
- `main` sollte erst nach einer expliziten Release-Entscheidung und idealerweise nach einem zusaetzlichen Gelbe-Seiten-Smoke aktualisiert werden
