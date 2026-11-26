# Phase E — normal battle journey verification

2026-10-02 JST. Baseline: d717b5191a17b1dc3e3498e0bb7d9d77da94d6a7.

## Result

The accepted battle composition, monster size registry and compact target controls remain unchanged. Normal navigation and result actions passed DOM regression checks. A victory evolution prompt could previously replace the result/contract screen after 300 ms. Queued evolution now opens after Next closes the result; an active tutorial retains priority. An unresolved outcome also blocks delayed evolution entry from other sources.

## Evidence

- `npm run check`: exit 0, including postcheck diagnostics and retained balance reproduction hashes (54,300 battles).
- `NODE_PATH=/tmp/phase-d-dom/node_modules node scripts/test-battle-journey-dom.mjs`: exit 0. Real title/home/party-save/world-map handlers; skill and item cancellation; retreat; actual attack/victory; reward once; contract success/failure and save reload; queued evolution after Next; actual enemy attack/defeat and restart.
- `test-battle-ui-dom.mjs`: exit 0. Item refusal/success/double submission/persistence, status disclosure, link once, switch once, same-species multi-target/cancel/invalidation and actual multi turn.
- `test-battle-viewport-dom.mjs`: exit 0. CSS contracts and 30,000 full-loop geometry combinations.
- `test-world-map-prologue-journey.mjs`: exit 0. 148 steps through prologue and free exploration; battle adapters are stubbed in that test.
- `git diff --check`: passed.

The journey fixture uses an isolated completed tutorial save, fixed RNG and controlled remaining HP to exercise success/failure/defeat deterministically. This is not a browser rendering or real-video test. Tutorial feature guides are marked seen in the fixture to keep the normal free-play route distinct.

## Remaining phone verification

Use the existing owner-private Site `/game/index.html?case=journey&review=journey8`. It uses a QA save, not the main game save. Check ordinary battle → skill/target → result/contract → Next. Check landscape and enlarged text, including long names and status details. Browser chrome, actual pixels, video autoplay/loop clipping and phone touch comfort require real device evidence; DOM geometry checks do not prove these.

No main merge, GitHub Pages publication or access-control change is included. The new notice describes the result/evolution ordering fix only.
