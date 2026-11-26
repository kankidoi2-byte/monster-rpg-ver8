# Actor separation and poster sizing — 2026-10-01

The owner reported Goblin hidden behind Elixion's wing and an oversized Slime in the private reference-composition screen (21:24 JST).

## Cause and correction

The multi-enemy poster's legacy 100% !important dimensions outranked the bounds-fit CSS rule. Static enemies could therefore ignore calculated canvas dimensions even though their registry size was unchanged. The bounds-fit selector now outranks the legacy rules, including when commands are expanded. Poster and video continue to share the same measured canvas dimensions. Slime remains 30%; the whole 50-species registry prefix, including all body scales and full-loop bounds, is byte-identical to the accepted baseline.

The former 52% enemy and 70% ally regions overlapped vertically. The sizing plan now allocates separate complete-body bands beneath the measured enemy HP panels. A shared unit is capped by available height divided by the combined ally and largest enemy body heights. Band padding and a 16px body-to-body gap are reserved. Full-loop bounds include wings and tail. The ally remains in the foreground with its HP at lower right; commands remain below. Absolute sizes can reduce on short screens to preserve separation, while species ratios remain unchanged. The existing 85% far-plane perspective is retained.

## Evidence

Full `npm run check`, including postcheck, passed. Six related single/multi battle, media, lifecycle and viewport DOM checks passed. The extended viewport test passed 30,000 species/viewport numeric containment and body-separation cases. CSS selector matching and standard specificity calculation verify that calculated width/height wins for both posters and videos, in single/multi battle with commands open/closed. DOM/media APIs are mocked; no browser pixels or physical-device playback were tested.

Protected save/game-rule files are unchanged. Diff formatting passed. Native owner-private deployment succeeded for Site source `62fb6420461ff7d7bacb88bd94f3e3f703d49314`, deployment `appgdep_6abe5361759881919fb92e607118ceb8`. Verification page: `/game/index.html?case=composition&review=spacing4`. Galaxy visual acceptance remains pending. No main merge or general publication.
