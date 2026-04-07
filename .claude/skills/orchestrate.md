# 16-Phase Orchestration Protocol

## When to use

Every non-trivial task. This is the master workflow that governs how work moves from request to completion. Start here, then delegate to domain gateways.

## Phase Table

| # | Phase | Purpose |
|---|-------|---------|
| 1 | Setup | Read manifest, load context, identify branch |
| 2 | Triage | Classify task type and size |
| 3 | Discovery | Explore codebase: find relevant files, patterns, conventions |
| 4 | Skill Discovery | Load relevant Tier 2 skills from `.claude/skill-library/` |
| 5 | Complexity | Estimate scope, identify risks and unknowns |
| 6 | Brainstorming | Generate 2-3 approach options, pick best |
| 7 | Architecture | Design component structure, data flow, interfaces |
| 8 | Implementation | Write the code |
| 9 | Design Verification | Check architecture decisions were followed |
| 10 | Domain Compliance | Verify CLAUDE.md rules (imports, naming, types, comments) |
| 11 | Code Quality | Review for domain-specific quality rules, proper error handling. MEDIUM+: run `/simplify` |
| 12 | Test Planning | Identify what to test, edge cases, integration points |
| 13 | Testing | Write and run tests |
| 14 | Coverage Verification | Ensure critical paths are covered |
| 15 | Test Quality | Review test quality: no false positives, meaningful assertions |
| 16 | Completion | Final verification, update manifest, summarize |

## Phase Skipping Rules

### TRIVIAL (single-line fix, typo, config tweak)
- Run phases: **1, 8, 16 only**
- Skip everything else

### SMALL (<100 lines, single domain, well-understood)
- Skip phases: **5, 6, 7, 9, 11**
- Run: 1, 2, 3, 4, 8, 10, 12, 13, 14, 15, 16

### MEDIUM (multi-file, single or dual domain)
- Skip phases: **5 only**
- Run all others

### LARGE (new subsystem, cross-domain, architectural)
- Run **all 16 phases**
- No skipping

## Steps

1. **Read manifest** — Check if `.data/manifest.yaml` exists:
   ```bash
   rtk cat .data/manifest.yaml 2>/dev/null || echo "No manifest found"
   ```

2. **Classify the task** — Determine size (TRIVIAL/SMALL/MEDIUM/LARGE) based on:
   - Number of files affected
   - Number of domains (TS, Nix, or both)
   - Whether new patterns or subsystems are introduced

3. **Select phase set** — Apply skipping rules from above

4. **Execute phases in order** — For each active phase:
   - State which phase you are entering
   - Complete the phase fully before moving on
   - **Write manifest after EVERY phase transition** using the template below
   - After Implementation (phase 8), you MUST continue to verification phases — do not stop

5. **Route to domain gateways** — During Discovery (phase 3) and Implementation (phase 8):
   - TypeScript/Effect/React work → run `/gateway-ts` (delegates to `effect-coder`)
   - Nix/infra work → run `/gateway-nix` (delegates to `nix-coder`)
   - Cross-domain work → run `/gateway-cross`
   - Non-domain work (docs, hooks, scripts, configs) → delegate to default agent directly

6. **Verification** — During phases 9-15:
   - TS verification → use `verify-typescript.md`
   - Nix verification → use `verify-nix.md`
   - Full verification → use `verify-complete.md`

## Manifest Management

The manifest tracks task state across context windows. Located at `.data/manifest.yaml`.

### Reading manifest
```bash
rtk cat .data/manifest.yaml
```

### Writing manifest — MANDATORY at every phase transition

> **The coordinator MUST NOT edit `.data/manifest.yaml` directly.** Delegate all manifest writes to a one-shot agent to preserve the Edit boundary.

Spawn a default agent with a prompt like:
```
Read .data/manifest.yaml, update current_phase to X, add Y to completed_phases, add finding Z. Write the updated file.
```

The agent must preserve the schema below when writing.

### Manifest schema

```yaml
version: 1
current_task:
  description: "description of current task"
  type: MEDIUM
  domains: [nix]
current_phase: 8
completed_phases: [1, 2, 3, 4, 6, 7]
findings:
  - "relevant file: services/app/src/..."
  - "pattern to follow: ..."
decisions:
  - "chose approach A because..."
dirty_files: []
blockers: []
active_tasks:
  - id: "task_id_here"
    description: "what the task does"
    output_path: ".data/tasks/task_id.output"
    status: "running"  # running, completed, failed
session_context:
  handoff_notes: null
  context_usage_percent: 0
```

This format is parsed by `inject-reminders.sh` and `session-stop-guard.sh` — do not change the field names.

### Background task tracking via `active_tasks`

When launching background tasks (e.g., long builds, deploys):
1. Spawn a one-shot agent to add the task entry to `active_tasks` in the manifest with status `running`
2. Use a unique `id` (e.g., `deploy-ovh-20260330`) and record the `output_path` where results will be written
3. When checking on tasks, read the output file at `output_path` for completed/failed tasks
4. After processing a completed/failed task, spawn a one-shot agent to update its status or remove it from `active_tasks`

### Compaction recovery

On session resume (phase 1 — Setup), if the manifest contains `active_tasks`:
1. For each task with status `running`, read its `output_path` to check if it completed or failed
2. If the output file is missing, treat the task status as `unknown` and ask the user
3. Process results of completed tasks (log findings, update manifest)
4. Clear completed/failed tasks from `active_tasks` via a one-shot agent
5. Resume from the recorded `current_phase`

### Update manifest at each phase transition
Record: phase completed, key findings, decisions made, files modified.

## Compaction Gates

**Block execution at >85% context usage before these phases:**
- Phase 3 (Discovery) — heavy reading ahead
- Phase 8 (Implementation) — heavy writing ahead
- Phase 13 (Testing) — heavy reading/writing ahead

When hitting a compaction gate:
1. Write current state to `.data/manifest.yaml`
2. List all files modified so far
3. Summarize key decisions and findings
4. Request user to continue in new context window

## Notes

- Always check CLAUDE.md rules during Domain Compliance (phase 10)
- Preserve existing comments during Implementation (phase 8)
- Pre-commit hooks handle formatting — never run formatters manually
- If a phase produces no actionable output, note "N/A" and move on
- **Phase 11 (Code Quality)**: Review for domain-appropriate quality rules (e.g., proper types in TS, idiomatic patterns in Nix, clear naming everywhere). For **MEDIUM and LARGE** tasks, run `/simplify` on the implementation commit. Fix any issues found before proceeding to phase 12.
- **User interaction**: When a phase requires user input (e.g., choosing between options in Brainstorming, confirming design in Architecture, or clarifying requirements in Triage), always use the `AskUserQuestion` tool. Never output questions as plain text.
