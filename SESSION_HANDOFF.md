# SESSION_HANDOFF.md

## Was in Session 3 umgesetzt wurde (2026-03-11)

### SaaS Foundation implementiert auf `feat/saas-foundation`:

**Datenmodell (prisma/schema.prisma):**
- `User` mit `role` (ADMIN/USER), `plan` (FREE/PRO/ENTERPRISE), `planExpiresAt`, Stripe-Felder, `isActive`
- `Project` mit Soft Delete (`deletedAt`), `userId` FK
- `LeadList` mit `projectId` FK
- `SearchJob.userId` + `SearchJob.projectId` (nullable FKs für Rückwärtskompatibilität)
- `Lead.listId` (nullable FK zu LeadList)

**Auth (lib/auth.ts, lib/session.ts, middleware.ts):**
- next-auth v5 beta, Credentials Provider (E-Mail + bcrypt Passwort)
- JWT-Strategie — kein Session-Table nötig
- `requireAuth()` Helper für alle API-Routen (gibt 401 oder Session zurück)
- Middleware schützt alle Routen außer `/login`, `/register`, `/api/auth`, `/api/register`
- `types/next-auth.d.ts` — TypeScript Session-Augmentation (id, role, plan)

**Plan-Limits (lib/limits.ts):**
- FREE: 10 Jobs/Monat, 50 Leads/Job, 2 Projekte
- PRO: 200 Jobs/Monat, 200 Leads/Job, 20 Projekte
- ENTERPRISE: ∞ Jobs, 500 Leads/Job, ∞ Projekte
- `checkJobLimit()` und `checkProjectLimit()` Hilfsfunktionen

**Neue + aktualisierte API-Routen:**
- `POST /api/register` — Öffentliche Registrierung mit Auto-Projekt
- `GET /api/me` — User-Profil + Usage-Stats gegen Plan-Limits
- `GET/POST /api/projects` — Projektliste + Erstellen (limit-geprüft)
- `GET/PATCH/DELETE /api/projects/:id` — Projekt-Detail (Soft Delete)
- `GET/POST /api/projects/:id/lists` — Lead-Listen
- Alle bestehenden Jobs/Leads/Export-Routen: ownership-gesichert per `userId`

**UI (neue Seiten/Komponenten):**
- `app/login/page.tsx` — Login-Formular (next-auth signIn)
- `app/register/page.tsx` — Registrierungsformular (POST /api/register)
- `app/projects/page.tsx` — Projektliste + Inline-Erstellen
- `app/projects/[id]/page.tsx` — Projektdetail: Jobs, Listen, Listen-Erstellen
- `components/NavUser.tsx` — Plan-Badge, Abmelden (signOut)
- `app/layout.tsx` — Server-Session, konditionale Nav-Links
- `app/search/page.tsx` — Projekt-Selector ergänzt

**Branch und Commits:**
- Branch: `feat/saas-foundation`
- Commit: `81c63be` — feat(saas): add auth, user model, projects, lead lists, ownership and plan limits

---

## Was bewusst NICHT umgesetzt wurde (Session 3)

- Build nicht ausgeführt — `npm run build` steht noch aus
- DB Migration noch nicht gelaufen — neues Schema noch nicht in Produktion
- Stripe/Billing — Felder im Schema, aber kein Code
- Admin-UI — Rolle vorbereitet, kein Interface
- Einladungslogik — nicht implementiert
- Playwright-Scraper — installiert aber nicht aktiv
- Lead-Detail-Link aus LeadsTable — noch nicht verlinkt

---

## Aktueller Repo-Stand

- **Branch:** `feat/saas-foundation`
- **Letzter Commit:** `81c63be` — SaaS Foundation vollständig committed
- **Build:** Noch nicht ausgeführt — `npm run build` steht aus
- **DB:** Noch nicht migriert — neues Schema mit User/Project/LeadList noch nicht applied
- **AUTH_SECRET:** Muss in .env gesetzt werden (nie committen)

---

## Was als nächstes getan werden muss

**Priorität 1 — vor erstem Start zwingend:**

1. AUTH_SECRET setzen:
   ```bash
   openssl rand -base64 32   # → in .env als AUTH_SECRET eintragen
   ```

2. Build testen:
   ```bash
   npm run db:generate
   npm run build
   ```
   Bekannte Risiken: next-auth v5 beta API-Änderungen, Zod v4

3. DB starten und migrieren:
   ```bash
   cp .env.example .env       # Werte anpassen
   docker compose up db -d
   npm run db:migrate
   ```

4. App testen (kompletter Flow):
   - `npm run dev`
   - /register aufrufen → User anlegen
   - /login → einloggen
   - /projects → Projekt erstellen
   - /search → Suche mit Projekt starten
   - Dashboard prüfen: Leads user-scoped? Export funktioniert?

**Priorität 2 — nach erfolgreichem Ersttest:**

5. Gelbe Seiten Selektoren live validieren
6. Lead-Detail-Link aus LeadsTable ergänzen
7. README Setup-Anleitung aktualisieren (AUTH_SECRET, Registration)

---

## Relevante Dateien für die nächste Session

| Datei | Warum relevant |
|-------|---------------|
| [lib/auth.ts](lib/auth.ts) | next-auth v5 Konfiguration — Build-Fehler hier möglich |
| [prisma/schema.prisma](prisma/schema.prisma) | Migration ausführen |
| [lib/limits.ts](lib/limits.ts) | Plan-Limits prüfen wenn Build scheitert |
| [app/api/jobs/route.ts](app/api/jobs/route.ts) | Ownership-Logik testen |
| [components/leads/LeadsTable.tsx](components/leads/LeadsTable.tsx) | Detail-Link ergänzen |

---

## Warnungen und Annahmen

- **Build nicht getestet:** TypeScript-Fehler sind möglich — insbesondere next-auth v5 beta, Zod v4-API, Prisma-Typen vor `prisma generate`.
- **next-auth v5 beta:** API kann sich noch ändern. Falls Fehler: Changelog unter https://authjs.dev prüfen.
- **Zod v4:** `.flatten()` und `.safeParse()` sind kompatibel, aber `z.string().datetime()` Verhalten prüfen.
- **Nullable FKs:** `SearchJob.userId` und `SearchJob.projectId` sind nullable — Migration ist rückwärtskompatibel.
- **AUTH_SECRET zwingend:** Ohne AUTH_SECRET startet next-auth nicht — nie in git committen.
- **Soft Delete:** Gelöschte Projekte (`deletedAt != null`) müssen in allen Queries gefiltert werden — prüfe `where: { deletedAt: null }` in Projektabfragen.
