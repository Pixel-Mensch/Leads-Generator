# AGENTS.md — AI Agent Workflow Guide

## Mandatory Read Order
Before touching any code, read these files in order:
1. AGENTS.md (this file)
2. PROJECT_STATE.md
3. TASK_QUEUE.md
4. ARCHITECTURE.md
5. SESSION_HANDOFF.md
6. README.md (if it exists)
7. .github/copilot-instructions.md (when working in a Copilot context)

## Branch Workflow
- `main` — stable, protected. Do not push broken code here.
- `dev` — default working branch. All development happens here.
- Feature branches — only when there is a clear structural reason (e.g., `feat/scraper-engine`). Otherwise work directly on `dev`.
- Never merge `dev` → `main` unless the work is verified and SESSION_HANDOFF.md is updated.

## Reading Strategy
- Do NOT perform a full repository scan by default.
- Start with the control files listed above.
- Read only the files required for the current task.
- If unsure what files are relevant, check ARCHITECTURE.md first.

## Change Discipline
- Make small, focused, logically separated commits.
- One concern per commit. Do not bundle unrelated changes.
- Do not refactor code outside the current task scope.
- Do not add features not required by the current task.

## Documentation Updates
After any meaningful change:
- Update PROJECT_STATE.md (current state, completed work).
- Update TASK_QUEUE.md (mark tasks done, add new ones).
- Update SESSION_HANDOFF.md (what was done, what is next).
- Update ARCHITECTURE.md only if the structure changed.

## Testing Expectations
- Run existing tests before committing if a test suite is present.
- Do not commit code that breaks known passing tests.
- If no tests exist, note this in PROJECT_STATE.md as a gap.

## Security Rules
- Never commit secrets, API keys, tokens, or credentials.
- Use environment variables or `.env` files (ensure `.env` is in `.gitignore`).
- If secrets are found in the codebase, flag them in PROJECT_STATE.md under Risks without printing the values.

## Handoff Requirement
- Leave the repository handoff ready after every completed step.
- SESSION_HANDOFF.md must always reflect the current state before ending a session.
