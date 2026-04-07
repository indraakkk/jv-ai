Read and follow the TypeScript gateway protocol in `.claude/skills/gateway-ts.md`.

This task involves TypeScript/Effect/React. Load relevant Tier 2 skills from `.claude/skill-library/`, then delegate implementation to the `effect-coder` agent.

**After the effect-coder agent completes:**
1. Update manifest: set implementation phase to `done`
2. Return to the orchestration protocol — continue with phase 9 (Design Verification) and subsequent verification phases
3. Run TS verification yourself: `rtk bunx tsc --noEmit` and `rtk bun test`
4. Do NOT stop after delegation — verification is the coordinator's responsibility

Start by detecting the task type and loading the appropriate skill files.
