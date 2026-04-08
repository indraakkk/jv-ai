# Jackson Ventures Testing & Quick Reference

## Quick Start (Fresh Clone)

```bash
# 1. Nix devshell
nix develop

# 2. Dependencies
bun install

# 3. Database
docker-compose up -d
bun --filter @jackson-ventures/db drizzle:migrate

# 4. Start services
# Terminal 1:
bun run --watch services/api/src/index.ts
# Terminal 2:
bun run --watch services/web/src/server.ts

# 5. Trigger pipeline
curl -X POST http://localhost:3000/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{"source":"seed","count":15}'

# 6. View results
curl http://localhost:3000/companies
# Or open http://localhost:3001 in browser
```

## Verification Commands

```bash
# Type check (must be zero errors)
rtk bunx tsc --noEmit

# Run tests
rtk bun test

# Nix validation
rtk nix flake check . --no-build

# All three in sequence
rtk bunx tsc --noEmit && rtk bun test && rtk nix flake check . --no-build
```

## Testing Structure

### Unit Tests
**Location**: packages/*/src/__tests__/

Example pattern:
- packages/shared/src/__tests__/
- packages/db/src/__tests__/
- packages/collector/src/__tests__/

**Run tests**:
```bash
rtk bun test
```

### Test Files
Bun uses `.test.ts` suffix convention.

### Coverage
No explicit coverage tooling configured (can be added via bun plugins).

## Common Development Tasks

### Add a New Company Enum Value
1. Edit packages/shared/src/schemas.ts (add to IndustryValues/BusinessModelValues const array)
2. Edit packages/db/src/schema.ts (pgEnum values updated automatically via Drizzle)
3. Generate migration: `bun --filter @jackson-ventures/db drizzle:generate`
4. Apply migration: `bun --filter @jackson-ventures/db drizzle:migrate`
5. Edit AI prompts (packages/ai-agent/src/prompts/*.ts) — they interpolate enum values
6. Run type check: `rtk bunx tsc --noEmit`

### Add a New Company Field
1. Create migration: `bun --filter @jackson-ventures/db drizzle:generate`
2. Edit schema in packages/db/src/schema.ts
3. Update Repository methods in packages/db/src/repository.ts
4. Update Schema types in packages/shared/src/schemas.ts
5. Update API route handlers in services/api/src/routes/
6. Apply migration: `bun --filter @jackson-ventures/db drizzle:migrate`

### Add a New API Endpoint
1. Create new route file in services/api/src/routes/
2. Export router: `export const myRoutes = HttpRouter.empty.pipe(...)`
3. Import and concat in services/api/src/app.ts: `HttpRouter.concat(myRoutes)`
4. Test: `curl http://localhost:3000/my-endpoint`

### Add a New MCP Tool
1. Add tool definition in packages/mcp-server/src/index.ts: `server.tool(...)`
2. Test via Claude Code (MCP auto-reloads) or Claude Desktop (restart)

### Modify AI Prompts
1. Edit packages/ai-agent/src/prompts/*.ts
2. Ensure all enum values interpolated from packages/shared/schemas.ts
3. Test via pipeline: `curl -X POST http://localhost:3000/pipeline/run ...`
4. Review raw_ai_response in database to validate format

### Query Database Directly
```bash
# Connect via psql
psql -U jackson -h localhost -d jackson_ventures

# Useful queries:
SELECT COUNT(*) FROM companies;
SELECT company_name, industry, analysis_status FROM companies;
SELECT company_name, raw_ai_response FROM companies WHERE analysis_status='failed';
```

### View Drizzle Studio
```bash
bun --filter @jackson-ventures/db drizzle:studio
# Opens browser at http://localhost:5555 (depends on config)
```

## Environment & Secrets

### .env File
Created at repo root (git-ignored). Never commit secrets.

```
DATABASE_URL=postgresql://jackson:jackson_dev@localhost:5432/jackson_ventures
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
PORT=3000
```

### Getting an OpenRouter API Key
1. Visit https://openrouter.ai
2. Sign up (free tier available)
3. Copy API key from dashboard
4. Paste into .env `OPENROUTER_API_KEY=sk-or-...`

### Changing LLM Model
Edit .env:
```
OPENROUTER_MODEL=meta-llama/llama-2-70b-chat:free
```

Available free models: https://openrouter.ai/docs/models

## Troubleshooting

### "connection refused" on database
```bash
docker-compose ps
# Check if postgres is running
docker-compose logs postgres
# Start it:
docker-compose up -d
```

### "type error: X is not assignable to Y"
```bash
rtk bunx tsc --noEmit
# Fix import order or type mismatches
# Check CLAUDE.md for patterns
```

### "pre-commit hook failed"
Common issues:
1. **Import order**: `/gateway-ts` to fix
2. **rtk prefix**: Add `rtk ` to bash commands
3. **DB constraint**: Check foreign key `onDelete` rules

### "API returns 502 AI Analysis Error"
Likely causes:
1. OPENROUTER_API_KEY missing or invalid
2. OpenRouter API rate-limited
3. Network error

Check:
```bash
# Verify env var
echo $OPENROUTER_API_KEY

# Check API status
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"hi"}]}'
```

### "PostgreSQL version mismatch"
Project uses PostgreSQL 16. Check docker-compose.yml — image should be `postgres:16-alpine`.

## File Structure Quick Reference

```
packages/
  shared/         → Enums, errors, branded types, schemas (single source of truth)
  db/             → Drizzle schema, migrations, DatabaseService, CompanyRepository
  collector/      → GitHub + seed data collection
  ai-agent/       → Research + Analysis agents (OpenRouter LLM)
  mcp-server/     → MCP tools (research-company, list-companies, get-company)

services/
  api/            → REST API (port 3000)
  web/            → Web UI (port 3001)

nix/              → Flake configuration, devshell
.claude/          → Orchestration template (commands, skills, agents, hooks)
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| API | 3000 | http://localhost:3000 |
| Web UI | 3001 | http://localhost:3001 |
| PostgreSQL | 5432 | localhost:5432 |
| Drizzle Studio | 5555 | http://localhost:5555 |

## Key Decision Points

### When to Use Seed vs GitHub
- **Seed**: Testing, offline development, demos
- **GitHub**: Real data collection, production usage
- **Hybrid (collectAll)**: Best of both — tries GitHub, falls back to seed

### When to Retry AI Analysis
- **Manual**: POST /pipeline/analyze-pending
- **Auto**: Pipeline skips already-completed companies

### Concurrency Strategy
- Pipeline analysis: `concurrency: 3` (limits OpenRouter API load)
- Can adjust in services/api/src/routes/pipeline.ts

## Performance Notes

- **Type check**: ~2-5 seconds (bunx tsc --noEmit)
- **Database query**: ~50-200ms typical
- **AI analysis**: ~5-30 seconds per company (OpenRouter latency)
- **Pipeline (15 companies, concurrency:3)**: ~2-3 minutes typical
