# Compact target controls — 2026-10-01

Owner requested cleanup after reviewing inline6 on Galaxy Android.

- Exactly one target instruction, above the command area: 攻撃する敵をタップ.
- Target controls are one row: Back to skills, selected skill name (full title retained). Repeated renders do not concatenate instructions into the name.
- Target command minimum height reduces from 184 to 64 CSS pixels. The freed 120 pixels become battlefield presentation space; the original compactHeight reference, registered scale and shared artwork unit are preserved. Enemy top positions stay unchanged; the foreground ally occupies the lower part of the enlarged field. All choices remain below artwork. Back restores ordinary command layout.
- Footer summaries are 設定 and 履歴 N件. The 240-entry retention explanation stays inside the opened history. Existing history limit/behavior unchanged.

Validation: full npm run check exit 0; UI DOM test exit 0; viewport DOM test exit 0, including CSS precedence for target height, one visible back button, skill-only label, repeat-render idempotence, history count and hidden retention text. Existing 30,000 body-fit/no-overlap calculations and guarded actual target actions remain passing.
Browser pixel rendering not verified. Owner Android visual acceptance pending. Main merge/general publication forbidden; feature save and owner-private Site only.
