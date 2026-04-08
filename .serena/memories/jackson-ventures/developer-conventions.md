# Jackson Ventures Developer Conventions

## Coordinator Protocol (CLAUDE.md)
**You are the Coordinator.** You plan, delegate, verify. You do NOT edit code directly.

### First Action on Every Task
Run `/orchestrate` to classify task size and begin phase tracking. Options: TRIVIAL (1,8,16), SMALL (skip 5,6,7,9,11), MEDIUM (skip 5), LARGE (all 16).

### Delegation Rules
- **effect-coder**: TypeScript/Effect/React files (.ts, .tsx)
- **nix-coder**: Nix infrastructure files (.nix)
- **default agent**: Everything else (docs, configs, scripts, .md, .yaml, .json)

Always route through gateway skills:
- `/gateway-ts` → TypeScript/Effect work
- `/gateway-nix` → Nix/infrastructure work
- `/gateway-cross` → Cross-domain or uncertain

**Never explore or implement directly.** The coordinator can only Read, Glob, Grep, Bash (verify-only), and Serena tools.

### Before Any Task
1. Read `.data/manifest.yaml` for current state
2. Check `.serena/` for relevant memories (project structure, patterns)
3. Classify task size via `/orchestrate`
4. Delegate via appropriate gateway skill
5. After delegation: Run verification commands yourself
6. Delegate manifest updates to default agent

## Code Patterns

### Import Order (Absolute Requirement)
1. Builtins: bun:*, node:*
2. External packages: effect, drizzle-orm, zod, @modelcontextprotocol/sdk
3. Effect ecosystem: Effect, Layer, pipe, Context, Schema
4. @jackson-ventures/*: shared, db, collector, ai-agent, mcp-server
5. Relative: ./local, ../sibling

**Pre-commit hook validates this order — violation blocks commit.**

### Naming Conventions
- **Files**: kebab-case.ts (e.g., error-handler.ts, ai-service.ts)
- **Components**: PascalCase.tsx (e.g., CompanyTable.tsx)
- **Database columns**: snake_case (company_name, analysis_status)
- **JSON properties**: camelCase (companyName, analysisStatus)
- **Constants**: UPPER_SNAKE_CASE (RESEARCH_SYSTEM_PROMPT, DATABASE_URL)
- **Classes**: PascalCase (CompanyRepository, AiService, DatabaseError)

### TypeScript Rules
- **Strict mode**: No implicit `any`. Use proper types everywhere.
- **Const over let**: Prefer `const` for immutability.
- **No explicit `any`**: Use `unknown`, proper generics, or Schema types.
- **Preserve comments**: If code changes but intent is same, update comment. Only remove if no longer accurate.

### Effect-TS Service Pattern
Every service follows this exact structure:

```typescript
import { Context, Effect, Layer, pipe } from "effect"
import { DatabaseError } from "@jackson-ventures/shared"
import { DatabaseService } from "./client"

export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doSomething: (input: string) => Effect.Effect<Result, MyError>
  }
>() {}

const makeService = (db: DatabaseService) => ({
  doSomething: (input) =>
    pipe(
      Effect.tryPromise(() => db.query(input)),
      Effect.mapError((cause) => new MyError({ cause })),
    ),
})

export const MyServiceLive = Layer.effect(
  MyService,
  Effect.map(DatabaseService, (db) => makeService(db)),
)
```

### Error Definition Pattern
All errors inherit from `Data.TaggedError`:

```typescript
import { Data } from "effect"

export class MyError extends Data.TaggedError("MyError")<{
  readonly cause: unknown
  readonly context?: string
}> {}
```

### Drizzle Rules (Absolute)
1. **Always SQL-like syntax**: `.select().from().where().innerJoin()` (NOT relational `.query.table.findMany()`)
2. **Always transactions**: Wrap multiple operations in `db.transaction(async (tx) => { ... })`
3. **Always pgEnum**: Fixed-value columns use `pgEnum()`, never plain `text`
4. **PK rule**: New tables use `uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7())`
5. **FK constraints**: `onDelete: 'restrict'` for file.id and seo.id references
6. **Never modify migrations**: Create new files instead (may already be applied)

### Schema/Validation Pattern
Define once in shared package, reuse everywhere:

```typescript
// packages/shared/src/schemas.ts
export const IndustryValues = ["FinTech", "HealthTech", ...] as const
export const AiAnalysisOutput = Schema.Struct({
  industry: Schema.Literal(...IndustryValues),
  // ...
})
type AiAnalysisOutput = typeof AiAnalysisOutput.Type
export type { AiAnalysisOutput }

// Use in DB schema
export const industryEnum = pgEnum("industry", IndustryValues)

// Use in validation
Effect.flatMap(Schema.decodeUnknown(AiAnalysisOutput))

// Use in prompts (interpolate directly)
// ${IndustryValues.map(v => `"${v}"`).join(", ")}
```

## Verification (Not Formatting)

Pre-commit hooks handle formatting. Your job is correctness:

```bash
# Type check (must be zero errors)
rtk bunx tsc --noEmit

# Tests
rtk bun test

# Nix validation
rtk nix flake check . --no-build
```

**Correct behavior > formatted code.**

## Commands (Always Prefix with rtk)

```bash
rtk bun install                                  # Install deps
rtk bun --filter <name> dev                    # Dev server for package/service
rtk bun --filter <name> <script>               # Run any script in package.json
rtk bun test                                    # Run tests
rtk bunx tsc --noEmit                          # Type check
rtk git add <file>                             # Staging (always with rtk)
rtk git commit -m "message"                    # Commits (pre-commit hooks run auto)
rtk nix eval . --no-build                      # Validate Nix (no build)
```

## Monorepo Rules

1. **Workspace scope**: @jackson-ventures/* (defined in root package.json)
2. **Filter by workspace name**: `bun --filter @jackson-ventures/db ...`
3. **All packages have tsconfig.json** inheriting from root
4. **All packages export main entrypoint** (package.json exports field)

## Guardrails

1. **.gitignore**: Before adding files, check for "ignore all except" patterns
2. **No nix build**: Use `nix eval` (0.1-0.3s), not `nix build` (minutes)
3. **Pre-commit is safety net**: Hooks validate import order, RTK prefix, DB constraints automatically
4. **Coordinator NEVER uses Edit/Write**: Hard constraint. All file mods go through workers.

## Workflow

1. Create feature branch (always)
2. For architectural changes: write ADR in docs/architecture/adrs/
3. For implementation: plan → delegate via gateway → verify
4. Verify correctness (type check, tests, semantic review)
5. Pre-commit handles style (don't run manually)
6. Update .gitignore for new artifacts
7. Push + create PR

## Serena Memories

Check available memories:
```bash
serena list-memories
```

Read relevant memory before working:
```bash
serena read-memory jackson-ventures/database-schema
```

Write new memories after learning:
```bash
serena write-memory jackson-ventures/my-topic "Content here..."
```

## CLI Tools

**rtk**: "rapid toolkit" — all shell commands must be prefixed:
```bash
rtk git status
rtk bun install
rtk nix eval .
# Even in chains:
rtk git add . && rtk git commit -m "fix"
```

**serena**: Code intelligence / symbol navigation
- find_symbol: Search for classes, functions, types
- get_symbols_overview: File structure overview
- search_for_pattern: Regex search across codebase
- find_referencing_symbols: Find usages of a symbol

**llm-agents**: (available in devshell via nix)

## AI Agent Tooling (Claude Code)

The project uses Claude Code itself as the "agentic tool" for building/modifying code. The coordinator uses `/gateway-*` skills to delegate to workers (effect-coder, nix-coder, default agent), who have Edit/Write permissions.

The `.claude/` directory includes:
- `commands/`: Slash commands (orchestrate, gateway-*, research-company)
- `skills/`: Reusable patterns (effect-service-pattern, drizzle-patterns, etc.)
- `agents/`: Worker agent prompts (effect-coder.md, nix-coder.md)
- `hooks/`: Pre-commit validators (import order, RTK prefix, DB constraints)
