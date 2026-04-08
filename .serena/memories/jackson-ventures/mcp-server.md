# Jackson Ventures MCP Server

## Overview
Model Context Protocol (MCP) server exposing Jackson Ventures tools to Claude Code and Claude Desktop via stdio transport.

**Location**: packages/mcp-server/src/index.ts
**Dependencies**: @modelcontextprotocol/sdk, zod, effect (full app layer)

## Setup

### Claude Code (auto-configured)
`.mcp.json` at repo root:
```json
{
  "mcpServers": {
    "jackson-ventures": {
      "command": "bun",
      "args": ["run", "packages/mcp-server/src/index.ts"],
      "cwd": "/Users/indra/jobhunt/JacksonVentures"
    }
  }
}
```

Claude Code auto-loads this and inherits `.env` vars (DATABASE_URL, OPENROUTER_API_KEY).

### Claude Desktop (manual setup)
Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
```json
{
  "mcpServers": {
    "jackson-ventures": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/packages/mcp-server/src/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://jackson:jackson_dev@localhost:5432/jackson_ventures",
        "OPENROUTER_API_KEY": "sk-or-..."
      }
    }
  }
}
```

Claude Desktop requires absolute paths and explicit env vars (doesn't inherit project .env).

## Tools

### 1. research-company
**Description**: Research and analyze a company using the AI agent pipeline. Collects data, enriches it, and produces structured analysis.

**Parameters** (Zod schemas):
```typescript
{
  companyName: string (required)
  website?: string (optional, company URL)
  description?: string (optional, brief description)
}
```

**Process**:
1. Insert company into database with source='mcp'
2. Run enrichAndAnalyze pipeline (Research Agent + Analysis Agent)
3. Update database with results
4. Return analyzed company record

**Response**:
```json
{
  "id": "01970abc...",
  "companyName": "Stripe",
  "website": "https://stripe.com",
  "description": "Stripe provides payment processing...",
  "industry": "FinTech",
  "businessModel": "B2B",
  "summary": "Payment processing platform for online businesses.",
  "useCase": "E-commerce sites can use Stripe to accept credit card payments.",
  "analysisStatus": "completed",
  "rawAiResponse": "{...}",
  "source": "mcp",
  "createdAt": "...",
  "updatedAt": "..."
}
```

### 2. list-companies
**Description**: List all analyzed companies, optionally filtered by industry.

**Parameters** (Zod schemas):
```typescript
{
  industry?: string (optional, e.g., "AI/ML", "FinTech")
  search?: string (optional, full-text search term)
}
```

**Process**:
1. Query database with filters
2. Return company list

**Response**:
```json
[
  {
    "id": "01970abc...",
    "companyName": "Acme AI",
    "website": "https://acme.ai",
    "description": "AI company...",
    "industry": "AI/ML",
    "businessModel": "B2B",
    "summary": "AI-powered workflow automation...",
    "useCase": "Automating back-office tasks...",
    "analysisStatus": "completed",
    "rawAiResponse": "{...}",
    "source": "seed",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### 3. get-company
**Description**: Get full details for a specific company by ID.

**Parameters** (Zod schemas):
```typescript
{
  id: string (required, company UUID)
}
```

**Process**:
1. Query database by UUID
2. Return single company

**Response**:
```json
{
  "id": "01970abc...",
  // ... full company object
}
```

## Integration Details

### Layer Composition in MCP
```typescript
const AppLayer = pipe(
  Layer.mergeAll(CompanyRepositoryLive, AiServiceLive, CollectorServiceLive),
  Layer.provide(DatabaseServiceLive),
)

const runEffect = <A>(effect: Effect.Effect<A, unknown, unknown>): Promise<A> =>
  Effect.runPromise(effect.pipe(Effect.provide(AppLayer)) as Effect.Effect<A, never, never>)
```

Each tool call uses `runEffect()` to execute the Effect program with full app layer.

### Transport
**Stdio**: Server runs in subprocess, communicates with parent via JSON-RPC over stdin/stdout.

## Claude Code Custom Command

**File**: `.claude/commands/research-company.md` (bonus feature)

Usage from Claude Code:
```
/research-company Stripe
```

Wraps the MCP research-company tool with a slash command interface.

## Error Handling
All tools return text responses wrapped in `{type: "text", text: JSON.stringify(...)}`

Database/AI errors are caught and returned as text (MCP doesn't support error channels).

## Caching & Idempotency
- **Insert Upsert**: Inserting same company (by name) updates existing record
- **Skip Re-analysis**: If already completed, analysis_status won't re-run (checked at API level, not in MCP directly)

## Use Cases in Claude Code Session
```
@research-company Anthropic
# Researches Anthropic via pipeline, returns structured analysis

@list-companies industry=AI/ML
# Lists all AI/ML companies in database

@get-company 01970abc...
# Retrieves specific company detail by ID
```
