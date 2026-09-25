# Phase 3A: normal battle static stage

Base: `60e4e15171ff6fb2f98361e5c37aa2e4f0609b6a`.
Branch: `feat/phase3a-static-battle`. Not merged or published.

## Scope

Normal 1v1 only. `syncSingleBattleStage` separates stable pVis/eVis action
nodes (facing/media children) from HUD boxes, reorders commands/history, and
restores the legacy containers for multi battles. Setup and entry changes may
replace illustrations; HP-only updates preserve them. Common `vis` is unchanged.
No videos, new assets, game rules, random draws or save fields are introduced.
`battleItemBadge` is retained, hidden, instead of being removed during render.

The map is drawn once on the battlefield; background-bearing art remains a
bordered contain card labelled static illustration. Actual targets come from
existing skill-motion target IDs. HP result summaries use a separate strip.

## Adjustments and pending acceptance

- Existing 48px ability/experience details require larger HUDs than the 64px
  schematic. Use flow grid, min field 480px (610px below 360px), and page scroll.
- Enemy HUD uses 60% width; below 360px it uses the whole upper band; ally HUD
  uses a dedicated lower band. Normal 1v1 has no need for two enemy HUD columns.
- Map/conditions minimum is 48px, not 28px; command area has content-based height.
- Normal-battle app header is in document flow; lunge is capped at 8px within
  padded slots. Impact timing and legacy multi lunge remain unchanged.
- Full browser geometry, focus navigation, 200% type, landscape, actual tapping
  and screenshots remain unverified. Do NOT treat CSS declarations as results.
- Localhost was rejected by the available cloud browser. File navigation was
  also explicitly disallowed. No public preview or alternate browser workaround.

## Validation / resume

`npm run check` passed, including its postcheck. Historical commits needed by
existing `git show` tests are present. New DOM regression requires optional
jsdom outside the project dependency tree:

```sh
npm install --prefix /tmp/phase3a-dom jsdom
NODE_PATH=/tmp/phase3a-dom/node_modules node scripts/test-battle-stage-dom.mjs
npm run dev -- --host 127.0.0.1 --port 4173
```

The DOM test uses fresh in-memory storage and actual scripts in index order.
It checks nodes/IDs, command entrypoints, inert state, item return, replacement,
results/next, multi transitions, image failure, rescue and Stella battle entry.
It does NOT implement a renderer or prove browser layout/Android behavior.

First finish Phase 3A browser acceptance at 390x844, 360x740, 320x568 in an
approved local browser, capture before/after on identical synthetic fixtures,
and check geometry, focus and busy double input. Then Phase 3B can adapt the
legacy multi path; do not automatically proceed to 3B or merge/publish.
