# Phase 3B checkpoint

Base: remote feat/phase3a-static-battle at afe2ed24aea646285775362fe775daa40216c241.
main at start: 60e4e15171ff6fb2f98361e5c37aa2e4f0609b6a.
Branch: feat/phase3b-multi-battle. No merge or publication of the game authorized.
User explicitly authorizes continuing the unmerged Phase3A branch, overriding the repository's default prohibition on that starting point.
Read: Phase3A v1, Phase2 v2, Phase0 v2 battle paths, Phase1 v12 final summary; reference image inspected.
Private review site confirmed owner-only (one owner, zero groups/external visitors), version 1 preserved.

## Implementation

- Normal, invasion and three-way battles share the Phase3A stage. Enemy A/B HUDs, media and command controls are separate. A WeakMap lifetime key includes the battle generation and slot; HP/status reconciliation does not rebuild the media subtree.
- Resolved source/target visual IDs from the existing skill renderer drive A/B-qualified action labels and text/border markers. Target resolution, battle formulas, RNG, saves and IDs are unchanged.
- Busy/result locking, defeat, invasion, normal/multi transitions and the next battle remove stale markers/cards. Controls retain focus during HUD refresh and unlock after a busy update.
- Portrait HUDs use full-width flow below the ally; landscape uses battlefield/command columns. Names and text wrap, and content scrolls vertically. Images use contain; no transparency assumption or new artwork.
- Commands retain link / central skill / item, then switch / escape and bottom history.

## Verification (2026-09-27 JST)

`npm run check` passed on the final implementation. The pre-existing aggregate test mentions approved Android evidence; that is historical evidence, NOT a Phase3B device test.

Additional real-DOM tests (jsdom installed outside this repository):

```sh
npm install --prefix /tmp/phase3b-dom jsdom
NODE_PATH=/tmp/phase3b-dom/node_modules node scripts/test-battle-stage-dom.mjs
NODE_PATH=/tmp/phase3b-dom/node_modules node scripts/test-battle-stage-multi-dom.mjs
```

Both passed. The new test executes the real scripts/HTML and `performMultiAttack` for identical enemies; checks actor/target/impact HP isolation, stable image identity, focus, knockout, busy unlock, item return, switch, retreat/victory/next, invasion, per-battle generation and image fallback. These are DOM/state tests, not browser layout tests.

Cloud Chromium reviewed real game rendering in isolated test storage: normal and same-species multi battle at 390×844, 360×740, 320×568, 844×390, 740×360, each at root font 16px and 32px (20 combinations). No document horizontal overflow or HUD/media overlap; five primary command buttons at least 48px in both dimensions, gap 8px. Font enlargement was a separate explicit root-font control, not viewport resizing. Small screens and 200% font intentionally scroll vertically.

Browser interaction also confirmed enemy A attacking B (only B lost HP), real skill/target selection, support skill self-target, link, item entry/full-HP rejection/return, manual switch with enemy response, escape and next screen. Browser save fixtures are memory-only and never use the game's production save. Android and Chromebook physical devices, OS font enlargement, TalkBack and physical touch remain unverified.

## Scope and next phase

The Phase2 narrow-layout fallback is used for all portrait ally HUDs for robust enlarged text; this changes the previous 390px side HUD. All statuses remain readable rather than implementing the optional compact two-status/others treatment. Selection now uses an explicit target button as well as the existing picker; tapping the artwork is not required. This avoids a clickable card containing a nested details control.

Phase3C still owns the full skill/item/link/switch subpanel redesign, compact status treatment and visual polish. Existing tutorial/help copy claims switch uses one action while the existing manual-switch implementation can behave differently; not changed here. No motion videos, mass asset processing, game rule changes, main merge or game publication.

Private review: https://monster-phase3a-review.kanki-doi-2.chatgpt.site (historical URL retained). Phase3A comparison is preserved in /phase3a/, original baseline in /baseline/, current code in /game/. Use the owner-only review controls for same-species, invasion, enemy-to-enemy attack, 5 viewports and explicit font scaling.

The complete Japanese handoff and screenshots are saved as Phase3B-battle-screen-handoff.md and phase3b-*.jpg alongside the validation logs. Restart from the remote feat/phase3b-multi-battle branch, verify its tree against the handoff, and do not start from main alone.
