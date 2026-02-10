# Signal Nook

**Daily AI signals, curated and structured.**

Signal Nook is a full-stack Next.js app for generating and browsing daily AI ecosystem editions. It includes:

- A polished edition reader with stream sections, URL-driven filters, cards/compact views, signal details modal, pinning, and exports.
- A searchable editions library with heat filters and trend sparkline.
- Source management with enable toggles, add-source form, and per-source test fetch preview.
- Ops console with health checks, ingestion runs, secure run-now action, and log downloads.
- Prisma schema + migrations + seed data (including edition `2026-02-10` with 43 signals).
- Manual ingestion pipeline with OpenAI Responses API classification + deterministic fallback heuristics.

## Tech Stack

- Next.js 16 (App Router) + strict TypeScript
- Tailwind CSS + shadcn/ui
- Prisma ORM + SQLite (`DATABASE_URL=file:./dev.db`)
- OpenAI Node SDK (`openai`) via Responses API
- Zod runtime validation
- Vitest tests

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment:

```bash
# PowerShell
Copy-Item .env.example .env
```

3. Start locally with one command (runs migrations + seed + dev):

```bash
pnpm dev:ready
```

Then open `http://localhost:3000`.

## Environment Variables

Create `.env` with:

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4.1-mini"
ADMIN_SECRET="change-me"
INGESTION_MAX_ITEMS="60"
```

Notes:
- If `OPENAI_API_KEY` is missing, ingestion automatically falls back to deterministic heuristics and marks confidence `UNVERIFIED`.
- `ADMIN_SECRET` is required for `POST /api/ops/run-now`.

## Seeded Data

`pnpm db:seed` inserts:

- 5 editions (newest: `2026-02-10`)
- `2026-02-10` distribution: **43 total**, **HOT 1**, **NOTABLE 16**, **QUIET 26**
- 8 sources spanning RSS, GitHub releases, npm updates, Reddit RSS, and custom RSS
- ingestion run history records

## Core Routes

- `/` Today
- `/editions` Library
- `/editions/[date]` Edition detail
- `/sources` Sources
- `/ops` Ops

## API Routes

- `GET /api/editions/latest`
- `GET /api/editions/[date]`
- `GET /api/editions`
- `GET /api/library`
- `GET /api/signals/search?q=...`
- `GET /api/sources`
- `POST /api/sources`
- `PATCH /api/sources/[id]`
- `POST /api/sources/[id]/test`
- `GET /api/ops/health`
- `GET /api/ops/runs`
- `POST /api/ops/run-now`
- `GET /api/ops/log/latest`
- `GET /api/ops/log/[id]`

## Ingestion

Run manual ingestion for a date:

```bash
pnpm ingest -- --date 2026-02-10
```

Pipeline behavior:

1. Loads enabled sources
2. Fetches raw items
3. Canonical URL dedupe
4. Classifies with OpenAI Responses API + Zod validation (retry once on validation failure)
5. Falls back to heuristics when needed
6. Assigns stream/headliners ranking
7. Upserts edition and transactionally replaces signals
8. Writes `IngestionRun` + log text + log file in `logs/`

## Ops Run-Now Example

```bash
curl -X POST http://localhost:3000/api/ops/run-now \
  -H "content-type: application/json" \
  -d '{"adminSecret":"change-me","date":"2026-02-10"}'
```

## Commands

```bash
pnpm dev            # start Next dev server
pnpm dev:ready      # migrate + seed + dev
pnpm db:migrate     # apply prisma migrations
pnpm db:seed        # reseed database
pnpm ingest -- --date YYYY-MM-DD
pnpm lint
pnpm test
pnpm build
```

## Testing

Vitest coverage includes:

- Zod classification schema validation
- canonical URL normalization + dedupe
- heuristic track/stream mapping

Run with:

```bash
pnpm test
```
