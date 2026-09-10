# Tutorial revision: execution handoff

Updated: 2026-09-10

## Status

- Phase 1 of 12: specification and implementation-impact review complete.
- Phase 2 of 12: complete (implementation, local tests, browser checks and implementation CI verified).
- Phase 3: complete (implementation, local checks, browser checks, repairs and implementation CI verified).
- Phase 4: complete (implementation, local checks, browser checks, repairs and implementation CI verified).
- Phase 5: complete (implementation, local checks, browser checks, repairs and implementation CI verified).
- Phase 6: implemented; final verification and implementation CI handoff active.
- Runtime implementation: dialogue infrastructure, opening/rescue and contract/preparation/reward integration in this Draft PR. Production remains unchanged.
- Branch: `feat/tutorial-revision-20260910-public`.
- Pull request: https://github.com/kankidoi2-byte/monster-rpg-ver8/pull/178 (Draft).
- Phase-one handoff commit: `2f9db294355fc25b2af7b21837b3095c0f5686ae`; use the latest remote head for resumption.
- Baseline: `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`.
- Phases 7 through 12: pending. Finish Phase 6 handoff, then resume Phase 7.

## Evidence from the public repository

- `js/tutorial.js` currently registers 97 main-flow steps.
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
4. Refresh latest head checks and finish Phase 6 CI handoff if needed, then implement Phase 7: pursuit through the academy and workshop conversation.
5. Preserve completed opening/contract/reward and capital/skill preparation behavior. Phase 7 must replace the old workshop introduction while preserving the completed Stella battle and chapter checkpoints.
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

## Phase 4 implementation record

- Implementation commit: `f2fbb1347844747ee9b0d3fd63d7d8a40be548f1`.
- Implementation CI: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34447223622 — completed/success observed 2026-09-10. The follow-up completion-record commit changes documentation only.

- Refreshed source at execution start: modified 2026-09-09T13:44:38.697Z. Read only; source document was not edited or exported into repository documentation.
- Refreshed main: `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`; PR #178 open/mergeable, previous completion-head CI successful; main Validate/Pages successful.
- Integrated the revised pre-contract explanation, explicit consent at the existing contract input, post-contract multi-speaker farewell, body introduction and preparation/reward copy. Preserved existing action targets and episode boundaries.
- Existing `elna_contract_consent` hosts question/explanation pages; `elna_contract_execute` remains the explicit contract operation; `elna_contract_departure` remains post-grant dialogue. No new step IDs, save fields, schema/version changes or migration. Stable grant/reward transactions are unchanged.
- Existing old saves at execution resume with consent before the operation. Post-grant saves resume farewell; no pre-grant dialogue is replayed as a new grant.
- Added contract conversation assertions; kept and ran transaction tests for duplicate grants, existing-body reuse, failed-save rollback and replay protection. Reward remains 250 coins plus four materials, one each, with repeated-claim and failed-save coverage.
- Browser: Chromium 140, 360x640 and 844x390. Actual contract operation; interrupted animation/reload on portrait and normal animation completion on landscape; party save, character/monster dex, growth details/skill navigation, request report and reward claim; reload and duplicate body/reward checks. Normal rank-up dialog is dismissed through its UI. Battle HP is controlled only in the test to reach the contract boundary.
- Fixed observed landscape menu-button obstruction: scroll small offscreen targets below the fixed header, restore temporary scroll margin, and keep action guides within usable adjacent space with scrolling. Added geometry/scroll regressions; rechecked opening/rescue browser flow because positioning is shared.
- `npm run check` including postcheck passed. Additional contract/scroll assertions and notice follow-up checks passed. `git diff --check` passed. Historical wording assertions now match revised runtime copy without removing transaction coverage.
- Browser reproduction: `scripts/check-tutorial-contract-browser.cjs` with environment-owned Playwright and `PLAYWRIGHT_EXECUTABLE_PATH`; optional `TUTORIAL_VIEWPORT_WIDTH` selects one test viewport.
- Expanded the existing unreleased player notice and cache keys. Production remains unchanged; physical Android/Chromebook verification is not claimed.
- Phase 5 is next. Later content and release remain pending.


## Phase 5 implementation record

- Implementation commit: `e020f20aa471bf2c7a26429001af02a3c75fe775`.
- Implementation CI: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34448451400 — completed/success observed 2026-09-10. Completion-record follow-up changes documentation only.
- Refreshed the read-only source (modified 2026-09-09T13:44:38.697Z), main `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`, open/mergeable PR #178, preceding completion-head CI and main Validate/Pages at execution start. No source-document edits or transcript exports.
- Added road conversation and two converging choices, then capital arrival/collision and skill preparation. Scene persists between speakers and changes at arrival. Gnosis handles the skill/attribute explanation. Updated episode label, unreleased notice and affected cache keys.
- Added only `stella_road_response` as a conversation checkpoint. Existing entry, skill, facility and episode IDs remain available; save fields, schema/tutorial versions and `mb_v95c` are unchanged. New route bypasses the old pre-collision academy visit; its facility handlers remain supported for legacy entry paths.
- Response checkpoint follows retained facility entries; explicit forward and previous links keep both continuation and Back out of the old route. Added optional previousStepId presentation configuration, with page-level Back unchanged. Reopening it restarts that conversation without repeating the choice. Both answers converge; no branch-dependent reward is introduced.
- Existing one-time card transaction, replay protections and equipment operations remain unchanged. Full journey fixture now follows the choice/capital route and explicitly rejects the old pre-collision visit, while keeping workshop and free-exploration coverage.
- Added dynamic checks for both answers, mandatory choice, scene change, checkpoint resume and skip stopping before the card transaction. Historical step-count and route assertions were updated; legacy facility and transaction coverage retained.
- `npm run check` including postcheck passed; `git diff --check` passed. Chromium 140 at 360x640 and 844x390 verified both answers, Back, speaker/scene continuity, response and skill checkpoints, one-time card receipt, actual skill equipment and attribute-chart actions. Opening/rescue browser smoke also passed both viewports (title/name/map/actions, retry, victory, save/reload). No physical Android/Chromebook verification or production publication is claimed.
- Phase 6 owns replacement of the still-existing legacy practice battle and its instructions. Do not merge or publish this intermediate revision. No new unresolved story-setting question was introduced in this phase.


## Phase 6 implementation record

- Implementation commit and CI: pending publication/observation in this execution.
- Read latest source (modified 2026-09-09T13:44:38.697Z), refreshed main `fbf802a9a0a3e8b50bb6149221b254abf1f74cee`, PR #178 open/mergeable, latest completion-head CI and main Validate/Pages success. Direct production HTTP probe did not complete in this environment; no new live-game verification is claimed. Source document remains unchanged.
- Replaced the scripted Grassbeat practice opponent with existing character `stella_apprentice`, including existing combat art/moves. Reused capital/academy map metadata with a capital-specific start log; this is a scripted encounter, not a change to random Easy encounter eligibility.
- Uses Easy level-one scaling (0.85 HP and attack), forced single battle, no invasion/second enemy and no usual hunt reward or contract settlement. Ordinary encounters, character data and starter records are unchanged.
- Any selected skill or normal attack advances guidance, regardless of element, effectiveness or actor. Added the existing neutral normal-attack button to this battle so empty/support-only equipment cannot block damage. Historical internal hook/DOM names remain compatible; they no longer impose an advantage check.
- Any actual victory clears the battle, including a win without using a skill. Defeat/retreat/error lead to retry. Interruption restarts the existing battle checkpoint. Victory now persists `stella_mock_victory` until its conversation finishes, then continues to existing `lumina_intro`; old saves already at Lumina are not rewound. No save schema/version, fields, entity IDs or `mb_v95c` changes; no migration added.
- Updated battle/start/victory/retry dialogue and speakers, notice and affected asset cache keys. Source sections after the victory boundary remain for Phase 7.
- Updated focused tests for person identity, unrestricted neutral/support/other-actor moves, no rewards, outcomes without an advantageous action, duplicate outcome rejection, interruption/checkpoint compatibility and full journey. Prior mock-specific assertions were replaced by the authorized rules; unrelated gates remain.
- Chromium 140: 360x640 and 844x390 passed actual start, battle reload, neutral normal attack, deterministic defeat, UI retry, natural neutral-only victory (four attacks in each observed run), unchanged inventory/contracts and victory reload/next episode. Enemy HP was not edited for winning; these two observed runs are bounded difficulty evidence, not exhaustive balance or physical-device verification.
- `npm run check` including postcheck and `git diff --check` passed. Opening/rescue regression browser passed both viewports (title/name/map/actor/attacks, defeat/retry, victory, save/reload) after the shared skill-button change. No new major story ambiguity was introduced. Next: Phase 7. Do not merge or publish before all phases/release gates complete.
