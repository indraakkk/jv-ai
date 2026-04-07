# Nix Strategies

How to interact with the flake output tree. Loaded by nix skills — not a gateway, not a process.

## Step 0: Traversal Start (absolute)

Every flake interaction begins here. One command, always:

```bash
rtk git status --short
```

**Git state** determines strategy: dirty tree → **adaptive** (only eval affected paths). Clean tree → **traversal/store-driven/data-driven**.

**Flake top-level** (stable — verify with `rtk nix flake show --json 2>/dev/null | jq 'keys'` only if structure is suspect):

`apps` · `checks` · `darwinConfigurations` · `darwinModules` · `devShells` · `formatter` · `nixosConfigurations` · `nixosModules` · `packages`

Drill one level at a time with `rtk nix eval '.#ATTR' --apply 'builtins.attrNames'`. Never guess structure.

Once you have git state + flake orientation, pick a strategy:

## Strategies

| Strategy | When | Pattern |
|----------|------|---------|
| **Store-driven** | Path is known from traversal. Need a fact. | `rtk nix eval '.#KNOWN.PATH'` |
| **Data-driven** | Need values to feed a process. | `rtk nix eval '.#PATH' --json \| jq '...'` |
| **Traversal** | Still exploring. Go deeper. | `rtk nix eval '.#PATH' --apply 'builtins.attrNames'` |
| **Adaptive** | Know what changed (git diff). Verify impact only. | `rtk git diff --name-only` → map → eval affected paths |

## Source → Affected Paths

Map changed source files to flake output paths (adaptive strategy):

| Source Pattern | Affected Output Paths |
|---|---|
| `nix/modules/*` | `nixosConfigurations.*.config.systemd.*` |
| `machines/*/` | `nixosConfigurations.M.config.*` |
| `services/*/src/*` | `packages.*`, `checks.*` |
| `nix/dev.nix` | `devShells`, `formatter` |
| `flake.nix` / `flake.lock` | EVERYTHING |

## Eval Entry Points

`nix eval` output IS the data. Don't describe what it looks like — eval and read it.

| Need | Eval |
|------|------|
| Machine list | `rtk nix eval '.#nixosConfigurations' --apply 'builtins.attrNames'` |
| Package list | `rtk nix eval '.#packages' --apply 'builtins.attrNames'` |
| DevShell list | `rtk nix eval '.#devShells' --apply 'builtins.attrNames'` |
| Machine NixOS config | `rtk nix eval '.#nixosConfigurations.M.config.ATTR'` |
| Upstream source | Inspect `/nix/store` paths via `rtk nix eval '.#inputs.NAME'` |
