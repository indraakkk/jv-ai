# Jackson Ventures Effect-TS Patterns

## Core Principles
- **Async Model**: Effect<Success, Error, Requirements> for pure, composable async
- **Dependency Injection**: Layer for service composition, Layer.mergeAll for combining
- **Error Handling**: Data.TaggedError for typed, structured errors
- **Branded Types**: Brand.nominal<T>() for domain-specific types (CompanyId)
- **Validation**: Schema for parsing external input (JSON, query params)
- **Composition**: pipe() for linear transformations, Effect.gen for sequential ops

## Import Order (Strict)
1. Builtins (bun:*, node:*)
2. External packages (effect, drizzle-orm, etc.)
3. Effect ecosystem (Effect, Layer, pipe, Context, Schema)
4. @jackson-ventures/* workspace packages
5. Relative imports (./local, ../sibling)

Example:
```typescript
import { Context, Effect, Layer, pipe } from "effect"
import { Schema } from "effect"
import { eq } from "drizzle-orm"

import { DatabaseError, NotFoundError } from "@jackson-ventures/shared"
import { DatabaseService } from "./client"

import { companies } from "./schema"
```

## Service Definition Pattern
```typescript
export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doSomething: (input: string) => Effect.Effect<Result, MyError>
    readonly getById: (id: string) => Effect.Effect<Item, NotFoundError | DatabaseError>
  }
>() {}
```

## Service Implementation Pattern
```typescript
const makeService = (deps: SomeDep) => ({
  doSomething: (input) =>
    pipe(
      Effect.try(() => someOperation(input)),
      Effect.mapError((cause) => new MyError({ cause })),
    ),
  
  getById: (id) =>
    pipe(
      Effect.tryPromise(() => db.query(id)),
      Effect.flatMap((row) =>
        row ? Effect.succeed(row) : Effect.fail(new NotFoundError({ id }))
      ),
    ),
})

export const MyServiceLive = Layer.effect(
  MyService,
  Effect.map(SomeDependency, (dep) => makeService(dep)),
)
```

## Error Definition Pattern
```typescript
export class MyError extends Data.TaggedError("MyError")<{
  readonly cause: unknown
  readonly context?: string
}> {}

// Usage:
Effect.fail(new MyError({ cause, context: "in fetchUser" }))

// Catching:
Effect.catchTag("MyError", (err) => Effect.succeed(fallback))
```

## Validation Pattern (Schema)
```typescript
import { Schema } from "effect"

export const RawCompanyInput = Schema.Struct({
  companyName: Schema.String,
  website: Schema.NullOr(Schema.String),
  description: Schema.NullOr(Schema.String),
  source: Schema.optional(Schema.String),
})
export type RawCompanyInput = typeof RawCompanyInput.Type

// Parsing external input:
Effect.try(() => JSON.parse(jsonString)),
Effect.flatMap(Schema.decodeUnknown(RawCompanyInput)),
// Result: Either the parsed type or ParseError
```

## Enum Sync Pattern (from this project)
Keep single source of truth in shared package:
```typescript
// packages/shared/src/schemas.ts
export const IndustryValues = [
  "FinTech",
  "HealthTech",
  "Developer Tools",
  "AI/ML",
  // ...
] as const

// Use in DB schema (packages/db/src/schema.ts):
export const industryEnum = pgEnum("industry", IndustryValues)

// Use in validation (same file):
export const AiAnalysisOutput = Schema.Struct({
  industry: Schema.Literal(...IndustryValues), // ← Ensures alignment
  // ...
})

// Use in prompts (packages/ai-agent/src/prompts/analysis-prompt.ts):
// ${IndustryValues.map(v => `"${v}"`).join(", ")} ← Prompt lists exact enum values
```

## Layer Composition Pattern
```typescript
// Single service with single dependency:
export const ServiceLive = Layer.effect(
  Service,
  Effect.map(Dependency, (dep) => makeService(dep)),
)

// Multiple services, single root dependency:
const AppLayer = pipe(
  Layer.mergeAll(ServiceALive, ServiceBLive, ServiceCLive),
  Layer.provide(RootDependency),
)

// Using in Effect program:
const program = pipe(
  ServiceA,
  Effect.flatMap((svc) => svc.doSomething()),
  // Runs with all composed layers
)

BunRuntime.runMain(Layer.launch(HttpLayer))
```

## HTTP Handler Pattern (from API routes)
```typescript
export const routes = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/companies",
    pipe(
      HttpServerRequest.HttpServerRequest,
      Effect.flatMap((req) => {
        const url = new URL(req.url, "http://localhost")
        const industry = url.searchParams.get("industry") ?? undefined
        
        return pipe(
          CompanyRepository, // Accesses the service from context
          Effect.flatMap((repo) => repo.findAll({ industry })),
          Effect.map((companies) => HttpServerResponse.unsafeJson(companies)),
        )
      }),
    ),
  ),
)
```

## Common Effect Combinators Used
- `Effect.succeed(value)`: Pure success
- `Effect.fail(error)`: Pure error
- `Effect.try(fn)`: Sync operation (catch thrown exceptions)
- `Effect.tryPromise({try, catch})`: Async operation (catch Promise rejection)
- `Effect.map(fn)`: Transform success value
- `Effect.flatMap(fn)`: Sequential operations (compose Effects)
- `Effect.tap(fn)`: Side effect, pass-through value
- `Effect.catchAll(handler)`: Catch any error
- `Effect.catchTag("Tag", handler)`: Catch specific tagged error
- `Effect.all(effects, {concurrency})`: Parallel/sequential operations
- `pipe(..., ...transforms)`: Function composition (left-to-right)

## No explicit `any` rule
Always use proper types. If uncertain, use the broadest safe type:
```typescript
// Bad:
function process(data: any): any { ... }

// Good:
function process(data: unknown): Effect<void, ProcessError>
// or with generics if applicable:
function process<T>(data: Schema.Schema<T>): Effect<T, ProcessError>
```
