# Tutorial revision: execution handoff

Updated: 2026-09-10

## Status

- Phase 1 of 12: specification and implementation-impact review complete.
- Phase 2 of 12: complete (implementation, local tests, browser checks and implementation CI verified).
- Phase 3: complete (implementation, local checks, browser checks, repairs and implementation CI verified).
- Next: Phase 4. No execution remains active after this completion handoff.
- Runtime implementation: dialogue infrastructure plus opening/rescue integration in this Draft PR. Production remains unchanged.
- Branch: `feat/tutorial-revision-20260910-public`.
- Pull request: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/178 (Draft).
- Phase-one handoff commit: `2f9db294355fc25b2af7b21837b3095c0f5686ae`; use the latest remote head for resumption.
- Baseline: `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`.
- Phases 4 through 12: pending. Resume Phase 4; do not restart completed work.

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
4. Phase 3 implementation CI is verified below. Refresh latest head checks, then implement Phase 4 (contract, party/dex/growth and reward integration).
5. Preserve the existing contract transaction and stable checkpoints. Separate pre-contract consent from post-contract farewell in the revised conversation order. Keep contract-body grants idempotent.
6. Use `docs/tutorial-dialogue-pages.md`; action/input steps cannot contain dialogue pages. Do not reinsert explanations removed from the source.
7. Run focused compatibility checks and `npm run check`, review the diff, commit/push and record outcomes. Do not merge this incomplete tutorial revision.

## Phase 2 implementation record

- Implementation commit: `c27c0318fa1d79e5054fcbf667bdd09e020d6967`.
- Implementation CI: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34443754188 — completed/success observed 2026-09-10. The follow-up completion-record commit changes documentation only.

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

## Phase 3 implementation record

- Implementation commit: `3581129021265605fd6f8696065defacf2c58952`.
- Implementation CI: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34445744158 — completed/success observed 2026-09-10. The follow-up completion-record commit changes documentation only.

- Refreshed source at execution start: modified 2026-09-09T13:44:38.697Z. Source document was read only; no transcript/specification export into repository documentation.
- Refreshed main: `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`; PR #178 open/mergeable. Phase 2 latest completion-record CI was successful. Main Validate and Pages deployment were successful; production was not modified.
- Updated opening/rescue runtime dialogue using the presentation API. Arrival stays in the existing encounter checkpoint; the rally is also present on the normal map route, which starts combat directly.
- Retained name entry and real map/action gates, deterministic rescue waves, temporary guest, starter transaction and retry behavior. No entity IDs, save fields, schema/tutorial versions or `mb_v95c` changes; no migration was added.
- New rescue victories now checkpoint the existing `elna_rescue_complete` conversation until its pages finish, then advance to `elna_contract_intro`. Old saves already at the latter ID still resume there; they are not rewound. Battle interruption retains `elna_rescue_start`.
- Fixed an observed landscape map-action obstruction: when vertical room is insufficient and horizontal room is available, position the guide beside its target. Added geometry regression checks.
- New dependency-free integration checks cover encounter/speaker pages, interrupted dialogue, normal map-route rally and action blocking, victory/defeat/retreat/error, duplicate outcomes, and contract connection.
- Existing journey fixture now advances its test clock between deliberate inputs to exercise the real double-tap guard. Historical wording assertions were updated to the revised runtime copy; gameplay assertions remain.
- `npm run check` including postcheck passed. Notice-only follow-up passed `npm run check:notices`; `git diff --check` passed.
- Chromium 140 browser checks: 360x640 and 844x390. Actual title/name/map/actor/target/normal attack/skill operations, encounter and battle reload, defeat/retry, two-wave production victory handling, victory-dialogue reload and duplicate-grant protection passed. HP was set deterministically for outcome coverage; this is not a balance playtest or a physical-device check.
- Browser runner: `scripts/check-tutorial-opening-browser.cjs`, using the same optional environment-owned Playwright/browser setup as the Phase 2 runner. No test dependencies were added to production.
- Player notice added on this branch for the revised opening and landscape fix. Expand/re-date appropriately at final release.
- Phase 4 contract conversation onward remains pending; existing later content is intentionally not represented as revised or released. Physical Android/Chromebook checks and final publication remain later gates.
