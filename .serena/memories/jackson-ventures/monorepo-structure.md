# Jackson Ventures Monorepo Structure

## Workspace Layout
```
jackson-ventures/
├── packages/                    # Shared libraries (@jackson-ventures/*)
│   ├── shared/                 # Branded types, errors, schemas
│   ├── db/                     # Drizzle schema, client, repository
│   ├── collector/              # GitHub + seed data collection service
│   ├── ai-agent/               # Research + Analysis agent implementation
│   └── mcp-server/             # MCP server exposing tools
│
├── services/                    # Production apps
│   ├── api/                    # Effect-TS HTTP REST API (port 3000)
│   └── web/                    # Vanilla TS web server (port 3001)
│
├── .claude/                    # Orchestration template (commands, skills, agents, hooks)
├── nix/                        # Nix flake configuration + devshell
├── .data/                      # Agent runtime state (manifest, locks, scratchpads)
├── drizzle.config.ts           # Drizzle configuration
├── docker-compose.yml          # PostgreSQL 16 container
└── CLAUDE.md                   # Developer conventions + coordinator protocol
```

## Package Details

### @jackson-ventures/shared
- **Purpose**: Shared types, errors, branded types, schemas (single source of truth)
- **Exports**: CompanyId (branded type), errors (NotFoundError, AiAnalysisError, CollectionError, DatabaseError), schemas (Industry*, BusinessModel*, AnalysisStatus*, RawCompanyInput, AiAnalysisOutput, CompanyRecord, CompanyListItem)
- **No deps** except effect
- **Key Pattern**: Enums defined as const arrays (IndustryValues, BusinessModelValues, AnalysisStatusValues) kept in sync with DB pgEnum values and AI prompts

### @jackson-ventures/db
- **Purpose**: Database abstraction (Drizzle schema, client, CompanyRepository)
- **Main Files**:
  - `schema.ts`: pgTable "companies" with uuid PK, pgEnum columns (industry, business_model, analysis_status)
  - `client.ts`: PostgreSQL connection + DatabaseService Layer
  - `repository.ts`: CompanyRepository (findAll, findById, insertMany, updateAnalysis, updateAnalysisStatus, findPendingAnalysis)
- **Drizzle Scripts**: drizzle:generate (migrations), drizzle:migrate (apply), drizzle:studio (browse)
- **Migrations**: drizzle/ folder with SQL migrations (0000_wakeful_pestilence.sql, 0001_add_company_name_unique.sql)

### @jackson-ventures/collector
- **Purpose**: Collect company data from GitHub API or seed list
- **Exports**: CollectorService, seedCompanies (const array of 15 companies), collectFromGitHub
- **Pattern**: Effect-based service with fallback (try GitHub, fallback to seed)

### @jackson-ventures/ai-agent
- **Purpose**: AI-powered research + analysis pipeline
- **Exports**: AiService, enrichCompany (Research Agent), analyzeCompany (Analysis Agent)
- **Models**: OPENROUTER_MODEL env var (default: nvidia/nemotron-3-super-120b-a12b:free)
- **Prompts**: research-prompt.ts, analysis-prompt.ts (include enum values for validation)
- **JSON Sanitization**: sanitize-json.ts (removes markdown code fences)
- **Retry Logic**: Analysis agent retries up to 3x on JSON parse failures
- **OpenRouter Client**: Simple fetch-based HTTP client with error handling

### @jackson-ventures/mcp-server
- **Purpose**: MCP server exposing research tools to Claude Code and Claude Desktop
- **Tools**:
  - `research-company`: Insert + enrich + analyze a single company
  - `list-companies`: List all companies (with optional industry/search filters)
  - `get-company`: Get single company by UUID
- **Transport**: stdio (runs via `bun run packages/mcp-server/src/index.ts`)
- **Zod Schemas**: Input validation for all tool parameters

### @jackson-ventures/api (service)
- **Purpose**: REST HTTP server for company queries + pipeline orchestration
- **Port**: 3000 (can override with PORT env var)
- **Stack**: @effect/platform HttpRouter + HttpServer + BunRuntime
- **Routes**:
  - `GET /health`: Health check
  - `GET /companies`: List with ?industry, ?search, ?limit, ?offset
  - `GET /companies/:id`: Get by UUID
  - `POST /pipeline/run`: Collect + analyze (body: {source: "seed"|"github"|"all", count: number})
  - `POST /pipeline/analyze-pending`: Re-analyze pending companies
- **Layer Composition**: CompanyRepositoryLive + AiServiceLive + CollectorServiceLive, all provided DatabaseServiceLive
- **Error Handler**: Middleware converts Effect errors to HTTP responses (400, 404, 500, 502)

### @jackson-ventures/web (service)
- **Purpose**: Web UI for browsing companies
- **Port**: 3001
- **Files**: index.html (vanilla HTML/CSS), server.ts (static HTTP server), styles.css
- **Features**: Company table, industry filter dropdown, text search (300ms debounce), "Run Pipeline" button
- **API Proxy**: Proxies /api/* to API service (API_URL env var, default localhost:3000)
- **No Build**: Single-file HTML served by Bun HTTP server

## Dependency Graph
```
services/api (root)
  ├── @jackson-ventures/shared
  ├── @jackson-ventures/db
  │   └── @jackson-ventures/shared
  ├── @jackson-ventures/collector
  │   └── @jackson-ventures/shared
  └── @jackson-ventures/ai-agent
      └── @jackson-ventures/shared

packages/mcp-server (root)
  ├── @jackson-ventures/shared
  ├── @jackson-ventures/db
  ├── @jackson-ventures/collector
  ├── @jackson-ventures/ai-agent
  └── @modelcontextprotocol/sdk
```
