Read and follow the Nix gateway protocol in `.claude/skills/gateway-nix.md`.

This task involves Nix/infrastructure. Load relevant Tier 2 skills from `.claude/skill-library/`, then delegate implementation to the `nix-coder` agent.

**After the nix-coder agent completes:**
1. Update manifest: set implementation phase to `done`
2. Return to the orchestration protocol — continue with phase 9 (Design Verification) and subsequent verification phases
3. Run Nix verification yourself: `nix eval '.#packages' --apply 'builtins.attrNames'`
4. Do NOT stop after delegation — verification is the coordinator's responsibility

Start by detecting the task type and loading the appropriate skill files.
