# Jackson Ventures Database Schema

## PostgreSQL Setup
- Host: localhost
- Port: 5432
- Database: jackson_ventures
- User: jackson
- Password: jackson_dev
- Docker Compose: docker-compose.yml (pgdata volume)

## Companies Table
```sql
CREATE TABLE "companies" (
  "id" uuid PRIMARY KEY NOT NULL,
  "company_name" text NOT NULL,
  "description" text,
  "website" text,
  "industry" "industry",
  "business_model" "business_model",
  "summary" text,
  "use_case" text,
  "analysis_status" "analysis_status" DEFAULT 'pending' NOT NULL,
  "raw_ai_response" text,
  "source" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "companies_company_name_unique" ON "companies"("company_name");
```

## Enum Types
```sql
CREATE TYPE "public"."industry" AS ENUM(
  'FinTech',
  'HealthTech',
  'Developer Tools',
  'AI/ML',
  'E-Commerce',
  'EdTech',
  'CleanTech',
  'Cybersecurity',
  'SaaS Infrastructure',
  'Marketplace',
  'Other'
);

CREATE TYPE "public"."business_model" AS ENUM(
  'B2B',
  'B2C',
  'B2B2C',
  'SaaS',
  'Marketplace',
  'Open Source',
  'Freemium',
  'Enterprise',
  'API/Platform',
  'Other'
);

CREATE TYPE "public"."analysis_status" AS ENUM(
  'pending',
  'analyzing',
  'completed',
  'failed'
);
```

## Drizzle Schema Definition
**File**: packages/db/src/schema.ts

- **primaryKey**: uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7())
- **company_name**: Unique constraint (UNIQUE INDEX companies_company_name_unique)
- **analysis_status**: Default 'pending', state machine: pending → analyzing → completed/failed
- **raw_ai_response**: Caches full JSON from AI to avoid re-analysis

## Key Rules (from CLAUDE.md)
1. Always use SQL-like query syntax: `.select().from().where().innerJoin()`
2. Always wrap multiple operations in transactions: `db.transaction(async (tx) => { ... })`
3. Always use `pgEnum` for fixed-value columns, never plain `text`
4. New tables must use uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7()) as default PK
5. Never modify existing migration files — create new ones instead

## CompanyRepository Interface
**File**: packages/db/src/repository.ts

```typescript
export class CompanyRepository extends Context.Tag("CompanyRepository") {
  readonly findAll: (filters?: { industry?, search?, limit?, offset? }) 
    => Effect<ReadonlyArray<Company>, DatabaseError>
  
  readonly findById: (id: string) 
    => Effect<Company, NotFoundError | DatabaseError>
  
  readonly insertMany: (data: ReadonlyArray<RawCompanyInput>) 
    => Effect<ReadonlyArray<Company>, DatabaseError>
    // Uses UPSERT on company_name, merges with existing data
  
  readonly updateAnalysis: (id: string, analysis: AiAnalysisOutput, rawResponse: string) 
    => Effect<Company, NotFoundError | DatabaseError>
    // Sets industry, business_model, summary, use_case, status='completed'
  
  readonly updateAnalysisStatus: (id: string, status: 'pending'|'analyzing'|'completed'|'failed') 
    => Effect<void, DatabaseError>
  
  readonly findPendingAnalysis: () 
    => Effect<ReadonlyArray<Company>, DatabaseError>
}
```

## Migrations
- `0000_wakeful_pestilence.sql`: Initial schema (tables + enums)
- `0001_add_company_name_unique.sql`: Add unique constraint on company_name

## Drizzle Commands
```bash
bun --filter @jackson-ventures/db drizzle:generate    # Generate new migration
bun --filter @jackson-ventures/db drizzle:migrate     # Apply pending migrations
bun --filter @jackson-ventures/db drizzle:studio      # Open Drizzle Studio UI
```

## Drizzle Configuration
**File**: drizzle.config.ts (inferred from file structure)
- Schema: packages/db/src/schema.ts
- Migrations: packages/db/drizzle/
- Dialect: postgresql
- Client: postgres (node-postgres driver)
