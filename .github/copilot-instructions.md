# Copilot Instructions

## Read Control Files First
Before suggesting or generating code, read in order:
1. AGENTS.md
2. PROJECT_STATE.md
3. TASK_QUEUE.md
4. ARCHITECTURE.md
5. SESSION_HANDOFF.md

## Branch Preference
- Default working branch is `dev`.
- Do not suggest merging to `main` unless the work is verified.

## Change Discipline
- Keep changes small and focused on the current task.
- Do not refactor code outside the task scope.
- Do not add unrequested features.

## Documentation
- Update PROJECT_STATE.md, TASK_QUEUE.md, and SESSION_HANDOFF.md after meaningful changes.

## Security
- Never suggest committing secrets, API keys, or credentials.
- Use environment variables. Ensure `.env` is in `.gitignore`.

## Testing
- Run existing tests before suggesting a commit.
- Flag missing test coverage in PROJECT_STATE.md.
