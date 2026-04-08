# Jackson Ventures REST API Endpoints

## Base URL
`http://localhost:3000`

## Health Check
**GET** `/health`
- Returns: Simple health status (implemented in services/api/src/routes/health.ts)

## Companies Endpoints

### List Companies
**GET** `/companies`

**Query Parameters:**
- `industry` (optional): Filter by industry enum (e.g., "AI/ML", "FinTech")
- `search` or `q` (optional): Full-text search in company_name, description, summary
- `limit` (optional, default: 100): Number of results
- `offset` (optional, default: 0): Pagination offset

**Example:**
```bash
curl 'http://localhost:3000/companies?industry=AI/ML&limit=2'
```

**Response:**
```json
[
  {
    "id": "01970abc...",
    "companyName": "Acme AI",
    "description": "AI company...",
    "website": "https://acme.ai",
    "industry": "AI/ML",
    "businessModel": "B2B",
    "summary": "AI-powered workflow automation for enterprises.",
    "useCase": "Automating repetitive back-office tasks using LLMs.",
    "analysisStatus": "completed",
    "rawAiResponse": "{...}", // cached AI JSON
    "source": "seed",
    "createdAt": "2024-04-08T...",
    "updatedAt": "2024-04-08T..."
  }
]
```

### Get Company by ID
**GET** `/companies/:id`

**Parameters:**
- `id` (URL param): UUID of company

**Example:**
```bash
curl http://localhost:3000/companies/01970abc-1234-5678-9abc-def0123456789
```

**Response:**
```json
{
  "id": "01970abc...",
  "companyName": "Acme AI",
  // ... full company object
}
```

**Error (404):**
```json
{
  "error": "Not Found",
  "message": "Company with id 01970abc... not found"
}
```

## Pipeline Endpoints

### Run Collection + Analysis Pipeline
**POST** `/pipeline/run`

**Request Body:**
```json
{
  "source": "seed" | "github" | "all",
  "count": 15
}
```

**source options:**
- `"seed"`: Use hardcoded seed company list (15 companies)
- `"github"`: Fetch from GitHub API (requires network, respects rate limits)
- `"all"`: Try GitHub first, fallback to seed if unavailable

**Default** (if body omitted): `{source: "all", count: 10}`

**Process:**
1. Collect companies from specified source
2. Insert/upsert into database (UPSERT on company_name)
3. For each company:
   - Skip if already analysis_status='completed'
   - Mark as analyzing
   - Run enrichAndAnalyze pipeline (Research + Analysis agents)
   - Update database with results
   - On failure, mark as failed (doesn't halt pipeline)
4. Return summary

**Example:**
```bash
curl -X POST http://localhost:3000/pipeline/run \
  -H 'Content-Type: application/json' \
  -d '{"source":"seed","count":15}'
```

**Response:**
```json
{
  "collected": 15,
  "alreadyCompleted": 2,
  "analyzed": 12,
  "failed": 1
}
```

### Re-Analyze Pending Companies
**POST** `/pipeline/analyze-pending`

**Request Body:** (empty or omitted)

**Process:**
1. Find all companies with analysis_status='pending'
2. For each company:
   - Mark as analyzing
   - Run enrichAndAnalyze pipeline
   - Update database with results
   - On failure, mark as failed
3. Return count of analyzed

**Example:**
```bash
curl -X POST http://localhost:3000/pipeline/analyze-pending
```

**Response:**
```json
{
  "analyzed": 3
}
```

## Error Responses

### 400 Bad Request (Validation Error)
```json
{
  "error": "Validation Error",
  "message": "Invalid input: ..."
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Company with id ... not found"
}
```

### 500 Internal Server Error (Database Error)
```json
{
  "error": "Database Error",
  "message": "Failed to fetch companies: ..."
}
```

### 502 Bad Gateway (AI/Collection Error)
```json
{
  "error": "AI Analysis Error" | "Collection Error",
  "message": "..."
}
```

## Implementation Details

### Route Files
**Location**: services/api/src/routes/

- `health.ts`: Health check route
- `companies.ts`: Company list/detail endpoints
- `pipeline.ts`: Pipeline orchestration endpoints

### Error Handling Middleware
**Location**: services/api/src/middleware/error-handler.ts

Maps Effect errors to HTTP responses:
- `NotFoundError` → 404
- `DatabaseError` → 500
- `AiAnalysisError`, `CollectionError` → 502
- `ValidationError` (from Schema) → 400

### Concurrency
Pipeline endpoints run analysis with `concurrency: 3`:
```typescript
Effect.all(companies.map(c => analyzeCompany(c)), { concurrency: 3 })
```
This limits simultaneous OpenRouter API requests.

## Response Format
All endpoints return JSON. Timestamps are ISO 8601 strings.
Property names use camelCase (e.g., companyName, analysisStatus, useCase).
Database column names use snake_case (company_name, analysis_status, use_case).
