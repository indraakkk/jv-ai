# Jackson Ventures Project Overview

## What Is It
AI-powered company research agent system built for a hiring test. Collects startup data, analyzes it via OpenRouter LLM API (free models), stores enriched results in PostgreSQL, and exposes them through a REST API + Web UI. Built entirely with Claude Code + orchestration template.

## High-Level Architecture
- **Frontend**: Vanilla TS web server (localhost:3001) with company table, filters, search, "Run Pipeline" button
- **API**: Effect-TS HTTP server (localhost:3000) with REST endpoints for companies + pipeline orchestration
- **Database**: PostgreSQL 16 (docker-compose) with Drizzle ORM
- **AI Pipeline**: Two-stage (Research Agent → Analysis Agent) using OpenRouter LLM API
- **MCP Server**: Exposes research/list/get-company tools callable from Claude Code or Claude Desktop
- **Monorepo**: Bun workspaces with 6 packages (shared, db, collector, ai-agent, mcp-server) + 2 services (api, web)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Runtime | Bun (v1.3.11+) |
| Language | TypeScript 5.8 (strict mode) |
| Framework | Effect-TS 3.14 (async, errors, DI, HTTP) |
| HTTP Server | @effect/platform 0.77 + @effect/platform-bun 0.56 |
| Database | PostgreSQL 16 (docker-compose) + Drizzle ORM 0.39 |
| API/LLM | OpenRouter API (free Nvidia Nemotron 120B model by default) |
| MCP | @modelcontextprotocol/sdk 1.12 (stdio transport) |
| Dev Environment | Nix flake with devshell (bun, node 22, PostgreSQL, rtk, serena) |
| Orchestration | claude-orchestration-template (multi-agent, 16-phase) |

## Key Env Vars
- `DATABASE_URL`: postgresql://jackson:jackson_dev@localhost:5432/jackson_ventures (default from .env)
- `OPENROUTER_API_KEY`: sk-or-... (required for AI pipeline, free models)
- `OPENROUTER_MODEL`: nvidia/nemotron-3-super-120b-a12b:free (default, can override)
- `PORT`: 3000 (API), 3001 (web)

## Quick Commands
```bash
bun install                                          # Install workspace deps
bun --filter @jackson-ventures/db drizzle:generate  # Generate migrations
bun --filter @jackson-ventures/db drizzle:migrate   # Run migrations
bun run --watch services/api/src/index.ts           # Start API (hot reload)
bun run --watch services/web/src/server.ts          # Start web UI (hot reload)
curl -X POST http://localhost:3000/pipeline/run -H 'Content-Type: application/json' -d '{"source":"seed","count":15}'
docker-compose up -d                                # Start PostgreSQL
```

## Verification Commands
```bash
rtk bunx tsc --noEmit    # Type check (must pass)
rtk bun test             # Run tests
rtk nix flake check . --no-build  # Validate Nix setup
```
