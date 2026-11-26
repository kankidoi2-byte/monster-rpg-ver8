# Phase 3A: normal battle static stage

Base: `60e4e15171ff6fb2f98361e5c37aa2e4f0609b6a`.
Branch: `feat/phase3a-static-battle`. Main/game remain unmerged and unpublished.

## Scope and entry points

Normal 1v1 only. `syncSingleBattleStage` separates stable pVis/eVis action nodes
(facing/media children) from HUD boxes, reorders commands/history, and restores
legacy containers for multi battles. HP-only updates preserve media nodes.
Common vis, battle rules, RNG, saves, and existing impact timing are unchanged.
Existing background-bearing art remains a bordered contain card. The battlefield
uses the existing map image's resolved document URL (CSS-relative URLs otherwise
incorrectly request css/images). No videos or asset registration were added.

## Layout adjustments

Existing ability/experience details need 48px hit areas, so HUDs use natural
height instead of the schematic 64px. Field minimum is 480px, or 610px below
360px; short screens scroll. Enemy HUD is above; ally HUD is right, moving to a
separate lower band below 360px. Map/conditions minimum is 48px. The app header
is in flow. Normal lunge is capped at 8px inside padded slots, with timing intact.
Legacy 66px center-button sizing and generic dock specificity are explicitly
overridden: skill 88px, link/item 64px, switch/escape 48px, grid gaps 8px.

## Validation

`npm run check` (including postcheck) and the optional DOM regression pass.
Historical commits used by git-show tests are available.

```sh
npm install --prefix /tmp/phase3a-dom jsdom
NODE_PATH=/tmp/phase3a-dom/node_modules node scripts/test-battle-stage-dom.mjs
```

Cloud Chromium browser tested actual game scripts in isolated in-memory saves:
390x844, 360x740, 320x568 iframe CSS viewports; no horizontal overflow; HUD/card
separation; all commands/history reachable by scrolling; hit sizes and keyboard
order; HP image-node retention; skill and enemy response; item return/consumption;
switch and enemy response; link; inert busy input; retreat/next; victory result/
next; legacy three-way/invasion transitions; rescue/Stella entry and static art.
Victory uses synthetic enemy HP=0 followed by the real win handler. Tutorial
pointer choreography, all link branches, Android/Chromebook hardware, 200% text,
and landscape are NOT certified. This is browser simulation, not Android.

## Private review and handoff

The user later authorized a separate owner-only preview. Sites project:
`appgprj_6ab633e827b88191a02afee54e11cbc7`. Its source contains isolated review
fixtures and baseline/current copies, never reading production saves. No game
publication or main merge is authorized. It is separate from GitHub Pages.

The persistent `Phase3A-battle-screen-handoff.md` contains final commit, preview
URL, measured sizes, browser logs, and real comparison screenshots. Earlier
unverified structure diagrams are historical, not screenshot evidence.

Stop at Phase 3A. Phase 3B entry: syncSingleBattleStage single/legacy boundary,
setMultiBattleLayout, renderMultiBattleCards/reconcileBattleNode; preserve
individual enemy_a/enemy_b nodes and real targets. Detailed panels are Phase 3C.
