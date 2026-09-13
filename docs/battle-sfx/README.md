# Battle SFX review — 2026-09-13

Base: latest main `282f774d00e240c599f8542843d7f27a65a49cec` (PRs 180/181 included).
Branch: `feat/battle-sfx-20260913`. Do not merge or publish to GitHub Pages without the user's next instruction.

## Plan and implementation

1. Reuse actual-HP feedback (`battleHpResult`) and final outcome renderer, not input buttons or attack startup.
2. Generate four deterministic mono PCM sounds on demand with Web Audio; cache in memory. No gameplay RNG, network audio requests, decoding wait, or gameplay delay.
3. Add persistent mute/volume controls and a direct audition page.
4. Test synthesis bounds, lifecycle/failures, real battle integration, and browser interactions. Android listening remains a manual gate.

## Original sounds / provenance

All four sounds were synthesized specifically for this repository in `js/battle-audio.js`. Source: the formula in `BattleAudio.synthesize`. No third-party recordings, music, samples, paid assets, purchases, or external licenses are involved. This is original project code/audio, governed by the project's own usage terms; no additional attribution obligation from outside material.

| Sound | Design | Duration |
|---|---|---|
| Normal hit | Low decaying impact with brief seeded noise | 115 ms |
| Weak hit | Same impact plus a short 740 Hz resonance; replaces normal hit | 165 ms |
| Heal | C5–E5–G5 soft rising tones | 380 ms |
| Victory | G4–B4–D5–G5 short rising cadence | 680 ms |

At 44.1/48 kHz the largest raw PCM peak is <0.58. Master gain is volume ×0.5, default volume 25%. With at most two simultaneous voices, even maximum volume remains below digital full scale. Actual perceived loudness depends on the device; these measurements do not establish listening comfort.

## Behavior

- Positive real HP loss with attack impact: normal or weakness (`effectiveness > 1`), mutually exclusive. Includes player→enemy, enemy→player, enemy→enemy and additional hits.
- Positive real HP recovery: healing skills, drain, regeneration, support healing and potions via the common HP presentation. Returning from the item menu precedes its HP update.
- No HP change: silent, including full HP recovery, evasion and fully absorbed damage. Poison, recoil and non-impact HP changes are silent.
- Hits within 75 ms coalesce (weakness takes priority over a normal hit). Maximum two simultaneous voices; excess events are dropped, never queued. Simultaneous additional hits may intentionally share one sound. No waits added.
- Final common victory result plays once per battle, including tutorial mock and multi-faction outcomes. Rescue-wave continuation returns before this result. Victory stops earlier short sounds. Re-rendering, changing mute, and foreground return do not replay victory.
- Safe browser-local settings key `mb_battle_audio_v1`, separate from unchanged game save key `mb_v95c`; missing/corrupt values default safely. No player-save schema or migration changes.
- AudioContext creation/resume only follows a trusted pointer/keyboard gesture; unavailable APIs and resume/start failures do not interrupt gameplay. Suspended/hidden events are discarded. Page hide, tab hide, blur and screen transitions stop sources. Foreground audio requires a new gesture; old events are never resumed.

## Review

Independent owner-private game: https://monster-rpg-sfx-review-0913.kanki-doi-2.chatgpt.site
Audition: `/audio-preview.html` (same audio engine and settings as the game).
Home and battle have an **効果音** button. Audition includes four sounds, volume/mute, 10 simultaneous hits, full-HP recovery, and duplicate victory checks. This origin has its own game save; it does not read the production save.

## Verification

- `npm run check`: PASS, including existing game/data/save/UI/rule/RNG tests and new audio tests.
- `npm run check:battle-audio`: PASS. Unsupported AudioContext, rejected resume, blocked storage, corrupt settings, mute/volume persistence, zero healing, overlap limit, victory dedup, suspended event dropping, background navigation, deterministic 44.1/48 kHz PCM bounds.
- Real battle integration: 25 normal/heal/drain/repeat/recoil cases across single/multi and three actor-target directions; continued rescue wave silence and common victory hook; potion screen ordering.
- Cloud Chrome audition: all four report successful AudioBufferSource starts; simultaneous 10-hit button starts 1 sound, 0 recovery starts none, duplicate victory starts 1. Volume 26% and mute survived reload.
- **Not verified by listening:** timbre, subjective comfort, speaker/headphone loudness and Android hardware latency. A successful Web Audio start is not proof of audible output on an actual Android device.
- Android manual: open audition in Chrome, start at 25%, compare all four; check device media volume; change mute/volume and reload; rapid taps; leave browser during battle then return; ensure no old sounds catch up; check actual HP/number synchronization and final victory. Do not treat these as passed before user confirmation.
- Cloud Chrome game smoke: title and home rendered. The tutorial skip interaction then timed out and browser tab refresh also timed out. Party selection, hunt selection, battle start and save/reload **were not completed in the real browser**. VM integration and existing regression tests passed, but do not replace this missing UI smoke or Android verification.
