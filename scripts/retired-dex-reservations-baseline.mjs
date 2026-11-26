// Retiring implemented display reservations is separately covered by test-character-dex.
export const retiredReservations=source=>source
 .replace(/const CHARACTER_DEX_RESERVED_SLOTS = Object.freeze\(\[[\s\S]*?\n\]\);/,'const CHARACTER_DEX_RESERVED_SLOTS = Object.freeze([]);')
 .replace('// Prologue character encyclopedia reservations; these are not battle units in M.\n// Source: 序章ガチャキャラクター制作状況 (2026-08-30). See docs/prologue-character-dex-slots.md.','// Future character encyclopedia reservations; these are not battle units in M.\n// All 36 former reservations are implemented in M. History: docs/prologue-character-dex-slots.md.');
