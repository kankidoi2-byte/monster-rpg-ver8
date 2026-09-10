# Tutorial revision: execution handoff

Updated: 2026-09-10

## Status

- Phase 1 of 12: specification and implementation-impact review complete.
- Phase 2: implemented and locally verified; observe the implementation commit CI before marking complete.
- Next after Phase 2 CI success: Phase 3, opening and rescue integration.
- Runtime implementation: presentation infrastructure only; production story data remains unchanged. Production remains unchanged.
- Branch: `feat/tutorial-revision-20260910-public`.
- Pull request: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/178 (Draft).
- Phase-one handoff commit: `2f9db294355fc25b2af7b21837b3095c0f5686ae`; use the latest remote head for resumption.
- Baseline: `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`.
- Phases 3 through 12: pending. Resume the earliest incomplete phase; do not restart completed work.

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
4. Verify Phase 2 implementation CI. If successful, continue Phase 3 rather than reimplementing the presentation layer. Consult `docs/tutorial-dialogue-pages.md` for the API and authoring boundaries.
5. Integrate only the opening/rescue scope from the user's approved requirements. Preserve name entry, world-map navigation, action gates, guest cleanup and victory/retry behavior. Do not copy the private source document wholesale into repository documentation.
6. Add focused opening/rescue tests, run `npm run check`, inspect the diff and record outcomes. Do not introduce save migration without the required specific approval.
7. Commit/push the bounded result and update this handoff. Later narrative/combat/alchemy/expedition phases remain pending.

## Phase 2 implementation record

- Added optional immutable dialogue pages with inherited speaker/portrait/scene fields and explicit clearing. Shared speaker labels are supported; there is still one portrait layer.
- Added 2–4 choices on the final page, converging to the normal continuation. Invalid/mixed action-page schemas are rejected. Existing 96 production steps and all story text are unchanged.
- Added transient page state, Back within the first step, a 250 ms double-tap guard, stale-choice invalidation and choice-aware conversation skip. No save fields, persistent IDs, rewards or battle logic changed.
- New dialogue preserves authored newlines and wraps long names/text. Dynamic labels use textContent. CSS/JS cache revisions updated.
- `npm run check` passed including postcheck. Legacy fixture setup was extended with the new transient state; the CSS cache assertion still verifies the prior fix while permitting newer cache revisions.
- New dynamic tests passed: invalid schema rejection, single-text compatibility, speakers/scenes, both choices, literal names, double taps, Back, skip, parent-checkpoint resume, stale buttons and chapter boundaries.
- Chromium 140 headless browser tests passed: 320x568, 360x640, 390x844, 844x390, 1366x768 and 360x640 with 2x text. Tests enter through the title screen and use isolated contexts/synthetic dialogue. Verified scrolling, Back, choices, keyboard input and unchanged real-screen action blocking; zero page errors.
- Japanese typography was checked with a Japanese-capable system font. Optional reproduction: `scripts/check-tutorial-dialogue-browser.cjs`; dependencies/browser are environment-owned, not added to production.
- Initial browser setup had unavailable binary/download endpoints; a supported downloaded browser resolved this. No failed browser run is counted as a passing run.
- This is unused presentation infrastructure, not released story content. No player notice is needed yet. No physical Android/Chromebook check or production publication is claimed.

## Release policy

- Keep the complete tutorial revision in one Draft PR on this branch; do not merge an incomplete runtime into main.
- Follow `tools/game-production-orchestrator/risk-approval-contract.json` at every implementation and merge boundary.
- Preserve saves, stable IDs, unrelated edits and current gameplay outside the requested scope.
- Before release: complete all phases, review the diff, update player notices for observable changes, pass the full checks and required CI, obtain any required approval/device verification, merge through PR and verify Pages and the published game.
- If another execution is active, do not duplicate it. If blocked, record the precise remaining requirement rather than marking the phase complete.
