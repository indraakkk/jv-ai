# Jackson Ventures — AI Agentic Platform Engineer: Master Plan

## Context

Jackson Ventures hiring test: build an AI-powered company research agent system. The system collects startup data, analyzes it via Claude API, stores enriched results in PostgreSQL, and exposes them through a REST API. Built using the claude-orchestration-template with Bun + Effect-TS + Drizzle + devenv + rtk. All HTTP serving via `@effect/platform` (no Hono) — fully idiomatic Effect-TS. Claude Code is the agentic tool. Only Claude-related tooling (skip Codex/OpenClaw references).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Language | TypeScript (strict) |
| Framework | Effect-TS (`effect`, `@effect/platform`, `@effect/platform-bun`) |
| HTTP Server | `@effect/platform` HttpServer/HttpRouter/HttpApp + Bun adapter |
| Database | PostgreSQL 16 (docker-compose) |
| ORM | Drizzle (SQL-like syntax only, pgEnum, uuid PKs) |
| AI/LLM | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Dev Environment | devenv (Nix-based) |
| CLI Prefix | rtk (all shell commands) |
| Orchestration | claude-orchestration-template (multi-agent, 16-phase) |

## Monorepo Structure

```
jackson-ventures/
├── .claude/                    # From template (agents, commands, skills, hooks)
│   └── commands/
│       └── research-company.md # BONUS: custom slash command
├── .serena/project.yml         # Code intelligence config
├── .data/                      # Agent runtime state
├── CLAUDE.md                   # Generated from template + customized
├── mcp.json                    # MCP servers (serena + jackson-ventures)
├── docker-compose.yml          # PostgreSQL 16
├── package.json                # Workspace root
├── tsconfig.json               # Root TS config (strict)
├── .env.example                # DATABASE_URL, ANTHROPIC_API_KEY, PORT
├── .gitignore
├── README.md
│
├── packages/
│   ├── shared/                 # Branded types, errors, schemas
│   │   └── src/
│   │       ├── index.ts
│   │       ├── branded-types.ts
│   │       ├── errors.ts
│   │       └── schemas.ts
│   │
│   ├── db/                     # Drizzle schema, client, repository
│   │   ├── drizzle.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schema.ts
│   │       ├── client.ts
│   │       ├── repository.ts
│   │       └── migrate.ts
│   │
│   ├── ai-agent/               # Claude API integration + multi-agent pipeline
│   │   └── src/
│   │       ├── index.ts
│   │       ├── ai-service.ts
│   │       ├── agents/
│   │       │   ├── research-agent.ts
│   │       │   └── analysis-agent.ts
│   │       └── prompts/
│   │           ├── analysis-prompt.ts
│   │           └── research-prompt.ts
│   │
│   ├── collector/              # Data collection (GitHub API + seed fallback)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── collector-service.ts
│   │       └── sources/
│   │           ├── github.ts
│   │           └── seed.ts
│   │
│   └── mcp-server/             # BONUS: MCP server exposing research tools
│       └── src/
│           ├── index.ts
│           └── tools.ts
│
├── services/
│   └── api/                    # @effect/platform HTTP server
│       └── src/
│           ├── index.ts        # Entry: Bun serve + Layer provision
│           ├── app.ts          # HttpRouter composition
│           ├── routes/
│           │   ├── companies.ts
│           │   ├── health.ts
│           │   └── pipeline.ts
│           └── middleware/
│               └── error-handler.ts
│
└── nix/                        # devenv config
    ├── flake.nix
    └── dev.nix
```

---

## Implementation Phases

### Phase 0 — Project Bootstrap

1. Copy template from `/Users/indra/claude-orchestration-template` into project
2. Configure `project.config.sh`:
   ```bash
   PROJECT_NAME="jackson-ventures"
   WORKSPACE_SCOPE="jackson-ventures"
   RUNTIME="bun"
   TEST_COMMAND="bun test"
   TYPECHECK_COMMAND="bunx tsc --noEmit"
   NIX_EVAL_COMMAND="nix flake check . --no-build"
   ```
3. Run `./setup.sh` (replaces placeholders, generates CLAUDE.md)
4. Customize CLAUDE.md: update Architecture section, add docker-compose commands
5. Init git, create root `package.json` (workspaces), `tsconfig.json`, `docker-compose.yml`, `.env.example`, `.gitignore`
6. Update `.claude/settings.json` with additional permissions (anthropic docs, docker, etc.)

### Phase 1 — Shared Foundation (`packages/shared`)

**No dependencies. Create first.**

- **`branded-types.ts`**: `CompanyId = string & Brand.Brand<"CompanyId">`
- **`errors.ts`**: Typed errors via `Data.TaggedError`:
  - `NotFoundError` (entity, id)
  - `AiAnalysisError` (companyName, cause)
  - `CollectionError` (source, cause)
  - `DatabaseError` (operation, cause)
- **`schemas.ts`**: `Effect.Schema` definitions:
  - `RawCompanyInput` — from collection (company_name, website?, description?)
  - `AiAnalysisOutput` — from Claude (industry, business_model, summary, use_case) with `Schema.Literal` unions matching pgEnum values
  - `CompanyRecord` — full DB record
  - `CompanyListItem` / `CompanyDetail` — API response shapes

### Phase 2 — Database (`packages/db`)

**Depends on: Phase 1**

- **`schema.ts`** — Drizzle table following template rules:
  - `uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7())`
  - `pgEnum` for `industry`, `business_model`, `analysis_status`
  - AI fields nullable (populated after analysis)
  - `analysis_status`: `pending | analyzing | completed | failed`
  - `raw_ai_response`: cached AI response (bonus: caching)
  - `created_at`, `updated_at` timestamps
- **`client.ts`** — `DatabaseService` as `Context.Tag` wrapping Drizzle client
- **`repository.ts`** — `CompanyRepository` as `Context.Tag`:
  - `findAll(filters?)` — SQL-like `.select().from().where()` with optional `ilike` search + `eq` industry filter
  - `findById(id)` — single company or `NotFoundError`
  - `insertMany(data)` — wrapped in `db.transaction()`
  - `updateAnalysis(id, analysis)` — sets AI fields + status=completed
  - `findPendingAnalysis()` — companies needing analysis
- **`migrate.ts`** — migration runner script
- **`drizzle.config.ts`** — Drizzle Kit config pointing to `DATABASE_URL`

### Phase 3 — Data Collection (`packages/collector`)

**Depends on: Phase 1**

- **Primary source: GitHub Search API** — free, no auth for basic use (60 req/hr)
  - Search repos: `https://api.github.com/search/repositories?q=stars:>1000+topic:startup`
  - Extract org info from owners
  - Fetch org profiles for company_name, website, description
- **Fallback: Seed data** — 15 curated tech companies (Vercel, Supabase, Linear, Resend, etc.) hardcoded. Ensures demo always works even without network/when rate-limited.
- **`CollectorService`** as `Context.Tag`:
  - `collectFromGitHub(count)` — Effect.tryPromise wrapping fetch, Effect.retry for transients
  - `collectFromSeed()` — always succeeds
  - `collectAll(minCount)` — GitHub first, supplement with seed if needed

### Phase 4 — AI Agent (`packages/ai-agent`)

**Depends on: Phase 1**

- **Two-agent pipeline** (bonus: multiple agents):
  1. **Research Agent** — enriches sparse data (fills missing descriptions, resolves ambiguous names)
  2. **Analysis Agent** — produces structured insights (industry, business_model, summary, use_case)

- **`AiService`** as `Context.Tag`:
  - `enrichCompany(input)` → `Effect.Effect<EnrichedData, AiAnalysisError>`
  - `analyzeCompany(input)` → `Effect.Effect<AiAnalysisOutput, AiAnalysisError>`

- **Prompt design** (`prompts/analysis-prompt.ts`):
  - System: "You are a startup analyst. Respond with valid JSON matching the exact schema."
  - User: Template with company_name, website, description + exact enum values listed
  - Enum values in prompt synced with pgEnum values in schema
  - Edge cases: missing description → infer from name/website; ambiguous → state uncertainty in summary

- **Structured output parsing**:
  1. Call Claude via `@anthropic-ai/sdk`
  2. Extract text content
  3. `Effect.try(() => JSON.parse(text))`
  4. `Schema.decodeUnknown(AiAnalysisOutputSchema)` for typed validation
  5. Retry up to 2x on parse failure with error feedback
  6. Mark company `failed` after 3 attempts

- **Caching** (bonus): Check `analysisStatus === 'completed'` before API call. Skip if already done.

### Phase 5 — API Server (`services/api`)

**Depends on: Phases 2, 3, 4**

Uses `@effect/platform` + `@effect/platform-bun` — no Hono:

```typescript
import { HttpRouter, HttpServer, HttpServerResponse } from "@effect/platform"
import { BunHttpServer } from "@effect/platform-bun"
```

- **Routes via `HttpRouter.make`**:
  - `GET /companies` — list all, query params: `?industry=`, `?search=`, `?page=&limit=`
  - `GET /companies/:id` — full detail or 404
  - `POST /pipeline/run` — trigger collect + analyze pipeline, returns `{ collected, analyzed, failed }`
  - `GET /health` — `{ status: "ok", database: true, timestamp }`
  - `GET /companies/search` — bonus: cross-field search via `ilike`

- **Error handler middleware**: Maps Effect error types to HTTP status codes:
  - `NotFoundError` → 404
  - `DatabaseError` → 500
  - `AiAnalysisError` → 502
  - Schema validation → 400

- **Layer composition** at entry point:
  ```typescript
  const AppLayer = pipe(
    Layer.mergeAll(CompanyRepositoryLive, AiServiceLive, CollectorServiceLive),
    Layer.provide(DatabaseServiceLive),
    Layer.provide(ConfigServiceLive),
  )
  // Serve via BunHttpServer.layer
  ```

### Phase 6 — MCP Server (Bonus)

**Depends on: Phase 5**

- `@modelcontextprotocol/sdk` — expose as stdio MCP server
- Tools: `research-company` (full pipeline for one company), `list-companies`, `get-company`
- Register in `mcp.json` alongside serena

### Phase 7 — Claude Code Custom Command (Bonus)

**Depends on: Phase 6**

- `.claude/commands/research-company.md` — `/research-company <company_name>` invokes MCP tool

### Phase 8 — Simple Frontend (Bonus)

**Depends on: Phase 5**

- `services/web/` — minimal vanilla TS single-page app
- Fetches from API, renders company table with industry filter dropdown
- No React — keeps it simple for a demo UI

---

## Effect-TS Layer Composition (Full DI Graph)

```
ConfigServiceLive
    │
    ├──▶ DatabaseServiceLive
    │         │
    │         └──▶ CompanyRepositoryLive
    │
    ├──▶ AiServiceLive (needs ANTHROPIC_API_KEY from Config)
    │
    └──▶ CollectorServiceLive (standalone, uses fetch)

All three services merged into AppLayer → provided to HttpRouter handlers
```

---

## Database Schema (Drizzle)

```typescript
// pgEnums
industryEnum = pgEnum("industry", [
  "FinTech", "HealthTech", "Developer Tools", "AI/ML", "E-Commerce",
  "EdTech", "CleanTech", "Cybersecurity", "SaaS Infrastructure",
  "Marketplace", "Other"
])

businessModelEnum = pgEnum("business_model", [
  "B2B", "B2C", "B2B2C", "SaaS", "Marketplace", "Open Source",
  "Freemium", "Enterprise", "API/Platform", "Other"
])

analysisStatusEnum = pgEnum("analysis_status", [
  "pending", "analyzing", "completed", "failed"
])

// Table
companies = pgTable("companies", {
  id:             uuid("id").primaryKey().$defaultFn(() => Bun.randomUUIDv7()),
  companyName:    text("company_name").notNull(),
  description:    text("description"),
  website:        text("website"),
  industry:       industryEnum("industry"),          // AI-generated
  businessModel:  businessModelEnum("business_model"),// AI-generated
  summary:        text("summary"),                    // AI-generated
  useCase:        text("use_case"),                   // AI-generated
  analysisStatus: analysisStatusEnum("analysis_status").notNull().default("pending"),
  rawAiResponse:  text("raw_ai_response"),            // Cache
  source:         text("source"),                     // "github" | "seed"
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull(),
})
```

---

## Key Design Decisions

1. **`@effect/platform` HTTP server over Hono** — fully typed Effect ecosystem, handlers are Effect programs, error channel flows naturally, no adapter friction
2. **pgEnum for industry/business_model** — template mandate, type safety at DB level, indexed equality comparisons
3. **`analysisStatus` state machine** — supports concurrent analysis, retry, meaningful status for frontend
4. **`rawAiResponse` caching** — skip redundant Claude API calls, provides auditability
5. **GitHub + seed dual-source** — real data primary, guaranteed fallback for demos/rate limits
6. **Two-agent pipeline** — research enriches sparse data before analysis, improving output quality
7. **Effect.Schema for structured parsing** — typed validation of Claude responses, integrates with Effect error channel
8. **Minimal vanilla TS frontend** — pragmatic for demo, avoids over-engineering

---

## Testing Strategy

- **Unit**: Schema validation, prompt generation, response parsing (mocked Claude responses)
- **Integration**: Repository against real PostgreSQL (docker-compose), API endpoint tests
- **AI fixtures**: Recorded real Claude responses as fixtures for deterministic testing
- **Runner**: `bun test` throughout

---

## Deliverables Checklist

1. Source code — full monorepo as described
2. README.md — setup instructions, architecture, AI agent explanation, Claude Code usage, design decisions
3. Claude Code session transcript — `/copy` export
4. CLAUDE.md — generated from template, customized for project

---

## Verification

```bash
rtk docker-compose up -d                    # Start PostgreSQL
rtk bun install                              # Install deps
rtk bun --filter @jackson-ventures/db drizzle:generate  # Generate migrations
rtk bun --filter @jackson-ventures/db drizzle:migrate   # Run migrations
rtk bun --filter @jackson-ventures/api dev               # Start API server
rtk bunx tsc --noEmit                        # Type check all packages
rtk bun test                                 # Run all tests

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:3000/companies
curl -X POST http://localhost:3000/pipeline/run -H 'Content-Type: application/json' -d '{"source":"seed","count":10}'
curl http://localhost:3000/companies
curl http://localhost:3000/companies/{id}
curl "http://localhost:3000/companies?industry=AI/ML"
```
