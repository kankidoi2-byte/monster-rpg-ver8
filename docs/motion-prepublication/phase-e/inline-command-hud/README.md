# Inline skill selection and compact HP plates — 2026-10-01

Supersedes the skill-sheet overlay. Owner requested preservation of visible monster artwork and beginner-friendly targeting.

- Skills replace only the ordinary command pad, in two columns (three equipped skills, plus tutorial basic attack when applicable). Shared minimum command-region height: 184 CSS px.
- Skill names, type and power/support remain in the buttons. Detailed effects, targeting and non-consumed equipment COST remain under Ability/display settings → Skill details.
- Multi-enemy targeting replaces the pad with Back and a brief instruction. Enemy artwork slots and HP plates are separate keyboard/touch targets routed through the existing validated battle handler. Defeated targets cannot be selected. No combat/save/RNG code changed.
- Name and current/max HP share a row, with a five-pixel HP bar. Status summary is a short single row; explicit disclosure retains complete original labels. Full names remain in titles and Ability/display settings.
- Accepted registry scales and far-plane factor (.85) unchanged. No-overlap body-band calculation unchanged. Opening skill/target choice preserves field size and body-size unit.

Validation: npm run check exit 0; UI DOM test exit 0 (including actual image/HP duplicate tap -> one battle turn); viewport DOM test exit 0 (30,000 full-loop body combinations, CSS specificity, inline position, compact HP, target routes, focus, unchanged field).
These checks use synthetic DOM geometry, not browser pixel rendering. Owner Android visual acceptance is pending.

Main merge and general publication remain forbidden. Only feature branch and existing owner-private review Site may be updated.
