# Verify Nix

## When to use

After any changes to Nix files (`nix/`, `machines/`, `flake.nix`). Use the fastest possible verification commands.

## Steps

1. **Check flake outputs** (0.1-0.3s):
   ```bash
   nix eval '.#packages' --apply 'builtins.attrNames'
   ```
   Confirms all packages are valid and discoverable.

2. **Check NixOS configurations** (0.1-0.3s):
   ```bash
   nix eval '.#nixosConfigurations' --apply 'builtins.attrNames'
   ```
   Confirms all machine configurations evaluate correctly.

3. **Check specific service config** (0.9-1.9s):
   ```bash
   nix eval '.#nixosConfigurations.MACHINE.config.services.SERVICE.enable'
   ```
   Replace MACHINE and SERVICE with actual names.

4. **Full flake check** (20-25s, use sparingly):
   ```bash
   rtk nix flake check . --no-build
   ```
   Only use for structural changes (new modules, changed flake inputs, refactored infra).

## NEVER Use

- Full-build commands — takes minutes, unnecessary for verification
- Legacy instantiate commands — takes 90-120s, outdated approach
- `nix flake check` without `--no-build` — will attempt full builds
