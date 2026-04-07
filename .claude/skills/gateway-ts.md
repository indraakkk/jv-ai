# TypeScript Gateway

## When to use

When the task involves TypeScript, Effect-TS, React, Drizzle, or any code under `services/` or `packages/`. This gateway routes to the correct Tier 2 skills and the `effect-coder` agent.

## Steps

1. **Detect task type** — Examine which files and patterns are involved:
   - Database schema or queries → DB work
   - Effect Layer/Service/pipe patterns → Effect services
   - React components, hooks, JSX/TSX → Frontend/React
   - General TypeScript (utils, types, config) → General TS

2. **Load relevant Tier 2 skills** based on task type:

   ### DB work
   ```
   .claude/skill-library/drizzle-patterns.md
   .claude/skill-library/layer-data.md
   ```
   Also reference: `add-drizzle-table.md` skill for new tables.

   ### Effect services
   ```
   .claude/skill-library/effect-patterns.md
   ```
   Also reference: `effect-service-pattern.md` skill for templates.

   ### Frontend/React
   ```
   .claude/skill-library/layer-frontend.md
   ```

   ### General TS
   ```
   .claude/skill-library/effect-patterns.md
   ```

3. **Route to appropriate agent**:
   - TypeScript/Effect files (`.ts`, `.tsx`, `services/`, `packages/`) → delegate to `effect-coder` agent
   - Non-TS files touched by the task (`.md`, `.json`, `.yaml`) → delegate to default agent
   - Never use `effect-coder` for markdown, shell scripts, or configs

4. **Verify CLAUDE.md compliance** during and after implementation:
   - Import order: builtins → external → Effect → @jackson-ventures/* → relative
   - No explicit `any` — use proper types
   - Prefer `const` over `let`
   - File naming: `kebab-case.ts` for files, `PascalCase.tsx` for components
   - SQL-like Drizzle syntax, not relational query syntax
   - Foreign key refs: `{ onDelete: 'restrict' }` where appropriate

5. **Run TypeScript verification**:
   ```bash
   rtk bunx tsc --noEmit
   rtk bun test
   ```

## Notes

- Check `package.json` in relevant service/package for available scripts
- If DB schema changed, generate migration: `rtk bun --filter app drizzle:generate`
- If `bun.lock` changed: `rtk bun2nix -l bun.lock -o bun.lock.nix`
- When design decisions or clarifications are needed, use the `AskUserQuestion` tool — never output questions as plain text
