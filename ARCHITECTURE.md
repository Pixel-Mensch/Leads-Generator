# ARCHITECTURE.md

> **Note:** The project has not been implemented yet. This file describes the intended architecture based on the project name and context. Update this file as real decisions are made.

## High-Level Structure
```
Leads-Scraper/
├── src/                    # [PLACEHOLDER] Main source code
│   ├── scraper/            # Fetches raw data from sources
│   ├── parser/             # Normalizes and structures data
│   ├── storage/            # Persists output (CSV, DB, JSON)
│   └── cli.py / index.ts  # Entry point / CLI interface
├── tests/                  # [PLACEHOLDER] Test suite
├── .env.example            # Environment variable template (no real values)
├── .gitignore
├── README.md               # [MISSING — needs to be created]
└── [build/dependency file] # e.g., package.json or requirements.txt
```

## Main Modules and Responsibilities

| Module | Responsibility |
|--------|---------------|
| `scraper/` | HTTP requests, browser automation, rate limiting, pagination |
| `parser/` | Field extraction, data normalization, deduplication |
| `storage/` | Writing results to CSV / JSON / database |
| `cli` / entry point | Argument parsing, orchestrating the pipeline |

## Entry Points
> [PLACEHOLDER] Will be defined once tech stack is chosen.
- Likely: `python main.py` or `node src/index.js` or similar.

## Important Flows

### Lead Scraping Pipeline (intended)
```
User invokes CLI
  → Scraper fetches pages from target source(s)
  → Parser extracts and normalizes lead fields
  → Storage writes output (CSV / JSON / DB)
  → CLI reports summary to user
```

## Important Files
> [PLACEHOLDER — populate as files are created]

| File | Purpose |
|------|---------|
| README.md | Setup and usage documentation (MISSING) |
| .gitignore | Prevents secrets and build artifacts from being committed |
| .env.example | Template for required environment variables |

## Technology Decisions
> [NOT YET DECIDED]
- Language: Unknown (Python and Node.js are common choices for scrapers)
- HTTP client: Unknown (e.g., requests, httpx, axios, playwright)
- Storage: Unknown (CSV, SQLite, PostgreSQL, MongoDB)
- Testing: Unknown (pytest, jest, mocha)

## Known Architecture Gaps
- No source code exists yet.
- No dependency management file.
- No test infrastructure.
