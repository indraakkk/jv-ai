# Complete Verification

## When to use

After completing a task that may span multiple domains, or before marking a task as done. This is the full verification sequence covering TypeScript, Nix, and cross-domain checks.

## Steps

1. **TypeScript type check**:
   ```bash
   rtk bunx tsc --noEmit
   ```

2. **Run all tests**:
   ```bash
   rtk bun test
   ```

3. **Nix outputs check** (0.1-0.3s):
   ```bash
   nix eval '.#packages' --apply 'builtins.attrNames'
   ```

4. **Full Nix flake check** (20-25s, only if structural Nix changes):
   ```bash
   rtk nix flake check . --no-build
   ```

5. **Pre-commit runs automatically on commit** — no need to run manually.

## When to Use Full vs Partial

### Full verification (all 4 steps)
- Cross-domain changes (TS + Nix)
- New services or packages
- Changes to flake inputs or module structure
- Before merging to master

### Partial: TypeScript only (steps 1-2)
- Changes only in `services/` or `packages/`
- No Nix file modifications
- Pure code changes (logic, UI, tests)

### Partial: Nix only (steps 3-4)
- Changes only in `nix/` or `machines/`
- No TypeScript modifications
- Infrastructure or deployment changes

### Minimal: Trivial changes (step 1 or 3 only)
- Single-line fixes, typos, config tweaks
- Run only the relevant domain check

## Additional Checks

- If DB schema changed: `rtk bun --filter app drizzle:generate`
- If `bun.lock` changed: `rtk bun2nix -l bun.lock -o bun.lock.nix`
- If new file types added: update `.gitignore`

## Notes

- NEVER use full-build commands for verification — always `nix eval` or `nix flake check --no-build`
- Pre-commit hooks are the safety net — they run automatically
- Correct code > formatted code — verify behavior, not syntax
