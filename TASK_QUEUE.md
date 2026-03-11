# TASK_QUEUE.md

## Priority Legend
- P1 — Blocking / must do first
- P2 — High priority, do next
- P3 — Medium priority
- P4 — Nice to have / future

---

## Active Tasks

### [P1] Define project scope and tech stack
- **Status:** TODO
- **Files:** README.md (create), ARCHITECTURE.md (update)
- **Expected outcome:** Clear language choice, target data sources, output format, and dependencies documented.
- **Blockers:** Requires human input on project goals.

### [P1] Create README.md
- **Status:** TODO
- **Files:** README.md
- **Expected outcome:** Repository has a README with project description, setup instructions, and usage examples.
- **Blockers:** None (can use placeholders until scope is defined).

### [P1] Create .gitignore
- **Status:** TODO
- **Files:** .gitignore
- **Expected outcome:** `.env`, `node_modules/`, `__pycache__/`, build artifacts, and OS files are excluded from git.
- **Blockers:** None.

### [P2] Initialize project skeleton
- **Status:** TODO
- **Files:** Depends on chosen tech stack (e.g., `src/`, `package.json`, `requirements.txt`)
- **Expected outcome:** A runnable (even if minimal) project structure exists.
- **Blockers:** Requires tech stack decision (P1 above).

### [P2] Implement scraper engine
- **Status:** TODO
- **Files:** [PLACEHOLDER — update once skeleton exists]
- **Expected outcome:** Can fetch raw data from at least one lead source.
- **Blockers:** Project skeleton (P2 above), legal/ToS review.

### [P2] Implement data parser / normalizer
- **Status:** TODO
- **Files:** [PLACEHOLDER]
- **Expected outcome:** Raw scraped data is cleaned and structured into a consistent schema.
- **Blockers:** Scraper engine.

### [P3] Implement storage layer
- **Status:** TODO
- **Files:** [PLACEHOLDER]
- **Expected outcome:** Parsed leads are saved to a file or database.
- **Blockers:** Data parser.

### [P3] Add test suite
- **Status:** TODO
- **Files:** [PLACEHOLDER — e.g., `tests/`]
- **Expected outcome:** At least unit tests for parser and scraper modules.
- **Blockers:** Core modules must exist first.

### [P4] Add CLI interface
- **Status:** TODO
- **Files:** [PLACEHOLDER]
- **Expected outcome:** User can run the scraper via a command-line interface with arguments for source, output, etc.
- **Blockers:** Core modules.

---

## Completed Tasks
- [2026-03-11] Repository initialized and control files created.
