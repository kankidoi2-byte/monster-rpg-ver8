# Difficulty tier implementation (2026-11-05)

Source: adopted specification in Google Drive document `1rR-CVFLM8GKsGoTloGju-jhekTvmk2JOHMqZkR4vkTU`, modified 2026-11-05T12:58:50.412Z. The original simulation is preserved as `tools/balance-audit/sim-difficulty-tiers-reference.mjs`.

- Central tuning: `HUNT_DIFFICULTIES` and `HUNT_OVERTIER` in `js/state.js`.
- IDs: d1–d5 and unchanged extreme. Old easy/normal/hard map to d1/d2/d4; collision records are unioned, unlocks retained, no save key changes.
- Fixed tutorial battles retain Lv1 and HP/attack 0.85. Story scripts/dialogue are unchanged.
- First enemy only may be stronger/nushi. Secondary attacks and rewards use the selected tier. Departure UI shows no encounter identity or stronger bonus.
- Normal ranges end at60; nushi61–70 uses HP3 / attack1.8 / reward3. Extreme remains100 and never rolls stronger.

## Simulation

Run `node tools/balance-audit/sim-difficulty-tiers.mjs "$PWD"`. This uses production tables and request creation with deterministic level samples, single encounters, no items/conditions, damage policy, 40 samples per map across five maps. This is VM simulation, not device evidence.

Selected results (spec approximate benchmark in parentheses):
- Initial trio Lv1/3/6, I:64/83/100% (70/87/100%).
- Initial trio Lv6/12, II:45/79% (45/82%).
- Evolved two-star trio Lv18/25, III:76/99% (75/99%).
- Evolved two-star trio Lv32, IV:85% (84%).
- Three-star trio Lv46, V:94% (93%).
- Three-star trio Lv60/70/80, nushi:1/48/91% (0/50/91%).
- Mixed three/four-star trio Lv60/70, nushi:38/91% (36/91%).

Differences are reported rather than tuned away: both are finite sampled simulations; production request RNG consumes draws differently from the prototype monkeypatch. No extra balance changes were made to match rounded benchmarks.

## Verification

Dedicated tests cover all tuning values, level bins, rank1/50 incidence, filtering, Extreme exclusion, primary-only multipliers, fixed tutorial values, old save collisions and idempotence. Existing story reward/defense and prologue journey checks retained. Full local `npm run check` cannot launch Chromium in this container (SIGABRT/operation not permitted); full current-head GitHub CI must pass before merging. Android hardware testing is not claimed.
