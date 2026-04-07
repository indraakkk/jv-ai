# Nix Gateway

## When to use

When the task involves Nix expressions, NixOS modules, machine configs, systemd services, networking, or anything under `nix/` or `machines/`.

## Steps

1. **Detect task type** — Examine which area of Nix infra is involved:
   - New or modified NixOS module → module work
   - Systemd unit files or service hardening → systemd services
   - Firewall rules, networking, DNS → networking
   - General Nix (flake, devshell, CI) → general Nix

2. **Load relevant Tier 2 skills** based on task type:

   ### Systemd services
   ```
   .claude/skill-library/systemd-hardening.md
   ```

   ### General Nix
   No additional Tier 2 skills needed — use `nix-strategies.md` (Tier 1).

3. **Route to appropriate agent**:
   - Nix files (`.nix`, `machines/`, `nix/`) → delegate to `nix-coder` agent
   - Non-Nix files touched by the task (`.md`, `.sh`, `.yaml`) → delegate to default agent
   - Never use `nix-coder` for markdown, shell scripts, or YAML configs

4. **Verify with fast Nix evals** (not full-build):
   ```bash
   nix eval '.#packages' --apply 'builtins.attrNames'
   nix eval '.#nixosConfigurations' --apply 'builtins.attrNames'
   ```

5. **Full validation only if structural changes**:
   ```bash
   rtk nix flake check . --no-build
   ```
   This takes 20-25s — use sparingly.

## Notes

- NEVER use slow full-build or legacy instantiate commands (minutes vs 0.1-0.3s)
- Check flake outputs dynamically — machines discovered from `nixosConfigurations`, not hardcoded
- When design decisions or clarifications are needed, use the `AskUserQuestion` tool — never output questions as plain text
