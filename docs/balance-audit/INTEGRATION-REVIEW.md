# PR #175 integration review — 2026-09-10

## Release status

**Draft / not merged / not published.** Automated checks are evidence of isolated code execution, not Android, Chromebook, visual layout, or browser reload verification. The user's PR #174 device approval is not approval of PR #175. The current request authorizes commits, push and PR updates, but requires unmet release gates to stop merge.

Start: main `b9184a82a169fe8dadad67b51c119dc4b706aa70`; PR #175 head `7415001f0d16615533b425ce65d5ed0a5f607633` (Draft/open/conflicted). PR #176 merged at `927fdbe40adee4eb43f38b3b722063f08e2019d6`, then PR #174 merged at current main. Both are closed/merged, not pending.

- [main validate 34407516276](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34407516276): completed/success, verified via API.
- [main Pages 34407514696](https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/34407514696): completed/success, verified via API.
- [Published game](https://kankidoi2-byte.github.io/monster-rpg-ver8/): HTTP 200; index SHA256 `1298c61edaaf9bada50a6e36b53c126647081189c42ee6c81021ea3b199dba92`, byte-identical to main. This is the existing production version, **not a PR #175 preview**.
- Ruleset 21882735: active, no bypass actors, PR and `validate` required; deletion and non-fast-forward prohibited. No direct main update or force push.

## Merge and scope

An isolated worktree was created from the current PR head; existing worktrees were not edited. Merge of current main resolved `index.html`, `js/notices-data.js`, `package.json`. All prior PR changes were retained. Notice IDs are unique and newest-first. World-map and first-play script identifiers remain; balance-audit identifiers remain on notices, kokoro-link and multi-battle scripts. No duplicate script loading.

Gameplay diff from current main remains exactly the original PR's `js/kokoro-link.js` and `js/multi-battle.js`: enemy levels/HP preservation, poison credit, target-key transfer and per-enemy level markup. Data, save format/key, IDs, reward formulas, expedition multipliers, skill weights and EXP requirements are unchanged. The proposed EXP change is a **required-EXP curve reduction**, not an implemented reduction of earned EXP. All balance proposals remain VM-only experiments.

## Artifact retention decisions

| Category | Decision | Reason |
|---|---|---|
| Reproduction source, runners, candidate VM patches, report generator | Retain all | Reconstruct baseline and comparisons without changing gameplay |
| Fixed seed, source SHA/hashes, configuration, environment, commands | Retain README, preflight, manifest, results metadata | Complete reproducible inputs and baseline identity |
| Numeric aggregates, confidence intervals, snapshots, comparison tables | Retain results/comparisons/economy/mechanics/acquisition JSON | Review evidence; no values or fields removed; one array row per line |
| Detailed report and representative battle log | Retain | Human interpretation, limitations and a small observable example |
| Before/after link fixtures and regression failure logs | Retain | Minimal original failure evidence; do not relabel historical failures as new runs |
| battle-trials.jsonl.gz, comparison-trials.json.gz | Exclude from current tree; Git-ignore locally | Every trial fully regenerated and payload-verified; historical originals stay in commit 7415001f |
| battles.csv | Exclude from current tree; Git-ignore locally | Derived duplicate of results.battles; generator and expected hash retained |
| balance-audit/validation.log | Exclude from current tree; Git-ignore locally | Historical verbose output duplicates command results; SHA256 `b283f371561637948255c5d03dd2a7decc06d481df4a748bbd8138f1f31c15fb`; original remains in 7415001f |
| Temporary progress output, scratch logs | Do not commit | Reproducible working material |

Earlier PR #174 audit logs/images and PR #176 map intermediates remain untouched. Historical links in REPORT.md point to the original commit for removed artifacts. No history was rewritten. Retained aggregate JSON was parsed and verified before/after formatting; no audit evidence was discarded for brevity.

## 54,300-battle reproduction

Executed the original `npm run analyze:balance` successfully with Node `v24.19.0`, Python `3.12.14`, baseline `4ad50548f3dd9e5803cb7f2308c8df2e2d3c6f1a`, Mulberry32 seed `20260908`, trial seed `seed+i`, cap 200 turns. No player save, network or browser is used by the simulation.

| Scenario | Trial count | Result |
|---|---:|---|
| 229 baseline cases × 200 | 45,800 | 40,623 victories; 5,177 defeats; 0 capped |
| Level/species: 2 party levels × 2 first enemies × 2 arms × 500 | 4,000 | Included in focused totals |
| Boss/poison: 3 party levels × 3 arms × 500 | 4,500 | Included in focused totals |
| All focused comparisons | 8,500 | 7,265 victories; 720 defeats; 515 capped |
| Total | 54,300 | Trial-level outcomes and aggregate values match originals |

166 moves × 9 representative defenders × 100 = 149,400 one-action samples also regenerated, with identical mechanics JSON. Acquisition, economy and gacha experiments completed.

Before editorial/formatting changes, all 6 generated JSON files, report, CSV and focused gzip were byte-identical. Base gzip differed only in compression encoding: original header XFL=2, new XFL=0. Both decode to **identical bytes**, including every record and ordering; this is not RNG/time/enumeration drift. Payload SHA256: `e96a626f16baa7d7ab9ba7fabf05d057f99f8752dbfae03e5f7232797faa30f7`.

Original results.json byte SHA256: `6ff08f565eba52ef8c6d656f14d04f6bc002b8e1e54ca0edf3f765646f72649d`.
Original comparisons.json byte SHA256: `eb9e9fefb14456c7f7fa2ce954a3f9c3d9f37880760222d82401f2bc9b37eb9f`.
Focused gzip byte SHA256: `728ad41352ab6035d6f4c8bb042fd5a36e350e954f3eb971cc4b7f8c77778799`.

`reproduction-manifest.json` records original byte hashes and current comparison hashes. Parsed JSON hashes allow formatting changes; decoded gzip hashes allow compression differences. REPORT.md changed only historical links/status pointers after reproduction; its revised expected hash is explicitly recorded. `verify-reproduction.mjs --generated` passed all 10 hashes both before/after formatting. The command now ends with hash verification and deterministic aggregate formatting. Exploratory alternate-seed/source runs must use individual commands; they must not silently update the baseline manifest.

These 54,300 battles reproduce the **historical baseline and candidate experiments**. They do not represent 54,300 runs of the fully merged, three-fix current build. Current-source checks below are separate.

## Current-source validation and remaining screen checks

| Requested behavior | Automated evidence | Browser/device status |
|---|---|---|
| Species/difficulty enemy levels; entry HP=maxHP | 64 data records × 4 difficulties = 256 cases; original regression also checks HP formula | Unverified visually; not every species/difficulty pair is naturally obtainable |
| Existing opponent HP/maxHP and request override | Original regression + actual invasion with HP=1 retains original maximum | Unverified visually |
| Display/internal level agreement | Restored production markup builders render A Lv.5 / B Lv.46; expanded card Lv.46 | HTML-string test only, not rendered layout |
| Poison KO -> player credit -> contract target | Actual invasion, poison tick, victory and production candidate panel; slime only, not enemy-killed opponent | Unverified visually |
| Reward/contract no duplication | Repeated victory, reward grant, successful contract and repeated attempt preserve inventory/coins/instances | Unverified visually |
| Link effects follow old opponent only | Real ★2 water ability moves single -> enemy_a; old key cleared; enemy_b unaffected | Unverified visually |
| Remaining duration/expiry | Remaining state deep-equal, ticks 2 -> 1 -> removal without extension | Unverified visually |
| Defeat/retreat/retry | Production handlers and new battle start: no busy lock, live party, cleared multi state | Unverified visually |
| Victory and new session persistence | Existing battle/save migration tests pass | Mid/post-battle reload and actual save UI unverified |
| 320/360/390/430px clipping and controls | Existing static UI tests pass | PR #175 visual viewport checks unverified |

Browser skill initialization succeeded. Navigation to the local candidate `http://127.0.0.1:8175/` failed with `net::ERR_BLOCKED_BY_CLIENT`. No supported Android/Chromebook session is available. Do not treat inherited test output mentioning prior approved Android evidence as this PR's device evidence. Do not inject fixtures into the production user's save.

## Quality gates

From current package.json: **90 check groups + 2 postcheck groups = 92 groups / 106 leaf commands**, all executed successfully by `npm run check`. 93 check:* scripts are defined; the extra `check:world-map-economy` ran separately (1 leaf command, 20 wins per rule set). All original main commands are retained, including first-play clarity, world-map geography, postcheck, and both original balance regressions. Four commands now compose check:balance-audit: two original regressions, integration regression, retained-hash verification. Full simulation is separate from these counts.

`git diff --check`, staged conflict-marker scan, zero-byte/large/duplicate-file scan and final changed-file review are recorded in the PR body with current tree statistics. PR-head CI must be independently observed after push; old green runs cannot approve a new head.

## To complete the release

1. Obtain an executable preview of the exact PR head. The production URL above is not suitable for testing these changes. No externally accessible candidate preview was verified in this environment.
2. In a separate local checkout: `git switch audit/system-balance-20260908`, `npm run dev`; open the printed development URL on the test device using an accessible development host. Keep production saves isolated.
3. Verify ordinary -> invasion/three-way levels and HP; poison KO contract only once; link target and 2-turn expiry; victory/defeat/retreat/retry; mid/post-battle reload; narrow-width controls. Record device/browser/head SHA and outcomes.
4. Only after all required checks: Ready, review, protected merge, observe new main CI/Pages, verify production HTML and changed JS bytes/identifiers, branch deletion/open PR counts.
5. After publication, sync GitHub progress documents and the six specified Google Drive masters, preserving historical and unimplemented proposals. No Drive publication-status updates are made while this PR remains Draft.
