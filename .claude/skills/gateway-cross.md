# Cross-Domain Gateway

## When to use

When the task spans both TypeScript and Nix domains. Common scenarios: adding a new service (needs both NixOS module + TS app), deployment pipeline changes, or any work touching both `services/`+`packages/` and `nix/`+`machines/`.

## Steps

1. **Identify domain components** — Split the task into TS and Nix parts:
   - List all files that need to change
   - Classify each as TS-domain or Nix-domain
   - Identify cross-domain dependencies (e.g., Nix config values consumed by TS code)

2. **Determine execution order** — Check for dependencies between domains:
   - **Independent**: TS and Nix changes don't depend on each other → parallel
   - **Nix-first**: TS code depends on infra being configured (e.g., new service needs NixOS module) → sequential, Nix then TS
   - **TS-first**: Nix config depends on TS build artifacts (e.g., new package needs Nix packaging) → sequential, TS then Nix

3. **Delegate to domain gateways**:
   - TS components → follow `gateway-ts.md`
   - Nix components → follow `gateway-nix.md`
   - Use respective agents: `effect-coder` for TS, `nix-coder` for Nix

4. **Handle cross-domain interfaces** — Common integration points:
   - **Environment variables**: Defined in Nix (module options), consumed in TS
   - **Ports/URLs**: Service ports defined in Nix, referenced in TS client config
   - **File paths**: Nix determines paths (state dirs, cert dirs), TS reads them

5. **Verify all domains after completion**:
   ```bash
   # TypeScript verification
   rtk bunx tsc --noEmit
   rtk bun test

   # Nix verification
   nix eval '.#packages' --apply 'builtins.attrNames'
   nix eval '.#nixosConfigurations' --apply 'builtins.attrNames'

   # Full cross-domain check (if structural changes)
   rtk nix flake check . --no-build
   ```

## Example: New Service (NixOS Module + TS App)

1. **Nix side** (first — TS may depend on module config):
   - Create NixOS module under `nix/` or `machines/`
   - Define options, systemd service, firewall rules
   - Verify: `nix eval '.#nixosConfigurations' --apply 'builtins.attrNames'`

2. **TS side** (second):
   - Create `services/<name>/` with package.json, tsconfig, src/
   - Implement Effect service layers
   - Add to root workspace
   - Verify: `rtk bunx tsc --noEmit && rtk bun test`

3. **Integration**:
   - Wire environment variables from NixOS module options to TS config
   - Set up health checks if needed
   - Run full verification

## Notes

- Always verify both domains even if you only changed one — cross-domain side effects are common
- When in doubt about execution order, Nix-first is usually safer
- Update `.data/manifest.yaml` with cross-domain status tracking
- When design decisions or clarifications are needed, use the `AskUserQuestion` tool — never output questions as plain text
