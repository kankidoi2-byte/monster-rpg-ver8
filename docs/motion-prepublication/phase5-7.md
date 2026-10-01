# Phase5–7 automated checkpoint — 2026-09-27 JST

No gameplay rule changes were necessary for the bounded one-species evaluation. Phase4C alone changes the media ownership boundary. Game data, battle rules, multi-battle, feedback, stage, UI, save code and images remain byte-identical to Phase4B.

## Phase5

`test-motion-impact-dom.mjs`: 5 groups PASS. Real game doAttack handlers and DOM, mocked media. Normal hit, guaranteed repeat, heal, recoil: each HP event immediately agrees with aria HP numeric display, original two media nodes retained. Result/knockout removes owned video; next battle unlocks. Existing `check:skill-impact`: 1015 real-handler outcomes and RNG counts equal historical base (203 moves × 5 directions), 203 contact/cleanup timelines. That historical comparison is not a new Android or main-head result. Current unchanged rules confirmed separately by git diff.

Status: automated criteria passed; visual timing with three real videos and Android pending.

## Phase6

`test-motion-operations-dom.mjs`: actual game/DOM with eligible volmoog actors and mocked playing Media API. Panel cancel consumes no RNG/state; item refusal/success/double submission and save reload; link source used once; same-species targeting/cancel/invalidated target; actual multi turn executes once despite double submission; manual swap uses one action; result/next cleanup. Existing full check covers special link abilities and UID/save compatibility. No special-branch rules rewritten.

Status: automated relevant compatibility passed. Real browser/Android full journey and special-branch touch usability pending.

## Phase7

New multi lifecycle suite (8 groups) includes actual triggerInvasionIfDue: HP80, poison2, paralysis1, guard and attack1.3 retained on enemy A; old single record disposed; 3 distinct videos; no extra turn. KO disposes only affected media, leaves the game entry, defeatedByPlayer and rewardGranted unchanged. Operation suite covers multi-status disclosure and enemy B target actual turn. Existing full check includes 42 multi-faction outcome/RNG comparisons and invasion/contract regressions.

Status: automated boundary checks passed; full visual state/poison/three-way/invasion acceptance remains pending real browser and device.

Browser limitation: internal preview start succeeded, but CUA navigation was rejected by browser security policy. No alternate browser/CDP/network route attempted. No new screenshot, real decode, dropped-frame, layout or actual BFCache result is claimed.
