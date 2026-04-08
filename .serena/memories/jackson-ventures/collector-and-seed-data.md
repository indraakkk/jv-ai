# Jackson Ventures Collector Service & Seed Data

## Overview
**CollectorService** provides two company data sources:
1. **GitHub API**: Real-time company data from GitHub
2. **Seed List**: Hardcoded list of 15 curated companies (fallback)

Location: packages/collector/src/

## Seed Companies List

**File**: packages/collector/src/sources/seed.ts

15 companies with:
- companyName
- website
- description
- source: "seed"

Companies cover diverse industries:
- AI/ML: OpenAI, Anthropic, DeepSeek, Mistral
- FinTech: Stripe, Revolut, N26
- Developer Tools: GitHub, Vercel, Netlify
- Others: Figma, Notion, Slack, Twilio, Zoom

**Usage**:
```typescript
import { seedCompanies } from "@jackson-ventures/collector"
const companies = seedCompanies  // array of 15 RawCompanyInput
```

## CollectorService Interface

**File**: packages/collector/src/collector-service.ts

```typescript
export class CollectorService extends Context.Tag("CollectorService")<
  CollectorService,
  {
    readonly collectFromGitHub: (count: number) 
      => Effect<ReadonlyArray<RawCompanyInput>, CollectionError>
    
    readonly collectFromSeed: () 
      => Effect<ReadonlyArray<RawCompanyInput>, never>
    
    readonly collectAll: (minCount: number) 
      => Effect<ReadonlyArray<RawCompanyInput>, CollectionError>
  }
>() {}
```

### collectFromGitHub(count)
**Purpose**: Fetch companies from GitHub API

**Process**:
1. Query GitHub API (endpoint: TBD, likely trending repos)
2. Extract company metadata (name, description, website, etc.)
3. Return array of RawCompanyInput
4. Retry up to 2 times on failure

**Errors**:
- Network failure
- API rate limit
- Invalid response format
→ Wrapped in `CollectionError`

**Details**:
- See packages/collector/src/sources/github.ts

### collectFromSeed()
**Purpose**: Return hardcoded seed list

**Process**: Simply returns the 15 seed companies

**Never fails** (always succeeds synchronously)

### collectAll(minCount)
**Purpose**: Try GitHub, fallback to seed, combine as needed

**Logic**:
1. Try `collectFromGitHub(minCount)`
2. If fails, log message and return empty array
3. If GitHub result >= minCount, return GitHub data
4. Otherwise, supplement with seed data until minCount reached
5. Return combined array

**Example**:
- minCount=10
- GitHub returns 3 companies
- Supplement with 7 companies from seed
- Return 10 total

**Fallback**: Safe — always returns enough data

## RawCompanyInput Schema

**File**: packages/shared/src/schemas.ts

```typescript
export const RawCompanyInput = Schema.Struct({
  companyName: Schema.String,
  website: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  source: Schema.optional(Schema.String),
})
```

**Fields**:
- `companyName` (required): Company name
- `website` (nullable): Company website URL or null
- `description` (nullable): Brief description or null
- `source` (optional): Where data came from (e.g., "seed", "github", "mcp")

**Type definition exported**:
```typescript
type RawCompanyInput = typeof RawCompanyInput.Type
```

## Integration in Pipeline

**File**: services/api/src/routes/pipeline.ts

```typescript
// Step 1: Collect from specified source
const collected = source === "seed"
  ? collector.collectFromSeed()
  : source === "github"
    ? collector.collectFromGitHub(count)
    : collector.collectAll(count)

// Step 2: Insert/upsert into database
const upserted = await repo.insertMany(collected)

// Step 3: Analyze each (skipping already completed)
const needsAnalysis = upserted.filter(c => c.analysisStatus !== "completed")
// ... run AI pipeline on needsAnalysis
```

**Concurrency**: Analysis runs with `concurrency: 3` to limit OpenRouter API calls

**Error Handling**:
- Collection error → fallback to seed
- AI analysis error per-company → mark as failed, continue with others

## MCP Tool Integration

**File**: packages/mcp-server/src/index.ts

The MCP server calls CollectorService indirectly via the pipeline:

```typescript
// research-company tool:
repo.insertMany([{
  companyName,
  website: website ?? null,
  description: description ?? null,
  source: "mcp",
}])
// Then runs enrichAndAnalyze on inserted company
```

**list-companies** tool queries database (doesn't use collector).

## Data Flow Example

### Scenario: Run Pipeline with Source="all", Count=15

1. **Collection Phase**:
   - Call `collectAll(15)`
   - Try GitHub API
   - If fails, use seed list (15 companies)
   - Return 15 companies

2. **Upsert Phase**:
   - Insert into database
   - If company_name already exists, update existing record
   - Return upserted array

3. **Analysis Phase** (for each company):
   - If already completed, skip
   - Mark as analyzing
   - Run Research Agent (enrich data)
   - Run Analysis Agent (classify)
   - Update database with results
   - On failure, mark as failed

4. **Response**:
   ```json
   {
     "collected": 15,
     "alreadyCompleted": 0,
     "analyzed": 14,
     "failed": 1
   }
   ```

## GitHub Source Details

**File**: packages/collector/src/sources/github.ts

Typical GitHub API queries:
- Endpoint: /search/repositories (GitHub API v3)
- Filters: language, stars, created/pushed dates
- Rate limit: 30 requests/minute (unauthenticated) or 60/minute (authenticated with token)

**Parsing**: Extract repo owner/name, description, homepage URL

**Limitations**:
- No authentication token configured (uses public rate limit)
- May be rate-limited in demo/testing scenarios
- Fallback to seed ensures demo always works

## Why Seed + GitHub Hybrid

**Advantages**:
1. **Real-time data** when GitHub available (GitHub source)
2. **Guaranteed demo functionality** when offline/rate-limited (seed)
3. **Testing-friendly** — no network dependency for basic tests
4. **User-friendly** — "run now" button always works

**Trade-off**: Real data quality vs. reliability

## Extending the Collector

To add a new source (e.g., Crunchbase, LinkedIn):

1. Create `packages/collector/src/sources/new-source.ts`
2. Export function: `export const collectFromNewSource = (count) => Effect<...>`
3. Add method to `CollectorService`
4. Update `collector.ts` with new Layer implementation
5. Add UI option for source selection (optional)
