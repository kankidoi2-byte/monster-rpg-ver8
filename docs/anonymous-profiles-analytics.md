# Anonymous profiles and private play-record dashboard

Implementation branch: `feat/anonymous-profiles-analytics`, based on main `6327d05bc4a19f8d983aa1db615615cbe5bbafc8`.

## Player profiles

- Two device-local profiles with independent names, random UUIDs and independent saves/backups/quarantined corrupt data.
- Slot 1 retains `mb_v95c` unchanged. Slot 2 uses additive `mb_v95c_profile2` storage keys. Save schema and existing IDs are unchanged.
- No password, email or external identity for players. The internal random profile token authorizes event uploads only; it is never used to download other players' data.
- Account switching, names and reporting settings are inside Menu → Save management. Home retains its original layout.
- Switches save first and reload. Active battles/operations block switches. Each tab retains its selected slot, and stale same-profile writes are stopped.
- Save import/export and reset operate only on the selected slot. Browser data deletion loses the local profiles and saves. Cloud save or cross-device transfer is not part of this change; export each slot separately.
- Invalid profile metadata or inaccessible storage stops saving instead of replacing player data.

## Reporting with an off switch

Reporting is disabled initially. The profile panel explains uploads and provides an ON/OFF switch. Existing OFF preferences are preserved. Reported fields are profile ID/name, session IDs, approximate active seconds, current tutorial progress, current rank/owned-count/wins, screens used and battle outcomes with equipped party/skills. Raw saves, email and administrator credentials are never sent. Names are rendered as text.

Retries use persistent temporary queues (100 events per profile) and immutable event UUIDs; server inserts deduplicate retries. Network failure does not block gameplay. Disabling reporting clears pending events. Already accepted records are retained. Enabling reporting starts recording from then onward; previous play cannot be reconstructed.

## Separate sites

- Private administrator dashboard: https://monster-battle-admin.kanki-doi-2.chatgpt.site
- Public receive-only service: https://monster-battle-records.kanki-doi-2.chatgpt.site

No game navigation links to the administrator dashboard. The dashboard is owner-private at the platform boundary, and additionally requires the configured owner's authenticated email at every page/API route. The receive service exposes no anonymous record-reading route. Summary reads and test-flag writes require a server-held secret shared only with the private dashboard. Secrets are configured in Sites runtime settings and are absent from GitHub and browser code.

The receiver uses D1, validates bounded allowlisted event fields, rejects other origins and invalid tokens, hashes profile tokens and pseudonymous daily registration-rate keys, caps uploads, and prunes old events in bounded batches. Summary supports 1/7/30/90 days; active counts are profiles rather than human identities. Test designation is made only in the private dashboard and is excluded by default. All recorded gameplay is client-reported, not authoritative anti-cheat data.

## Validation and publication gate

- `npm run check:anonymous-profiles`: legacy key preservation, slot separation, reload, stale writes, busy-switch guard, corrupted metadata, unavailable storage, opt-in/out, and equipped-skill payload checks.
- `npm run check`: all repository checks including save migration, tutorial progression and battle/UI tests passed locally.
- Receiver validation and actual SQLite route tests: origin/token authorization, protected reads, retry deduplication, summary counts and test exclusions passed. Both Sites production builds passed and published successfully.
- Android manual verification and current-head CI must complete before merging the game PR. Do not merge merely because the two services are published.

Manual acceptance: preserve an existing save in slot 1; switch to a fresh slot 2 and play the opening; switch back and verify monsters/coins/progress; reload each; export/import/reset only the test slot; opt in on a test profile and confirm records in the private dashboard; designate it as test and confirm normal totals exclude it. Check title, home, party selection, hunt and battle, including 200% text and landscape if available.
