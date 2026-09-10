# Tutorial revision: execution handoff

Updated: 2026-09-10

## Status

- Phase 1 of 12: specification and implementation-impact review complete.
- Next: Phase 2, backward-compatible dialogue presentation infrastructure.
- Runtime implementation: not started. Production remains unchanged.
- Branch: `feat/tutorial-revision-20260910-public`.
- Pull request: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/178 (Draft).
- Phase-one handoff commit: `2f9db294355fc25b2af7b21837b3095c0f5686ae`; use the latest remote head for resumption.
- Baseline: `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`.
- Phases 2 through 12: pending. Resume the earliest incomplete phase; do not restart completed work.

## Evidence from the public repository

- `js/tutorial.js` currently registers 96 main-flow steps.
- Presentation currently normalizes one speaker, portrait, scene and text per step.
- `js/story.js` defines six prologue episodes; episode boundaries and tutorial checkpoints must be tested together.
- Save contracts: `mb_v95c`, schema 4, tutorial version 2. Do not increment versions or change persistent meanings without reviewing migration impact and the approval contract.
- Existing portrait documentation and runtime references differ; consult runtime code rather than treating historical documentation as current state.
- Baseline Validate succeeded: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34411964910
- Baseline Pages deployment succeeded: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34411963644
- Production root responded HTTP 200 on 2026-09-10. This is not a gameplay or device test.
- Local `npm run check`, including postcheck, passed with exit code 0.
- The first shallow-clone check failed because historical object `d31cfccd` was missing. Fetching full history and rerunning the complete check resolved that environment issue; no assertion was removed.
- This phase changes documentation only. No player notice is needed and no new Android/Chromebook verification is claimed.

## Next execution

1. Refresh main, this branch, its PR, CI and applicable AGENTS instructions. Do not assume this recorded baseline is still current.
2. Consult the user's task and privately retained requirements before implementation. Do not export private source documents or detailed source-derived specifications into this public repository.
3. Resume this same branch. Do not publish the local rejected source-snapshot branch or cherry-pick its commits.
4. Add backward-compatible support for multi-part dialogue, speaker changes and choices in the presentation layer. Keep existing single-text steps working. Do not replace story content during the infrastructure phase.
5. Prefer transient dialogue-page state; confirm safe parent-checkpoint resumption without repeated side effects. Any required persistent migration is a separate approval decision.
6. Add focused presentation tests, run `npm run check`, inspect the diff and record outcomes. Distinguish simulated viewport checks from actual Android/Chromebook verification.
7. Commit/push the bounded result and update this handoff. Do not start Phase 3 before Phase 2 is verified.

## Release policy

- Keep the complete tutorial revision in one Draft PR on this branch; do not merge an incomplete runtime into main.
- Follow `tools/game-production-orchestrator/risk-approval-contract.json` at every implementation and merge boundary.
- Preserve saves, stable IDs, unrelated edits and current gameplay outside the requested scope.
- Before release: complete all phases, review the diff, update player notices for observable changes, pass the full checks and required CI, obtain any required approval/device verification, merge through PR and verify Pages and the published game.
- If another execution is active, do not duplicate it. If blocked, record the precise remaining requirement rather than marking the phase complete.
