# Floating battle skill and target choices — 2026-10-01

At 21:49 JST the owner confirmed the combatants no longer overlap, asked why star1 appears small, and supplied a 16.67-second screen recording showing scrolling into the long skill/target panels.

Star1 registry multipliers remain adopted values: Slime 30%, Goblin/Freigal 40%, with other overrides unchanged. The separated full-body bands can shrink the common unit; the far-plane factor is still 85%. No species rebalance was authorized or introduced in this correction.

Skill and target panels now open as viewport-anchored sheets instead of lengthening the page. Skill cards use two columns with name, attribute, power and COST. Existing effect/target descriptions and the COST explanation move into an accessible foldout. Existing choice handlers, immediate execution, self-target support and multi-enemy target identity are retained. Target selection uses the sheet's real buttons; duplicate HUD target controls/cues are hidden while that sheet is shown. Link panels use the same anchored container.

While a chooser is open, the field height and common unit stay unchanged. On viewport/orientation changes, the resting command-space budget is reused. Focus uses preventScroll and skips scrollIntoView inside a floating panel. Back/Escape and busy recovery retain existing navigation. Sheets have bounded viewport height; long expanded descriptions and enlarged text can scroll within the panel without requiring page navigation.

Full npm run check including postcheck passed. DOM checks cover field/unit retention, focus without panel scrollIntoView, description access, back/target selection, stable media, busy, item/switch/retreat/next and existing 30,000 body-separation cases. The UI harness initially reported unsupported jsdom media pause/load APIs; it now uses the same no-op mocks as other DOM fixtures. These are mocked checks, not pixel layout or physical decoding.

Native owner-private deployment succeeded for source 39315a1bc9dff3c9635da8d2f19255a3e39c3c75, deployment appgdep_6abe59570bac819190f1576b470eb422. Review at /game/index.html?case=composition&review=sheet5. New Galaxy panel acceptance remains pending. No main merge or general publication.
