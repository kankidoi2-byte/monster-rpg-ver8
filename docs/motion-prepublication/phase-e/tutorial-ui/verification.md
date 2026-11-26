# Phase E — tutorial alignment with accepted battle UI

2026-10-02 JST. Baseline: 59488fe8d630d658a271f96ba21d60d1825793a4.

## Changes

- Explain near/far combatants, compact name/HP row and expandable status details.
- Point the rescue target-confirmation step at the real enemy visual (`#eVis`); point rescue and Stella free-battle guidance at the existing `.battle-command-pad`, replacing the nonexistent Stella `#battleCommandPad` target.
- Explain the inline skill chooser and its actual details label: 技の効果・対象・装備コスト.
- Explain enemy image/HP targeting, return to skill choice, and evolution after result Next.
- Fix a discovered shared-panel defect: the compact attack-target renderer previously hid switch candidates too. The one-row renderer, short back label and arena space transfer now apply only while an actual multi-enemy move target is pending. Switch/link picker buttons and instructions remain visible.
- Keep tutorial step IDs, resume checkpoint, save schema, monsters, sizes, combat rules and story dialogue unchanged. Add a player notice and runtime cache keys.

## Validation

- `npm run check`: exit 0 including postcheck diagnostics.
- `test-battle-tutorial-dom.mjs` with jsdom: real rescue checkpoint, highlighted real DOM elements, successful switch, COST 0 attack, equipped skill, event-blocking progression, persisted checkpoint; multi-target/evolution guide wording. Not a browser layout check.
- `test-world-map-prologue-journey.mjs`: 148-step full prologue route and free exploration; this test replaces combat/painting with adapters.
- `test-battle-ui-dom.mjs`: passed, actual combat/controls/state/persistence regression.
- `test-battle-viewport-dom.mjs`: passed, including 30,000 geometry combinations and actual CSS cascade for the accepted target layout.
- Site QA storage/fixture JavaScript syntax and diff whitespace checks passed.

## Phone review

Existing owner-private Site: `/game/index.html?case=tutorial&review=tutorial9` starts from the title with the real first-play tutorial. QA storage uses a separate session prefix from the journey review and never reads/writes the main save. Reload resumes this QA tutorial; closing its browser session ends that test save.

Check highlighted enemy image, switch candidates, lower skill controls, and text legibility on Galaxy portrait/landscape/enlarged text. Actual spotlight pixel alignment and touch comfort remain unverified by automation. No main merge or GitHub Pages publication.
