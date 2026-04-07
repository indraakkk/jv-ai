# Verify TypeScript

## When to use

After any changes to TypeScript files under `services/` or `packages/`. Verifies type correctness, test behavior, and codebase conventions.

## Steps

1. **Type-level correctness**:
   ```bash
   rtk bunx tsc --noEmit
   ```
   Catches type errors across the entire project without emitting files.

2. **Behavioral correctness** — run tests:
   ```bash
   rtk bun test
   ```
   Runs all test suites.

3. **Watch mode** (for iterative development):
   ```bash
   rtk bun test:watch
   ```

4. **Check import order** in modified files:
   - builtins (e.g., `node:path`, `node:fs`)
   - external packages (e.g., `hono`, `drizzle-orm`)
   - Effect ecosystem (e.g., `effect`, `effect/Schema`)
   - @jackson-ventures/* workspace packages
   - relative imports (e.g., `./utils`, `../config`)

5. **If DB schema changed** — generate migration:
   ```bash
   rtk bun --filter app drizzle:generate
   ```

6. **If `bun.lock` changed** — regenerate Nix lock:
   ```bash
   rtk bun2nix -l bun.lock -o bun.lock.nix
   ```

## Rules

- No explicit `any` — always use proper types
- Prefer `const` over `let`
- Use SQL-like Drizzle syntax, not relational queries
- File naming: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- Pre-commit hooks handle formatting — never run formatters manually
