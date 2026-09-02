# Monster Battle development guide

## Project goals

- This repository is a single-player, mobile-first browser game published with GitHub Pages.
- Keep the game usable on Android and Chromebook.
- Make focused changes and preserve existing player saves.

## Source of truth

- Monster, map, item, fusion, and alchemy data live in `js/data.js`.
- Save initialization and additive migration live in `js/save.js`.
- Monster assets live in `images/monsters/`.
- Item assets live in `images/items/`.
- Map assets live in `images/maps/`.

## Hard compatibility rules

- Never change the save key `mb_v95c`.
- Never rename, reuse, or silently change the meaning of an existing monster ID, item ID, skill ID, map ID, recipe ID, instance UID, or monster encyclopedia number.
- Add new identifiers instead of replacing old identifiers.
- Preserve existing save fields. New fields must have safe defaults and additive migration logic for old saves.
- Do not remove a data record or asset until every reference and old-save compatibility path has been checked.
- Keep the starter IDs `elna_beginner`, `freigal`, `aquaron`, `grassbeat`, and `volteck` compatible.

## Adding data

### Monster

- Add an unused `id` and encyclopedia `no` to `M` in `js/data.js`.
- Add the image path to `IMG`, and confirm the referenced asset exists.
- Check map enemy lists, evolution targets, fusion recipes, drops, skills, and alchemy candidate lists.
- Do not add a monster to old saves automatically unless the feature explicitly requires it.

### Item

- Add the item to `SHOP_ITEMS` or `ITEM_DEX_EXTRA`.
- Add its default quantity to both `initSave().items` and the additive item migration list in `js/save.js`.
- If the item has artwork, add its path to `ITEM_IMG`.
- Define at least one valid acquisition path before treating the item as obtainable.

### Images

- Prefer WebP and ASCII snake_case filenames for new assets.
- Do not overwrite an existing image under the same filename when stale browser caches could matter. Add a new filename and update the reference.
- Default budgets are 600 KiB for monsters, 300 KiB for items, and 700 KiB for maps.
- Existing oversized legacy files are temporarily allowlisted by `scripts/check-image-sizes.mjs`; do not enlarge them or add new exceptions without explaining why.

## Required checks

- Run `npm run check` after changing JavaScript, game data, or image assets.
- Fix all validation failures before proposing a merge.
- For gameplay changes, smoke-test title screen, home, party selection, hunt selection, battle start, affected feature, save, and reload.
- Report the files changed, checks run, and anything that still needs manual Android or Chromebook verification.

## Player-facing notices

- Player-facing notices live in `js/notices-data.js` and must remain newest first.
- Every feature, balance change, content addition, player-visible performance improvement, or bug fix must add or update a concise notice in the same branch.
- Do not announce refactors, test-only changes, future unused assets, documentation-only work, or other changes players cannot observe.
- Use a new stable notice `id`; never rename or reuse a published notice ID.
- Write the title and body for players rather than copying commit messages or implementation details.
- Run `npm run check:notices` as part of `npm run check`. If no notice is needed, state why in the pull request.

## Git workflow

- Work on a feature branch. Do not write directly to `main`.
- Keep unrelated changes out of the branch.
- Show the diff and validation result before merging or asking for approval.
- Apply the risk-based approval contract in `tools/game-production-orchestrator/risk-approval-contract.json`.
- Low-risk work may create a branch, commit, push, open/update a pull request, repair safe CI failures, and merge after every declared test and required CI check succeeds, the head is based on current `main`, and no stop condition applies.
- Require explicit user approval for save or migration impact, changes to the meaning of existing IDs or encyclopedia numbers, destructive changes, major game-rule or story-setting decisions, external Issue/message posts, secrets or permission changes, paid actions, publication-setting changes, required Android/Chromebook verification, unresolved conflicts, failed or unobserved CI, and materially ambiguous specifications.
- GitHub Issues are optional. Do not post an Issue without explicit approval; use the repository backlog and pull requests for normal work tracking.

## Code Review Rules

### Save compatibility

- Flag changes that rename or reuse persistent IDs, change `mb_v95c`, remove existing save fields, or add fields without safe old-save defaults. The safe path is an additive ID and migration.

### Broken game-data references

- Flag monster, item, map, evolution, fusion, drop, skill, image, or alchemy references that do not resolve to an existing record or file. The safe path is to update all related registries and pass `npm run check`.

### Mobile asset growth

- Flag new oversized images, enlargement of allowlisted legacy images, or avoidable replacement of WebP with heavier formats. The safe path is compression within the repository budgets.
