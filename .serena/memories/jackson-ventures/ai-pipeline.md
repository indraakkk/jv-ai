# Jackson Ventures AI Pipeline

## Overview
Two-stage pipeline using OpenRouter API (free LLM models):
1. **Research Agent**: Enriches sparse company data (fills missing descriptions)
2. **Analysis Agent**: Classifies companies into structured categories

Both stages use the same OpenRouter client + chat completion API.

## OpenRouter Setup
- **API Endpoint**: https://openrouter.ai/api/v1/chat/completions
- **Default Model**: nvidia/nemotron-3-super-120b-a12b:free (can override via OPENROUTER_MODEL env)
- **Auth**: Bearer token in Authorization header (OPENROUTER_API_KEY)
- **Headers**:
  - Authorization: `Bearer ${apiKey}`
  - Content-Type: application/json
  - HTTP-Referer: https://jackson-ventures.dev
  - X-Title: Jackson Ventures AI Agent

## Stage 1: Research Agent (enrichCompany)
**File**: packages/ai-agent/src/agents/research-agent.ts
**Purpose**: Enrich sparse company data

### Input
```typescript
{
  companyName: string
  description: string | null
  website: string | null
}
```

### Output
```typescript
{
  companyName: string
  description: string (enriched, 2-3 sentences)
  website: string | null
}
```

### Logic
1. If description already exists and length > 30, skip enrichment (return as-is)
2. Otherwise, call OpenRouter with RESEARCH_SYSTEM_PROMPT + buildResearchUserPrompt()
3. Parse JSON response: `{description, website}`
4. On parse failure, use fallback: `"${companyName} — technology company."`
5. Return enriched data

### Prompt Template
```
System: "You are a startup research assistant. Your job is to enrich sparse company data.
Given a company name and whatever partial information is available, produce a comprehensive description.
IMPORTANT: You MUST respond with ONLY a valid JSON object. No markdown code fences, no explanatory text..."

User: "Company Name: Stripe
[Website: https://stripe.com]
[Existing Description: ...]

Based on what you know about this company, provide an enriched description.

Respond with a JSON object containing:
- "description": A comprehensive 2-3 sentence description...
- "website": The company's website URL...

Example:
{"description":"Vercel provides a cloud platform...","website":"https://vercel.com"}"
```

## Stage 2: Analysis Agent (analyzeCompany)
**File**: packages/ai-agent/src/agents/analysis-agent.ts
**Purpose**: Classify company into structured categories

### Input
```typescript
{
  companyName: string
  description: string | null
  website: string | null
}
```

### Output
```typescript
{
  analysis: AiAnalysisOutput
  rawResponse: string
}
```

Where `AiAnalysisOutput`:
```typescript
{
  industry: "FinTech" | "HealthTech" | ... | "Other" (from IndustryValues enum)
  business_model: "B2B" | "B2C" | ... | "Other" (from BusinessModelValues enum)
  summary: string (≥10 chars, single sentence)
  use_case: string (≥10 chars, specific application)
}
```

### Logic
1. Call OpenRouter with ANALYSIS_SYSTEM_PROMPT + buildAnalysisUserPrompt()
2. Parse JSON response using Effect.Schema.decodeUnknown(AiAnalysisOutput)
3. On parse failure, retry up to 3 times (retryCount)
4. After 3 failures, return AiAnalysisError
5. Return analysis + raw response (for caching)

### Prompt Template
```
System: "You are a startup and company analyst. You analyze companies and produce structured assessments.
IMPORTANT: You MUST respond with ONLY a valid JSON object matching the exact schema provided. No markdown code fences..."

User: "Analyze the following company and produce a structured assessment.

Company Name: Acme AI
Website: https://acme.ai
Description: AI-powered workflow automation...

Respond with a JSON object containing exactly these fields:

- "industry": One of: "FinTech", "HealthTech", "Developer Tools", "AI/ML", ...
- "business_model": One of: "B2B", "B2C", "SaaS", ...
- "summary": A single concise sentence summarizing what the company does.
- "use_case": A specific potential use case or application for this company's product/service.

Example response format:
{"industry":"Developer Tools","business_model":"SaaS","summary":"Provides a cloud deployment platform...","use_case":"A development team could use..."}"
```

## AiService Layer
**File**: packages/ai-agent/src/ai-service.ts

```typescript
export class AiService extends Context.Tag("AiService") {
  readonly enrichCompany: (input) => Effect<EnrichedCompanyData, AiAnalysisError>
  readonly analyzeCompany: (input) => Effect<{analysis, rawResponse}, AiAnalysisError>
  readonly enrichAndAnalyze: (input) => Effect<{analysis, rawResponse}, AiAnalysisError>
}
```

### enrichAndAnalyze Pattern (used in pipeline + MCP)
```typescript
pipe(
  enrichCompany(client, input),
  Effect.flatMap((enriched) =>
    analyzeCompany(client, {
      companyName: enriched.companyName,
      description: enriched.description,
      website: enriched.website,
    }),
  ),
)
```

## JSON Sanitization (sanitize-json.ts)
OpenRouter responses may include markdown code fences or prefixes. Sanitization:
1. Find opening backticks: ` ``` ` or ` ```json ` → strip
2. Find closing backticks: ` ``` ` → strip
3. Trim whitespace
4. Return raw JSON string

Then parse with `JSON.parse()` and validate with `Schema.decodeUnknown()`.

## Error Handling
- **AiAnalysisError**: Tagged error with companyName + cause
- **Retry Logic**: Analysis agent retries 3 times on parse errors (soft failures)
- **Hard Failures**: After 3 retries, mark company analysis_status='failed'
- **Pipeline Behavior**: Single company failure doesn't halt pipeline (uses Effect.all with concurrency)

## Database Caching
- **raw_ai_response** column: Stores full JSON from AI (avoid re-analysis)
- **analysis_status**: pending → analyzing → completed/failed
- **Skip Optimization**: If analysis_status='completed', skip re-analysis (check in pipeline)

## OpenRouter Client
**File**: packages/ai-agent/src/openrouter-client.ts

```typescript
export interface OpenRouterClient {
  readonly chatCompletion: (params: {
    model: string
    messages: ChatMessage[]
    max_tokens: number
  }) => Effect.Effect<string, Error>
}

export const createOpenRouterClient = (apiKey: string): OpenRouterClient => ({ ... })
```

Simple fetch-based HTTP client with error handling:
- Checks response.ok before parsing
- Validates JSON structure (choices[0].message.content)
- Returns raw content string (no parsing)

## Model Selection
Default: `nvidia/nemotron-3-super-120b-a12b:free`
- Free tier (no rate limits for testing)
- 120B parameters (good quality)
- Can override via OPENROUTER_MODEL env var

Alternative models available on OpenRouter (free tier):
- meta-llama/llama-2-70b-chat:free
- mistralai/mistral-7b-instruct:free
- (check openrouter.ai for current list)
