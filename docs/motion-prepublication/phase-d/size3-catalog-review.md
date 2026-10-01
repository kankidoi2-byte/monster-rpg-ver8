# 50-species size review controls

Date: 2026-10-01
Base game commit: 82669a383e8f269e0eb16a2df4fa0b426d62044f
Site source commit: 9418e2236b9ae44892c76f6009573bb1cbe9639c

The accepted rarity baseline remains unchanged: stars 1–5 use 30%, 50%, 75%, 100%, and 120%. No individual species overrides were added.

All 50 transparent posters were arranged on a common-reference contact sheet and visually inspected. Alpha bounding boxes at threshold 16 were checked against each registered animation-union sourceBounds, including source dimensions; no poster-bound inconsistencies were found. This covers static posters, not every animation frame or phone viewport.

The storage-isolated review page now provides previous/next controls in rarity/dex order, a current index/rarity/percentage label, and a lazily created 50-species poster gallery. Selecting a card opens the same battle mode and map. The gallery uses a common 100px reference and allocates no video decoders. The background selector updates the displayed battle and setup synchronizes selector state.

Validation: the DOM/media-mock test passed a full 50-species cycle, wraparound, previous/next reversal, 50 gallery cards, selection, preserved enemy mode/background, decoder count and cleanup. Existing 19 background binding and 19 mixed-species cases also passed. The Sites framework build passed.

Acceptance limit: the owner accepted the representative grassland orca/slime/elixion layout. Full 50-species real-phone acceptance, all backgrounds/orientations, and enlarged-text visual acceptance remain pending. No full npm check was rerun for this review-UI-only change. Main, game save/rules, media registrations, and per-species scale settings were not changed.
