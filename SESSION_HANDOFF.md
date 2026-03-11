# SESSION_HANDOFF.md

## Stabilisierungssession (2026-03-11)

### Ergebnis

**`dev` ist technisch deutlich stabiler, lokal bootbar und um die kritischen SaaS-Schutzpfade gehaertet. `main` bleibt blockiert, bis die DB live gestartet, die Migration angewendet und der Kernflow mit echter Auth/Search/Export-Nutzung getestet wurde.**

### Was umgesetzt wurde

**Tooling und Runtime:**
- Prisma 7 auf `prisma.config.ts` umgestellt
- Runtime auf `@prisma/adapter-pg` + `pg` angepasst
- Next.js 16 von `middleware.ts` auf `proxy.ts` umgestellt
- Dockerfile fuer Build-Zeit-Env abgesichert

**Code-Fixes:**
- React-Lint-Fehler in `app/page.tsx` und `app/projects/page.tsx` behoben
- XLSX-Export-Rueckgabe fuer `NextResponse` typkorrigiert
- `requireAuth()` liest User-Status jetzt aus der DB statt nur aus dem JWT
- Login und Registrierung normalisieren E-Mail-Adressen
- Listen-Limits werden serverseitig erzwungen
- Lead-Listen-Zuordnung ist auf das eigene Projekt begrenzt
- Job-Starts sind nur noch aus `PENDING` moeglich
- Scraper respektiert echte Plan-Limits fuer Leads pro Job
- Protected Pages leiten jetzt real auf `/login` um
- Search-/Project-UI zeigen Limit- und Fehlerfeedback

**DB / Ops:**
- Initial-Migration erzeugt: `prisma/migrations/20260311081500_init/migration.sql`
- `migration_lock.toml` angelegt
- `db:migrate:deploy` und `db:migrate:status` in `package.json` ergaenzt
- Compose-Warnung bereinigt (`version` entfernt)
- `.env.example` auf echten globalen Scrape-Cap gebracht

**Doku:**
- README auf echten Stack, echte SaaS-Schutzpfade und echten Startpfad gebracht
- PROJECT_STATE, TASK_QUEUE, ARCHITECTURE und Copilot-Instruktionen synchronisiert

### Reale Verifikation

- `npm run db:generate` -> erfolgreich
- `npm run lint` -> erfolgreich
- `npm run build` -> erfolgreich
- `docker compose config` -> erfolgreich
- Dev-Boot-Test -> `GET /login` lieferte `HTTP 200`
- Protected-Route-Test -> `GET /projects` lieferte `307 -> /login?...`
- Offline-Migrationscheck -> frisch generierter Empty->Schema-Diff stimmt mit der committed Migration ueberein

### Nicht erfolgreich bzw. noch offen

- `docker compose up db -d` -> fehlgeschlagen, weil der Docker-Desktop-Daemon auf diesem Host nicht lief
- `npm run db:migrate` -> deshalb in dieser Session nicht live ausgefuehrt
- Register/Login/Projekt/Suche/Export -> kein kompletter E2E-Smoke-Test gegen echte DB
- Keine automatisierten Tests vorhanden

---

## Aktueller Repo-Stand

- **Branch:** `dev`
- **Relevante neue Commits:**
  - `d935daf` - `fix: restore prisma build and next runtime path`
  - `fbd9f25` - `chore: add migration baseline and db workflow scripts`
  - `0b078a2` - `fix: harden saas auth and ownership paths`
  - `af2778b` - `fix: surface saas limits in ui and docs`
- **Relevanter `main`-Stand:** `c1a2276`
- **Status von `main`:** nicht freigegeben

---

## Was als naechstes getan werden muss

1. Docker Desktop / Docker-Daemon starten
2. `docker compose up db -d`
3. `npm run db:migrate`
4. Smoke-Test komplett ausfuehren:
   - `/register`
   - `/login`
   - `/projects`
   - `/search`
   - Dashboard Bulk-/Filter-/KPI-Funktionen
   - CSV/XLSX Export
5. Danach Release-Entscheidung fuer `main` neu treffen

---

## Relevante Dateien fuer die naechste Session

| Datei | Warum relevant |
|-------|----------------|
| `prisma.config.ts` | Prisma-7-CLI-Konfiguration |
| `lib/db.ts` | Prisma-Adapter fuer PostgreSQL |
| `proxy.ts` | Next.js 16 Schutzpfad fuer App-Seiten |
| `lib/session.ts` | DB-authoritative API-Auth |
| `lib/limits.ts` | SaaS-Limits fuer Jobs, Projekte, Listen und Leads |
| `prisma/migrations/20260311081500_init/migration.sql` | Initiale Datenbankmigration |
| `docker-compose.yml` | lokaler Postgres-Start |
| `README.md` | aktueller Start- und Verifikationspfad |

---

## Warnungen und bekannte Grenzfaelle

- `.env` wurde lokal fuer die Verifikation angelegt und ist nicht committed
- `.claude/settings.local.json` ist weiterhin lokal modifiziert und wurde bewusst nicht angeruehrt
- `main` darf nicht aktualisiert werden, bevor die Live-DB-Schritte wirklich gruen sind
