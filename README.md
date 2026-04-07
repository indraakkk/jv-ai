# Jackson Ventures — AI Company Research Agent

An AI-powered company research agent system built for the Jackson Ventures hiring test. Collects startup data, analyzes it via Claude API using a multi-agent pipeline, stores enriched results in PostgreSQL, and exposes them through a REST API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun |
| Language | TypeScript (strict) |
| Framework | Effect-TS (async, errors, DI, HTTP server) |
| HTTP Server | `@effect/platform` + `@effect/platform-bun` |
| Database | PostgreSQL 16 (docker-compose) + Drizzle ORM |
| AI/LLM | OpenRouter API (free LLM models) |
| Orchestration | claude-orchestration-template (multi-agent) |

## Quick Start

```bash
# 1. Clone and install
git clone <repo-url>
cd jackson-ventures
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env with your OPENROUTER_API_KEY

# 3. Start PostgreSQL
docker-compose up -d

# 4. Run database migrations
bun --filter @jackson-ventures/db drizzle:generate
bun --filter @jackson-ventures/db drizzle:migrate

# 5. Start the API server
bun run --watch services/api/src/index.ts
# Server runs on http://localhost:3000

# 6. (Optional) Start the web UI
bun run --watch services/web/src/server.ts
# Web UI runs on http://localhost:3001

# 7. Run the pipeline to collect and analyze companies
curl -X POST http://localhost:3000/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{"source":"seed","count":15}'

# 8. View results
curl http://localhost:3000/companies
curl http://localhost:3000/companies?industry=AI/ML
```

## Architecture Overview

```
jackson-ventures/
├── packages/
│   ├── shared/          Branded types, Effect.Schema, typed errors
│   ├── db/              Drizzle schema, DatabaseService, CompanyRepository
│   ├── collector/       GitHub API + seed data collection
│   ├── ai-agent/        Research agent + Analysis agent (Claude API)
│   └── mcp-server/      MCP server exposing research tools
├── services/
│   ├── api/             @effect/platform HTTP server (REST API)
│   └── web/             Minimal frontend (vanilla TS)
└── .claude/             Orchestration template (agents, skills, hooks)
```

### Effect-TS Service Layer (DI Graph)

```
DatabaseServiceLive (Drizzle + PostgreSQL)
    └──▶ CompanyRepositoryLive (CRUD operations)

AiServiceLive (Anthropic Claude SDK)
    ├──▶ Research Agent (enriches sparse data)
    └──▶ Analysis Agent (structured insights)

CollectorServiceLive (GitHub API + seed fallback)

All services composed via Layer.mergeAll → provided to HTTP handlers
```

## How the AI Agent Works

The system uses a **two-agent pipeline**:

### 1. Research Agent
Takes raw company data (which may be sparse — just a name and partial description) and enriches it using Claude. Fills in missing descriptions, resolves ambiguous company names, adds context.

### 2. Analysis Agent
Takes enriched company data and produces four structured fields:
- **Industry** — classified into predefined categories (FinTech, AI/ML, Developer Tools, etc.)
- **Business Model** — B2B, SaaS, Open Source, Marketplace, etc.
- **Summary** — single-sentence description
- **Use Case** — specific application scenario

### Structured Output Parsing
Claude's response is parsed using `Effect.Schema.decodeUnknown()` which validates the JSON against a typed schema with `Schema.Literal` unions matching the database's `pgEnum` values. Failed parses retry up to 2x. After 3 failures, the company is marked `failed`.

### Caching
AI responses are cached in the `raw_ai_response` column. Companies with `analysis_status: 'completed'` are skipped on re-analysis, avoiding redundant API calls.

## Usage

### API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/companies` | List all companies (supports `?industry=`, `?search=`, `?limit=`, `?offset=`) |
| `GET` | `/companies/:id` | Get company detail by UUID |
| `POST` | `/pipeline/run` | Trigger collection + analysis pipeline |
| `POST` | `/pipeline/analyze-pending` | Re-analyze companies with `pending` status |

#### Examples

![API Example](docs/api.png)

Run the pipeline to collect and analyze companies:

```bash
curl -X POST http://localhost:3000/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{"source":"seed","count":15}'
```

```json
{
  "collected": 15,
  "alreadyCompleted": 0,
  "analyzed": 14,
  "failed": 1
}
```

List companies filtered by industry:

```bash
curl 'http://localhost:3000/companies?industry=AI/ML&limit=2'
```

```json
[
  {
    "id": "01970...",
    "companyName": "Acme AI",
    "website": "https://acme.ai",
    "industry": "AI/ML",
    "businessModel": "B2B",
    "summary": "AI-powered workflow automation for enterprises.",
    "useCase": "Automating repetitive back-office tasks using LLMs.",
    "analysisStatus": "completed"
  }
]
```

Get a single company by ID:

```bash
curl http://localhost:3000/companies/<uuid>
```

Re-analyze all pending companies:

```bash
curl -X POST http://localhost:3000/pipeline/analyze-pending
```

```json
{ "analyzed": 3 }
```

#### Error Responses

| Status | Error | Example |
|--------|-------|---------|
| 400 | Validation Error | `{ "error": "Validation Error", "message": "..." }` |
| 404 | Not Found | `{ "error": "Not Found", "message": "Company with id ... not found" }` |
| 500 | Database Error | `{ "error": "Database Error", "message": "..." }` |
| 502 | AI/Collection Error | `{ "error": "AI Analysis Error", "message": "..." }` |

### Web UI

```bash
bun run --watch services/web/src/server.ts
# Runs on http://localhost:3001
```

The web UI proxies all `/api/*` requests to the API service (`API_URL` env var, defaults to `http://localhost:3000`).

**Features:**
- Company table with columns: Company, Industry, Business Model, Summary, Use Case, Status
- Industry filter dropdown (FinTech, HealthTech, Developer Tools, AI/ML, etc.)
- Text search with 300ms debounce
- "Run Pipeline" button — triggers `POST /api/pipeline/run` with seed data

![Web UI](docs/web.png)

No build step required. Single HTML page served by a minimal Bun HTTP server.

### MCP Server

The MCP server exposes the research pipeline as tools callable from any MCP-compatible client (Claude Code, Claude Desktop, etc.) via stdio transport.

#### Tools

| Tool | Parameters | Description |
|------|-----------|-------------|
| `research-company` | `companyName` (required), `website?`, `description?` | Inserts company, runs enrichment + analysis, returns structured result |
| `list-companies` | `industry?`, `search?` | Lists all companies, optionally filtered |
| `get-company` | `id` (required, UUID) | Returns a single company by ID |

![MCP Server](docs/mcp.png)

Requires `DATABASE_URL` and `OPENROUTER_API_KEY` environment variables.

#### Claude Code

The project includes an `mcp.json` at the repo root:

```json
{
  "mcpServers": {
    "jackson-ventures": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "packages/mcp-server/src/index.ts"],
      "env": {}
    }
  }
}
```

Claude Code picks this up automatically. The server inherits env vars from the project's `.env`.

A custom slash command is also available:

```
/research-company Stripe
```

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "jackson-ventures": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/packages/mcp-server/src/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://jackson:jackson_dev@localhost:5432/jackson_ventures",
        "OPENROUTER_API_KEY": "sk-or-your-key-here"
      }
    }
  }
}
```

Claude Desktop requires absolute paths and explicit env vars since it doesn't inherit the project `.env`.

## Agentic Tool: Claude Code

This project was built entirely using **Claude Code** (Anthropic's CLI agent, model: Claude Opus 4.6) with a custom **multi-agent orchestration template** layered on top.

### Orchestration Setup

The orchestration template provides a structured delegation model:

- **Coordinator + Worker architecture** — A coordinator agent plans and verifies but never edits files directly. It delegates to domain-specific workers (`effect-coder` for TypeScript/Effect, `nix-coder` for Nix/infra, default agent for configs/docs) via gateway commands (`/gateway-ts`, `/gateway-nix`, `/gateway-cross`).
- **16-phase workflow** — Every non-trivial task follows a lifecycle: Setup, Triage, Discovery, Skill Discovery, Complexity, Brainstorming, Architecture, Implementation, Design Verification, Domain Compliance, Code Quality, Test Planning, Testing, Coverage Verification, Test Quality, Completion. Phases are skipped based on task size (TRIVIAL uses 3 phases, LARGE uses all 16).
- **Skill library** — Tier 1 skills (`.claude/skills/`) define patterns loaded by gateway commands. For example, `effect-service-pattern.md` contains the exact `Context.Tag` / `Layer.effect` / `Schema` patterns that every service in this codebase follows. Tier 2 skills in `.claude/skill-library/` are loaded on-demand for specific domains (Drizzle table creation, Nix strategies, etc.).
- **CLAUDE.md as the contract** — The `CLAUDE.md` file encodes all project conventions (import ordering, naming, Drizzle rules, verification commands). Every worker agent reads it before editing, which is how consistency is maintained across 6 packages without manual style enforcement.
- **Hook system** — Pre-commit hooks (defined in `nix/dev.nix`) validate `rtk` prefix usage, import ordering, and DB constraint rules. These act as a safety net — the coordinator runs `tsc --noEmit` after each delegation round, and the hooks catch anything that slips through.

### How Claude Code Helped

**Project scaffolding.** The orchestration template bootstrapped the entire monorepo structure — `packages/`, `services/`, all `package.json` / `tsconfig.json` files, the bun workspace config, docker-compose for PostgreSQL, and the `.claude/` directory with gateway commands, skills, and hooks. This took minutes instead of hours of manual setup.

**Prompt iteration for structured output.** The analysis agent's prompt went through several iterations. The initial version asked Claude to "classify the company" in free text, which produced inconsistent industry labels (e.g., "AI" vs "AI/ML" vs "Artificial Intelligence"). The fix was to embed the exact `pgEnum` values directly into the prompt by interpolating the shared `IndustryValues` and `BusinessModelValues` arrays: `${IndustryValues.map(v => '"' + v + '"').join(", ")}`. This keeps the prompt, the `Effect.Schema` validator, and the database enum in sync from a single source of truth (`packages/shared/src/schemas.ts`).

**Effect-TS patterns and DI wiring.** Effect-TS has a steep API surface. The `effect-coder` worker agent loaded the `effect-service-pattern.md` skill which defines the exact patterns for `Context.Tag` service interfaces, `Layer.effect` implementations, `Data.TaggedError` error classes, and `Layer.mergeAll` composition. This is how every service in the project (`DatabaseService`, `CompanyRepository`, `AiService`, `CollectorService`) follows the same structure. Without the skill library, the agent would produce inconsistent patterns across files.

**Debugging `@effect/platform` HTTP server.** Wiring `@effect/platform`'s HTTP router with `@effect/platform-bun`'s server adapter was not straightforward — the API changed between Effect versions and documentation was sparse. Claude Code explored the library's type signatures and source to figure out the correct `HttpRouter.mount` / `HttpServer.serve` composition. This involved several back-and-forth cycles where the coordinator ran `tsc --noEmit`, identified type errors, and delegated fixes to the `effect-coder` worker.

**Code review loop.** The coordinator never commits worker output blindly. After each delegation, it runs `bunx tsc --noEmit` to verify type-level correctness, then reads the generated code to check for semantic issues (wrong error types, missing `Effect.provide`, incorrect Layer dependencies). Several times, worker output compiled but had logic issues — for example, an early version of the analysis agent didn't handle the case where Claude's JSON response contained markdown code fences. This was caught during coordinator review, not by the type checker.

**MCP server integration.** Claude Code was used both as an MCP client (consuming external tools during development) and to build the project's own MCP server (`packages/mcp-server/`). The MCP server exposes `research-company`, `list-companies`, and `get-company` as tools callable from any MCP-compatible client. Claude Code also generated the custom `/research-company` slash command (`.claude/commands/research-company.md`) that wraps the MCP tool for use directly within Claude Code sessions.

**Iterative type-checking across the workspace.** With 6 packages in a bun workspace, TypeScript errors cascade. After major changes, the coordinator ran `tsc --noEmit` at the root, parsed the errors by package, and delegated fixes to the `effect-coder` worker in batches. This tight loop — delegate, verify, re-delegate — is the core workflow pattern enabled by the orchestration template.

## Design Decisions

1. **`@effect/platform` over Hono** — HTTP handlers are native Effect programs. Error channels, DI, and async composition work seamlessly without adapter friction.

2. **pgEnum for classification fields** — Type safety at the DB level. The enum values in the Drizzle schema, Effect.Schema validators, and Claude prompts are kept in sync via the shared `IndustryValues`/`BusinessModelValues` arrays.

3. **`analysisStatus` state machine** — `pending → analyzing → completed/failed` supports concurrent analysis, retry logic, and gives the frontend meaningful status indicators.

4. **GitHub + seed dual-source collection** — GitHub API provides real data, but the seed list (15 curated companies) ensures the demo always works even without network access or when rate-limited.

5. **Two-agent pipeline** — Separating research (enrichment) from analysis (classification) means the analysis agent always receives reasonably complete data, improving output quality.

6. **Effect.Schema for structured parsing** — Rather than raw `JSON.parse`, `Schema.decodeUnknown` provides typed validation of Claude's response, integrating naturally with the Effect error channel.

## Bonus Features Implemented

- [x] Filtering by industry + full-text search endpoint
- [x] Caching AI responses (rawAiResponse column + status check)
- [x] Multiple agents (research + analysis pipeline)
- [x] MCP server integration (research-company, list-companies, get-company tools)
- [x] Claude Code custom command (`/research-company`)
- [x] Simple frontend interface (vanilla TS, table with filters)

## Verification

```bash
bunx tsc --noEmit     # Type check (zero errors)
bun test              # Run tests
docker-compose up -d  # Start PostgreSQL
```
