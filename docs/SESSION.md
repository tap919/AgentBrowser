## Goal
Complete AgentBrowser by downloading books from Google Drive and producing knowledge maps so the agent can search/reference coding, math, and finance content during tasks.

## Constraints & Preferences
- Books live in `data/books/` with category subdirectories (Business, Computers, financial, Math, etc.)
- Mixed formats: PDF (parsed via `pdf-parse`), EPUB (parsed via `epub`), TXT/MD (read directly)
- Usage pattern: agent queries books via `POST /api/books/search` to get ranked passage hits
- Books integration available as `knowledge-search` step type in workflow engine
- Drive 1 (`1VmJTDygrEmO56JR5h_IvvuUpIrhzJYYH`) has 13 categories — 744 files total
- Drive 2 (`10Ao1tkVftZBGROEIegB55DR6IAx-5k7k`) — not yet investigated

## Progress
### Done
- **Security** — SSRF fix in Mutly proxy (`safeId()` regex), API key leak fix, timing attack fix (`timingSafeEqual`), abort controller leak fix, `node:fs` client bundle fix (webpack fallback), input length limits, dead code removal
- **TypeScript** — 0 errors after fixes (dead code, union variants, null type mismatches)
- **Tests** — all 240 pass (36 suites); Playwright excluded from vitest
- **Core book module** (`src/lib/books.ts`) — `scanAndIndex()`, `getCatalog()`, `searchBooks()` with line-scoring, PDF/EPUB/TXT extraction
- **API routes** — `GET /api/books`, `POST /api/books/search`, `POST /api/books/index`
- **Service hub** — `searchBooks()`, `getBookCatalog()` added
- **Workflow engine** — `'knowledge-search'` step type
- **Full book catalog** saved as `src/data/books-catalog.json` — 744 files from Drive 1 with download URLs across 13 categories
- **Knowledge map** created at `docs/KNOWLEDGE-MAP.md`
- **Book indexing** run — 29 books extracted to `data/books/.text/` for fast search

### Books Downloaded (47 indexed + 17 unindexed = 64 total files)
**Computers (27)**: python-crash-course-2nd-ed, automate-the-boring-stuff-2nd-ed, serious-python, real-world-python, object-oriented-python, beyond-basic-stuff-python, impractical-python-projects, practical-deep-learning-python-intro, dive-into-algorithms-python, learn-to-code-by-solving-problems, big-book-data-science-2025, think-distributed-systems-2025, logic-for-programmers-2025, artificial-intelligence-insights-hbr, designing-data-intensive-applications, data-structure-in-python-2024, chat-gpt-bible-10-books-1, the-complete-developer-ts-react-nextjs, coding-with-ai-for-dummies, encyclopedia-data-warehousing, software-engineering-at-google, quantum-computing-essential-math-2023, chatgpt-decoded, ceh-study-guide-2025, javascript-for-sound-artists, quantum-computing-deeper-understanding-2025, thinking-programs-logic-2026, complete-python-coding-manual-2024, building-data-science-apps-fastapi, big-book-data-science-part1-2025

**Business (9)**: how-to-win-friends, thinking-fast-and-slow, limitless-jim-kwik, business-intelligence-and-data-analysis-ai-2025, python-for-business-analytics-2025, diary-of-a-ceo, business-analytics-for-managers-2017, data-analysis-business-decisions-2025, modern-business-data-analyst-2024

**Math (7)**: essential-math-for-ai-2023, essential-math-for-data-science, math-for-digital-science-2025, calculus-with-applications-to-economics-2025, mathematical-physics-and-matrix-representations-2025, programming-logic-and-design-2024, risk-and-predictive-analytics-business-r-2025

**financial (6)**: 48-laws-of-power, 50-business-classics, art-of-statistics, how-to-day-trade, quantum-computing-essential-math-2023, risk-predictive-analytics-business-r-2025

### Known Issues
- ZAI SDK: requires `.z-ai-config` file in project root — feature unblocked once created
- All 744 files in catalog are accessible via URL/path mapping but `gdown` hits rate limits when downloading
- Remaining files are in subdirectories (not directly downloadable via gdown file ID) — would need `gdown --folder <subfolder-id>` or manual download
- Drive 2 ("Books 2") not explored — contains a single "Books" subfolder modified Jun 4

## Key Decisions
- VibeServe and RepoRank proxy endpoints live on Mutly — it already has circuit-breaker/retry/auth for both
- Fallback-to-direct pattern: if Mutly gateway is down, AgentBrowser still works
- Auth uses `timingSafeEqual` for comparison; `isAuthConfigured()` returns bool only (no API key leak)
- Books use grep-style text search (line scoring) rather than vector embeddings — sufficient for search-and-reference use case, no vector DB needed
- Extracted text cached as `.txt` in `data/books/.text/` (gitignored); PDF/EPUB extracted once per file
- Webpack `resolve.fallback` chosen for `node:fs` client bundle fix — cleanest approach, Node.js modules become empty stubs in client context

## Next Steps
1. Create `.z-ai-config` in project root to unblock ZAI SDK-dependent features
2. Download more books via `gdown --folder` on specific subfolders (Designing Data-Intensive Applications, etc.)
3. Investigate Drive 2 "Books" subfolder contents
4. Wire book search into agent workflows more tightly (automate pre-search before agent tasks)

## Relevant Files
- `src/lib/books.ts`: Core book module — `scanAndIndex()`, `getCatalog()`, `searchBooks()`
- `src/app/api/books/route.ts`: `GET` catalog, `POST` re-index
- `src/app/api/books/search/route.ts`: `POST` search with query, optional category/limit
- `src/app/api/books/index/route.ts`: `POST` trigger full re-index
- `src/lib/service-hub.ts`: `searchBooks()`, `getBookCatalog()`
- `src/lib/workflow-engine.ts`: `'knowledge-search'` step type
- `src/data/books-catalog.json`: Full catalog of 744 Drive 1 files with download IDs
- `docs/KNOWLEDGE-MAP.md`: Book-to-agent-task mapping

## Catalog Breakdown (744 files total)
- Comics: 177 | Health Fitness: 119 | Science: 117 | Computers: 71
- Life: 49 | Business: 48 | Analytics: 42 | Math: 34
- financial: 30 | Chess: 24 | Other: 19 | Game Development: 15

## How to Use
```bash
# Re-index after adding books
curl -X POST http://localhost:3000/api/books/index

# Search
curl -X POST http://localhost:3000/api/books/search \
  -H "Content-Type: application/json" \
  -d '{"query":"python","category":"Computers","limit":5}'
```
