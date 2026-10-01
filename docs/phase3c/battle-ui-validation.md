# Phase3C battle UI — 2026-09-27

Base: remote `feat/phase3b-multi-battle` at `04858ff868459896412fb577c39e97e3a7454d72`.
Working branch: `feat/phase3c-battle-ui`. No main merge or main-site deployment.

## Scope

Connect existing skills, link, items and switch handlers to readable navy/gold panels. Use normal document flow, visible back buttons, focus restoration and lifecycle cleanup. Display target/effect/availability, preserve A/B identity and media nodes, provide all-state disclosure and identify actual source/target in history. Correct only action-cost/help text proven inconsistent with existing code. Save schema, IDs, RNG, combat calculations and impact timing remain unchanged.

Skills execute directly in single battle; multi battle retains the existing target choice. Self-support still uses that existing multi choice but explicitly says the effect is on self. COST describes equipment cost, not a new consumable. Items and links retain no-action consumption; manual switch retains one action. No new area-target or ally-selection rule is introduced.

## Verification

- `npm run check`: PASS, including all existing checks; no deleted checks or relaxed assertions. Existing cache-version strings retained with Phase3C suffix.
- `NODE_PATH=/tmp/phase3c-dom/node_modules node scripts/test-battle-stage-dom.mjs`: PASS.
- `NODE_PATH=/tmp/phase3c-dom/node_modules node scripts/test-battle-stage-multi-dom.mjs`: PASS.
- `NODE_PATH=/tmp/phase3c-dom/node_modules node scripts/test-battle-ui-dom.mjs`: PASS. jsdom is optional test tooling outside the repository; install jsdom separately and set NODE_PATH when reproducing.
- Phase3C DOM coverage: open/cancel preserves HP/inventory/turn/party/link and makes no RNG calls; item denial and hurt recovery +50/one quantity; stale second submission; save/load; empty and synthetic long/many options; status disclosure and stable media; link once; A/B target/cancel/invalidation; actual multi turn and manual switch once; end/next cleanup.
- Cloud Chromium: actual game scripts/rendering in isolated review Site. 40 panel cases: 5 iframe viewports (390x844, 360x740, 320x568, 844x390, 740x360) × root font 16/32px × skills/link/switch/items. No horizontal overflow or clipped button contents; minimum button size >=48px. Vertical page scrolling used. 10 multi-target cases additionally checked. Adjacent panel controls use >=8px gaps.
- Real UI operations: same-species slime B hit and B-specific history; link to Elixion without enemy response; manual switch to Aquaron and one enemy response; item denial at full HP/zero quantity; help dismiss/return.
- Separate journey route: actual title → home → party/save → map/grassland/Easy → exploration battle; received damage; potion recovered 198→228 and count3→2; reloaded title and entered next exploration with saved party/count2. This is save reload, not mid-battle snapshot resumption. Journey starts from a seeded isolated save, not a fresh first-time onboarding completion.

## Isolation and limitations

Normal review fixtures replace localStorage with an in-memory store before loading game scripts. Journey uses a sessionStorage-backed `phase3c-qa:` namespace and never accesses production localStorage. The ordinary fixture initializes battle midway and is distinct from the journey route.

200% means HTML root font 16→32px in Chromium, not Android OS font settings or browser page zoom. Android/Chromebook hardware, screen reader and OS text scaling remain unverified. This work does not claim new physical-device evidence, even if existing repository diagnostics mention previously approved Android evidence. Synthetic many/long choices are DOM stress fixtures, not changes to legal loadouts. No existing area-target skill was found/added; self-support and existing link targets remain authoritative.

Phase4A screen-side blocker: none found in verified paths. Static media element preservation is retained; video acceptance/performance/lifecycle verification remains Phase4A work.
