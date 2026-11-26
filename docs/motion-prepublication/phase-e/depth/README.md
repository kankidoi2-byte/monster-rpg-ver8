# Battle foreground/background layout correction — 2026-10-01

Owner rejected the shared-row layout as different from the supplied reference. The desired composition shows two enemies in the distance, the ally prominently in the foreground, floating name/HP plates, and a navy/gold command panel below.

## Change

- Preserve every adopted rarity/body scale and full-loop bounds. The distant plane uses 85% of the foreground unit. Equal enemy tracks retain clear HP/target ownership, including one defeated enemy.
- Use the full battlefield region for artwork instead of subtracting separate HP rows. Enemy feet finish near the middle of the scene; the ally occupies its lower 70%, with its HP plate at lower right. The existing map art spans the field, including sky and ground.
- Hide rank/coins during battle and the duplicated command heading. Item counts remain available in the existing item selector. Move the ordinary enemy detail control into the existing information foldout; target selection stays next to the appropriate enemy.
- Keep the existing five command handlers and save/battle rules. Use pink link, green item and a round blue skill button, with light-blue switch/escape buttons. No new media or decoding load.
- Expanded information, targets, results, landscape short screens and enlarged text may scroll; no screen clipping or inaccessible fixed overlay is introduced.

## Verification

`npm run check`, including postcheck, passed. Eight related DOM checks passed (single/multi stage, idle media/multi/lifecycle/viewport, map-review and catalog). The viewport test passed 30,000 species/size containment cases, DOM retention, detail proxy behavior and foreground prominence. APIs/geometry are mocked; these results do not establish pixel appearance or real decoder performance.

Protected game/save files and the entire 50-species registry prefix are identical to the accepted baseline. Build succeeded for Site source `9707fa88344c333b44260e92a7c6ff8db2495dbb`. Native deployment and phone acceptance are separate evidence; only successful native deployment may be handed off.

The reference comparison is available on the owner-private review Site at `/game/index.html?case=composition` (Elixion versus Goblin and Slime). `/game/index.html?case=journey` retains the normal title/home/hunt route on isolated review saves. No main merge or general publication. Owner visual acceptance remains pending.
