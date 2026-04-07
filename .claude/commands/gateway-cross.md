Read and follow the cross-domain gateway protocol in `.claude/skills/gateway-cross.md`.

This task spans both TypeScript and Nix domains. Identify domain components, determine execution order, then delegate to the appropriate domain gateways.

**After all worker agents complete:**
1. Update manifest: set implementation phase to `done`
2. Return to the orchestration protocol — continue with phase 9 (Design Verification) and subsequent verification phases
3. Run full verification yourself (both TS and Nix): see `.claude/skills/verify-complete.md`
4. Do NOT stop after delegation — verification is the coordinator's responsibility

Start by listing all files that need to change and classifying each as TS-domain or Nix-domain.
