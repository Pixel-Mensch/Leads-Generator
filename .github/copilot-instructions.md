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
- Prisma 7 + PostgreSQL - Typen immer aus `@prisma/client`
- API-Validierung mit Zod - immer `.safeParse()` verwenden
- Alle DB-Zugriffe ueber `lib/db.ts` (Prisma Singleton)
- Scraper-Quellen in `lib/scraper/sources/`, Orchestrierung in `lib/scraper/orchestrator.ts`

## Auth und Ownership
- next-auth v5 beta mit JWT-Strategie - kein Session-Table
- Jede API-Route startet mit `const { session, error } = await requireAuth()` aus `lib/session.ts`
- Alle DB-Queries filtern per `userId: session.user.id` - niemals ohne User-Scope
- Ownership-Verletzungen -> 404 zurueckgeben, nicht 403
- Plan-Limits pruefen mit `checkJobLimit()` / `checkProjectLimit()` aus `lib/limits.ts`

## Projekt-Modell
- Projects haben Soft Delete: `where: { deletedAt: null }` bei allen Listabfragen
- Ressourcen-Kette: User -> Project -> (LeadList, SearchJob) -> Lead
- SearchJob.userId und SearchJob.projectId sind nullable (Rueckwaertskompatibilitaet)

## Branch-Praeferenz
- `dev` ist der Standard-Arbeitsbranch
- Feature-Branches von `dev` abzweigen: `feat/`, `fix/`, `chore/`
- Kein Merge nach `main` ohne erfolgreiches `npm run db:generate`, `npm run build`, `npm run lint` und Handoff-Update

## Aenderungsdisziplin
- Kleine, fokussierte Aenderungen - ein Concern pro Commit
- Kein Refactoring ausserhalb der aktuellen Aufgabe
- Keine spekulativen Features

## Dokumentation
- Nach jeder bedeutsamen Aenderung: PROJECT_STATE.md, TASK_QUEUE.md, SESSION_HANDOFF.md aktualisieren
- ARCHITECTURE.md aktualisieren, wenn sich Struktur oder Release-Gates aendern

## Sicherheit
- Nie Secrets, API-Keys oder Credentials committen
- AUTH_SECRET immer aus `.env` - `openssl rand -base64 32` zum Generieren
- Immer Umgebungsvariablen nutzen - `.env` ist in `.gitignore`

## Testing
- Vor Commit `npm run db:generate && npm run build && npm run lint` ausfuehren
- Fehlende Tests in PROJECT_STATE.md dokumentieren
