# Copilot Instructions

## Control-Dateien zuerst lesen
Vor Code-Vorschlägen oder Generierung in dieser Reihenfolge lesen:
1. AGENTS.md
2. PROJECT_STATE.md
3. TASK_QUEUE.md
4. ARCHITECTURE.md
5. SESSION_HANDOFF.md

## Stack und Konventionen
- TypeScript, Next.js 16 App Router, Tailwind CSS 4
- Prisma 7 + PostgreSQL — Typen immer aus `@prisma/client`
- API-Validierung mit Zod — immer `.safeParse()` verwenden
- Alle DB-Zugriffe über `lib/db.ts` (Prisma Singleton)
- Scraper-Quellen in `lib/scraper/sources/`, Orchestrierung in `lib/scraper/orchestrator.ts`

## Branch-Präferenz
- Arbeitsbranch: `dev`
- Kein Merge nach `main` ohne erfolgreichen Build-Test und Handoff-Update

## Änderungsdisziplin
- Kleine, fokussierte Änderungen — ein Concern pro Commit
- Kein Refactoring außerhalb der aktuellen Aufgabe
- Keine spekulativen Features

## Dokumentation
- Nach jeder bedeutsamen Änderung: PROJECT_STATE.md, TASK_QUEUE.md, SESSION_HANDOFF.md aktualisieren

## Sicherheit
- Nie Secrets, API-Keys oder Credentials committen
- Immer Umgebungsvariablen nutzen — `.env` ist in `.gitignore`

## Testing
- Vor Commit `npm run build` ausführen (kein TypeScript-Fehler)
- Fehlende Tests in PROJECT_STATE.md dokumentieren
