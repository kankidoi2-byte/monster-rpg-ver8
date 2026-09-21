# Mobile artwork audit — 2026-09-21

## Scope and baseline

- Fresh GitHub main: `cae049d7ab5ce6d2494c21572541a2def6345f04`.
- Main CI: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/35505319085 — success.
- Main Pages: https://github.com/kankidoi2-byte/monster-rpg-ver8/actions/runs/35505318668 — success, same SHA.
- Public game: https://kankidoi2-byte.github.io/monster-rpg-ver8/
- Fresh checkout; Node v24.19.0; full git history restored for downgrade tests.
- `npm run check` passed on baseline and corrected source. Initial shallow-checkout failure was missing historical commit d31cfccd, resolved by fetching history; no test bypass.
- HTTP GET and SHA-256 comparisons: all 50 monster images and 19 shared map portraits returned 200 and matched local main. All decoded with Pillow.
- Published index.html, js/data.js, js/dex.js, js/ui.js, js/party.js, js/battle-flow.js, css/style.css, css/ui-redesign.css match baseline. battle-flow was rechecked against git main after the working copy changed during the first scan.
- Actual dated monster references: 48 (9 on 20260919, 39 on 20260920); nemes and nemesia use v2 assets. No assumption that only 39 needed inspection.

## Browser evidence and limits

Cloud Chrome loaded the public title, home and initial prologue dialog. Clicking whole-prologue skip timed out; subsequent tab refresh and new-tab recovery also timed out. This is a browser-control failure, not evidence of a game bug. No further browser completion is claimed.

No supported viewport/device-emulation control was exposed. Widths 320–430px, landscape, touch, visual overlap/blur, all-card rendering, fullscreen dialog interactions and reload behavior have NOT passed browser visual QA. No Android hardware was used. Existing DOM-free tests do not substitute for this evidence.

## Findings and changes

Three map presentation paths still used legacy map.image: world-map location detail, legacy hunt card, tutorial hunt card. They now use mapPortraitImage(map), sharing the same new asset as battle and map encyclopedia. Existing files, saves and rules are retained. Index script query versions are bumped to avoid stale script reuse. A player-facing fix notice is included.

The world-map UI regression exercises all 19 detail renderers with distinct old/new paths and requires the new path. Two isolated test fixtures now supply the shared helper. Full existing checks pass.

## Voltax

1536×1407, ratio about 1.0917. Original artwork inspected: some wing tips already extend beyond the source canvas; this is not UI clipping. The source image has not been edited.

vis() uses object-fit:contain; monster list, party and battle rules also retain contain. Thus the inspected CSS preserves ratio rather than stretching. A square frame would introduce about 8.40% total vertical space (4.20% per side). This is a geometric prediction, not a rendered measurement. Actual appearance in each viewport remains unverified.

Map details and artwork dialog use contain; list thumbnails and battle backgrounds use cover by design. Fullscape checking must target map detail/dialog, not cropped thumbnails or battle backgrounds.

## Required acceptance before merge

- Android portrait/landscape: Voltax in encyclopedia list/detail, party and battle; no added clipping, distortion or text overlap.
- All 50 monster entries and 19 maps: images load, appropriate crops/spacing, readable text.
- Map detail and fullscreen dialog: full source visible, tap opens, close button/back dismisses, rotation remains usable.
- Encounter and contract screens: image/name/buttons readable, no overlap.
- Reload: saved party and discovery persist; images reload; no stuck overlay. Exact transient screen retention only where the game promises it.
- Reproducible browser runs at 320, 360, 390, 430 CSS px and corresponding landscape dimensions remain outstanding.
- Validate the corrected branch on an accessible preview or local checkout before accepting the map fix; public main does not contain it yet.
- Current PR CI success and Android evidence are required. Do not merge based only on static checks. After authorized merge, verify Pages SHA and published changed files.

## Verified asset inventory (file checks only)

| Kind | ID | Name | Asset | Dimensions | HTTP/hash |
|---|---|---|---|---|---|
| monsters | freigal | フレイガル | `images/monsters/freigal_20260919.webp` | 1536×1536 | 200 / match |
| monsters | freiwolf | フレイウルフ | `images/monsters/freiwolf_20260919.webp` | 1536×1536 | 200 / match |
| monsters | aquaron | アクアロン | `images/monsters/aquaron_20260919.webp` | 1536×1536 | 200 / match |
| monsters | highaquaron | ハイアクアロン | `images/monsters/highaquaron_20260919.webp` | 1536×1536 | 200 / match |
| monsters | shenhairon | シェンハイロン | `images/monsters/shenhairon_20260919.webp` | 1536×1536 | 200 / match |
| monsters | tienhairon | ティエンハイロン | `images/monsters/tienhairon_20260919.webp` | 1536×1536 | 200 / match |
| monsters | grassbeat | グラスビート | `images/monsters/grassbeat_20260919.webp` | 1536×1536 | 200 / match |
| monsters | thornbeat | ソーンビート | `images/monsters/thornbeat_20260919.webp` | 1536×1536 | 200 / match |
| monsters | granbeat | グランビート | `images/monsters/granbeat_20260919.webp` | 1536×1536 | 200 / match |
| monsters | rikasheef | リカシーフ | `images/monsters/rikasheef_20260920.webp` | 1536×1536 | 200 / match |
| monsters | seralphia | セラルフィア | `images/monsters/seralphia_20260920.webp` | 1536×1536 | 200 / match |
| monsters | nightmare | ナイトメア | `images/monsters/nightmare_20260920.webp` | 1536×1536 | 200 / match |
| monsters | volteck | ボルテック | `images/monsters/volteck_20260920.webp` | 1536×1536 | 200 / match |
| monsters | spaquinn | スパクイン | `images/monsters/spaquinn_20260920.webp` | 1536×1536 | 200 / match |
| monsters | voltax | ボルタックス | `images/monsters/voltax_20260920.webp` | 1536×1407 | 200 / match |
| monsters | icegolem | アイスゴーレム | `images/monsters/icegolem_20260920.webp` | 1536×1536 | 200 / match |
| monsters | proto_icegolem | ゴーレム | `images/monsters/golem_20260920.webp` | 1536×1536 | 200 / match |
| monsters | nemes | ネメス | `images/monsters/nemes_v2.webp` | 1536×1536 | 200 / match |
| monsters | nemesia | ネメシア | `images/monsters/nemesia_v2.webp` | 1536×1536 | 200 / match |
| monsters | nemesion | ネメシオン | `images/monsters/nemesion_20260920.webp` | 1536×1536 | 200 / match |
| monsters | doom_nemesion | 滅亡の星 ネメシオン | `images/monsters/doom_nemesion_20260920.webp` | 1536×1536 | 200 / match |
| monsters | suiren | 水の精霊スイレン | `images/monsters/suiren_20260920.webp` | 1536×1536 | 200 / match |
| monsters | slime | スライム | `images/monsters/slime_20260920.webp` | 1536×1536 | 200 / match |
| monsters | slime_gold | スライムゴールド | `images/monsters/slime_gold_20260920.webp` | 1536×1536 | 200 / match |
| monsters | goblin | ゴブリン | `images/monsters/goblin_20260920.webp` | 1536×1536 | 200 / match |
| monsters | false_dragon_alfa | 偽竜 code:alfa | `images/monsters/false_dragon_alfa_20260920.webp` | 1536×1536 | 200 / match |
| monsters | false_dragon_beta | アシュレイア | `images/monsters/ashleia_20260920.webp` | 1536×1536 | 200 / match |
| monsters | false_dragon_gamma | モルグラム | `images/monsters/morgram_20260920.webp` | 1536×1536 | 200 / match |
| monsters | volmoog | ボルモーグ | `images/monsters/volmoog_20260920.webp` | 1536×1536 | 200 / match |
| monsters | gran_volmoog | グランボルモーグ | `images/monsters/gran_volmoog_20260920.webp` | 1536×1536 | 200 / match |
| monsters | orcana | オルカーナ | `images/monsters/orcana_20260920.webp` | 1536×1536 | 200 / match |
| monsters | orca_stream | オルカストリーム | `images/monsters/orca_stream_20260920.webp` | 1536×1536 | 200 / match |
| monsters | orca_abyss | オルカアビス | `images/monsters/orca_abyss_20260920.webp` | 1536×1536 | 200 / match |
| monsters | tsubaki | 炎の精霊ツバキ | `images/monsters/tsubaki_20260920.webp` | 1536×1536 | 200 / match |
| monsters | alchemion | 錬核獣アルケミオン | `images/monsters/alchemion_20260920.webp` | 1536×1536 | 200 / match |
| monsters | kimeragna | 混成翼竜キメラグナ | `images/monsters/kimeragna_20260920.webp` | 1536×1536 | 200 / match |
| monsters | sylphin | シルフィン | `images/monsters/sylphin_20260920.webp` | 1536×1536 | 200 / match |
| monsters | zephyray | ゼファーレイ | `images/monsters/zephyray_20260920.webp` | 1536×1536 | 200 / match |
| monsters | tempestray | テンペストレイ | `images/monsters/tempestray_20260920.webp` | 1536×1536 | 200 / match |
| monsters | ignaros | イグナロス | `images/monsters/ignaros_20260920.webp` | 1536×1536 | 200 / match |
| monsters | nocle | ノクル | `images/monsters/nocle_20260920.webp` | 1536×1536 | 200 / match |
| monsters | noclaid | ノクレイド | `images/monsters/noclaid_20260920.webp` | 1536×1536 | 200 / match |
| monsters | noxvelg | ノクスヴェルグ | `images/monsters/noxvelg_20260920.webp` | 1536×1536 | 200 / match |
| monsters | luxseed | ルクシード | `images/monsters/luxseed_20260920.webp` | 1536×1536 | 200 / match |
| monsters | luxiard | ルクシアード | `images/monsters/luxiard_20260920.webp` | 1536×1536 | 200 / match |
| monsters | lux_galdion | ルクスガルディオン | `images/monsters/lux_galdion_20260920.webp` | 1536×1536 | 200 / match |
| monsters | astralepis | アストラレピス | `images/monsters/astralepis_20260920_v3.webp` | 1536×1536 | 200 / match |
| monsters | galdra | ガルドラ | `images/monsters/galdra_20260920.webp` | 1536×1536 | 200 / match |
| monsters | kimeragna_apex | キメラグナ・アペクス | `images/monsters/kimeragna_apex_20260920.webp` | 1536×1536 | 200 / match |
| monsters | elixion | 賢金神竜エリクシオン | `images/monsters/elixion_20260920.webp` | 1536×1536 | 200 / match |
| maps | grassland | 草原 | `images/maps/grassland_battle_v1.webp` | 864×1536 | 200 / match |
| maps | volcano | 火山 | `images/maps/volcano_battle_v1.webp` | 864×1536 | 200 / match |
| maps | lake | 湖 | `images/maps/lake_battle_v1.webp` | 864×1536 | 200 / match |
| maps | seikai_irie | 蒼海の入り江 | `images/maps/seikai_irie_battle_v1.webp` | 864×1536 | 200 / match |
| maps | kaiyu_kaiiki | 回遊海域 | `images/maps/kaiyu_kaiiki_battle_v1.webp` | 864×1536 | 200 / match |
| maps | deep_sea_end | 深き海の果て | `images/maps/deep_sea_end_battle_v1.webp` | 864×1536 | 200 / match |
| maps | snow_mountain | 雪山 | `images/maps/snow_mountain_battle_v1.webp` | 864×1536 | 200 / match |
| maps | forest | 森林 | `images/maps/forest_battle_v1.webp` | 864×1536 | 200 / match |
| maps | light_plain | 光の平原 | `images/maps/light_plain_battle_v1.webp` | 864×1536 | 200 / match |
| maps | starry_plain | 星空の平原 | `images/maps/starry_plain_battle_v1.webp` | 864×1536 | 200 / match |
| maps | highland_ruins | 高原遺跡 | `images/maps/highland_ruins_battle_v1.webp` | 864×1536 | 200 / match |
| maps | arena | 闘技場 | `images/maps/arena_battle_v1.webp` | 864×1536 | 200 / match |
| maps | magic_academy | 魔導学園 | `images/maps/magic_academy_battle_v1.webp` | 864×1536 | 200 / match |
| maps | ruined_village | 廃村跡 | `images/maps/ruined_village_battle_v1.webp` | 864×1536 | 200 / match |
| maps | starsea | 遥かなる星の海 | `images/maps/starsea_battle_v1.webp` | 864×1536 | 200 / match |
| maps | water_secret | 流水の秘境 | `images/maps/water_secret_battle_v1.webp` | 864×1536 | 200 / match |
| maps | world_between | 世界の狭間 | `images/maps/world_between_battle_v1.webp` | 864×1536 | 200 / match |
| maps | kaen_village | 華炎の里 | `images/maps/kaen_village_battle_v1.webp` | 864×1536 | 200 / match |
| maps | golden_land | 黄金郷 | `images/maps/golden_land_battle_v1.webp` | 864×1536 | 200 / match |
