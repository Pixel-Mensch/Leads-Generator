# Copilot Instructions

## Control-Dateien zuerst lesen
Vor Code-Vorschlaegen oder Generierung in dieser Reihenfolge lesen:
1. AGENTS.md
2. PROJECT_STATE.md
3. TASK_QUEUE.md
4. ARCHITECTURE.md
5. SESSION_HANDOFF.md

## Stack und Konventionen
- TypeScript, Next.js 16 App Router, Tailwind CSS 4
- Prisma 7 mit `prisma.config.ts`
- Runtime-DB-Zugriff ueber `@prisma/adapter-pg` und `pg`
- Typen immer aus `@prisma/client`
- API-Validierung mit Zod und `.safeParse()`
- Alle DB-Zugriffe ueber `lib/db.ts`
- Scraper-Quellen in `lib/scraper/sources/`, Orchestrierung in `lib/scraper/orchestrator.ts`
- Export-Aufbereitung zentral in `lib/export/leadExport.ts`; CSV/XLSX sollen dieselben Felder und Metadaten verwenden

## Auth und Ownership
- next-auth v5 beta mit JWT-Strategie
- `proxy.ts` schuetzt nur App-Seiten; API-Routen liefern Auth-Fehler selbst
- Jede API-Route startet mit `const { session, error } = await requireAuth()` aus `lib/session.ts`
- `requireAuth()` liest den aktuellen User aus der DB und prueft `isActive`
- Alle DB-Queries filtern per `userId: session.user.id`
- Ownership-Verletzungen -> 404 statt 403
- Lead-Listen duerfen nur innerhalb desselben eigenen Projekts zugeordnet werden
- Plan-Limits pruefen mit `checkJobLimit()` / `checkProjectLimit()` / `checkLeadListLimit()` aus `lib/limits.ts`

## Projekt-Modell
- Projects haben Soft Delete: `where: { deletedAt: null }`
- Ressourcen-Kette: User -> Project -> (LeadList, SearchJob) -> Lead
- SearchJob.userId und SearchJob.projectId sind nullable
- Initial-Migration liegt in `prisma/migrations/20260311081500_init`

## Branch-Praeferenz
- `dev` ist der Standard-Arbeitsbranch
- Feature-Branches von `dev` abzweigen: `feat/`, `fix/`, `chore/`
- Kein Merge nach `main` ohne erfolgreiches `npm run db:generate`, `npm run build`, `npm run lint`, Live-Migration, Smoke-Test und Handoff-Update

## Lokaler Minimalstart
- `.env.example` nach `.env` kopieren
- `AUTH_SECRET` lokal setzen
- `docker compose up db -d`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run dev`
- Aktuelle externe Quellen: Overpass, Nominatim, Gelbe Seiten; dafuer sind derzeit keine API-Keys noetig

## Aenderungsdisziplin
- Kleine, fokussierte Aenderungen - ein Concern pro Commit
- Kein Refactoring ausserhalb der aktuellen Aufgabe
- Keine spekulativen Features

## Dokumentation
- Nach jeder bedeutsamen Aenderung: PROJECT_STATE.md, TASK_QUEUE.md, SESSION_HANDOFF.md aktualisieren
- ARCHITECTURE.md aktualisieren, wenn sich Struktur oder Release-Gates aendern
- README aktuell halten, wenn sich Startpfad, Scripts oder Setup aendern

## Sicherheit
- Nie Secrets, API-Keys oder Credentials committen
- `AUTH_SECRET` immer aus `.env`
- `.env` ist lokal erlaubt, aber nie committen

## Testing
- Vor Commit `npm run db:generate && npm run build && npm run lint` ausfuehren
- Fuer Release-Kandidaten zusaetzlich Live-Migration und manuellen Smoke-Test ausfuehren
- Fehlende Tests in PROJECT_STATE.md dokumentieren
- Fuer Scraper-/Export-Aenderungen nach Moeglichkeit mindestens `db:generate`, `lint`, `build` plus einen kleinen Live-/HTML-Check dokumentieren
