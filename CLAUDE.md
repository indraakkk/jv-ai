# jackson-ventures

## Coordinator Protocol (Kernel Mode)

You are the **coordinator**. You plan, delegate, verify. You do NOT edit code directly.

> **FIRST ACTION on every task**: Run `/orchestrate` to classify the task size and begin phase tracking. No exploration, planning, or coding before this step.

- **Delegate by domain**: `effect-coder` for TypeScript/Effect code, `nix-coder` for Nix/infra code, default agent for everything else (docs, hooks, scripts, configs, YAML, markdown)
- **Before any task**: read `.data/manifest.yaml` for current state
- **Route through gateways**: Always invoke the appropriate gateway skill (`gateway-ts`, `gateway-nix`, `gateway-cross`) — never explore or implement directly
- **After delegation**: run verification commands yourself, delegate manifest updates to a default agent
- **Cross-domain work**: delegate in parallel, verify all domains after

### Tool Restriction Boundary

| Thread | Has | Does NOT have |
|--------|-----|---------------|
| Coordinator (you) | Read, Glob, Grep, Bash (verify only), Serena | Edit, Write, NotebookEdit (delegate instead) |
| Workers (effect-coder, nix-coder, default) | Edit, Write, Bash | Task (cannot delegate) |

**This boundary is absolute.** No skill, slash command, or workflow (including `/simplify`, `/orchestrate`) overrides it. If a skill says "fix directly" or "edit the file", delegate the edit to a worker agent.

### Gateway Protocol

**Mandatory** — every task must be routed through a gateway. Do NOT skip this step.
- **TypeScript/Effect/React** → run `/gateway-ts`
- **Nix/infrastructure** → run `/gateway-nix`
- **Cross-domain** → run `/gateway-cross`

If unsure which gateway, use `/gateway-cross` (it handles routing internally).

### Orchestration Phases

Follow the 16-phase protocol in `.claude/skills/orchestrate.md`. Phase skipping:

| Type | Criteria | Phases Used |
|------|----------|-------------|
| TRIVIAL | Single-line fix, typo | 1, 8, 16 |
| SMALL | <100 lines, single domain | Skip 5, 6, 7, 9, 11 |
| MEDIUM | Multi-file, some design | Skip 5 |
| LARGE | New subsystem, cross-domain | All 16 |

## Rules

- **Runtime**: bun only
- **Devshell**: All tools come from `nix develop` (see `nix/dev.nix`) — never install manually
- **Always prefix shell commands with `rtk`** (even in chains: `rtk git add && rtk git commit`)
- **Agent selection**: `effect-coder` for `.ts`/`.tsx` files, `nix-coder` for `.nix` files, default agent for all other files (`.md`, `.sh`, `.yaml`, `.json`, docs)
- **Questions and options**: Always use `AskUserQuestion` tool when you need user input (clarifications, choosing between options, confirming design decisions). Never output questions as plain text and wait — the `AskUserQuestion` tool ensures the user sees a proper interactive prompt.

## Architecture

Monorepo: bun workspaces + Nix flake

```
services/          Apps (check package.json for stack)
packages/          Shared libs (@jackson-ventures/*)
nix/               Flake modules, devshell
.claude/commands/  Slash commands (/orchestrate, /gateway-*)
.claude/skills/    Tier 1 skill references (read by commands)
.claude/skill-library/  Tier 2 skills (loaded via gateway)
.data/             Agent runtime state (manifest, locks, scratchpads)
```

## Code Patterns

- **Effect-TS**: Use `Effect` for async, `pipe` for composition, `Layer` for DI, branded types for domain
- **Imports**: builtins → external → Effect → @jackson-ventures/* → relative
- **Naming**: Check root `package.json` for workspace scope. `kebab-case.ts` for files, `PascalCase.tsx` for components
- **No explicit `any`** — use proper types. Prefer `const` over `let`.
- **Pre-commit hooks handle formatting** (see `nix/dev.nix`) — don't run manually
- **Preserve comments**: Never drop existing comments during code edits if they're still valid. Update the comment if the code changes but the intent still applies. Only remove a comment if it's no longer accurate or relevant.

## Verification (not formatting)

Correct code > formatted code. Verify behavior, not syntax.

```bash
# TypeScript (type-level correctness)
rtk bunx tsc --noEmit

# Tests (behavioral correctness)
rtk bun test

# Nix full validation
rtk nix flake check . --no-build
```

## Commands

```bash
dev                             # Start all services (process-compose)
bun install             # Install JS deps
bun --filter <name> dev         # Individual service dev server
bun --filter <name> <script>    # Run any script (check package.json)
```

## Guardrails

- **`.gitignore`**: Watch for "ignore all except" patterns before adding files
- **Nix eval, not nix build**: Use `nix eval` (0.1-0.3s) not `nix build` (minutes). Never `nix-instantiate`.
- **Pre-commit is the safety net**: hooks run automatically on commit (see `nix/dev.nix`)
- **Coordinator NEVER uses Edit/Write tools**: This is a hard constraint, not a guideline. All file modifications go through worker agents — no exceptions, even when skills instruct "fix directly"

## Workflow

1. New feature branch (always)
2. For architectural changes: write ADR in `docs/architecture/adrs/`
3. For implementation: use built-in planning, delegate via gateway skills
4. Verify correctness (see above) — pre-commit handles the rest
5. Update `.gitignore` for new artifacts

## Serena Memories

Use `list_memories` to discover available project memories.
Read only when working on the relevant area.

## Drizzle Rules

- Always use SQL-like query syntax (`.select().from().where().innerJoin()`) instead of the relational query syntax (`.query.table.findMany({ with: { ... } })`)
- Always wrap multiple operations in a transaction (`db.transaction()`) unless explicitly told otherwise
- Always use `pgEnum` for columns with a fixed set of values — never use plain `text` for enums

## Database Rules

- All `file.id` references must include `{ onDelete: 'restrict' }` to prevent orphaned file records
- All `seo.id` references must include `{ onDelete: 'restrict' }`
- New tables must use `uuid('id').primaryKey().$defaultFn(() => Bun.randomUUIDv7())` as the default primary key unless explicitly told otherwise
- Never modify existing migration files — they may already be applied. Put new changes in a new migration file instead
