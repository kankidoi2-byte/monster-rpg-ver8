# Feedback thank-you gifts (2026-11-13)

Implementation only. Do not merge game main or update the public game, receiver or administrator without the owner's later permission. The owner approved the preimplementation report including the 10-character condition.

- A successful feedback response may contain `gift`. Valid personal gifts are shown with the existing developer sender/filter and shared acquisition transaction.
- On startup, home and BOX display, POST `/api/gifts/pending` with the existing profile ID/token. The response is `{gifts:[...]}`. An individual gift has id (`pg-` reserved), profileId, feedbackId, type (`auto`/`special`), title, letter, rewards, createdAt and null claimedAt.
- Game validates ownership, bounded fields, real IDs, positive integer quantities and levels, and rejects unsupported reward kinds. It does not accept G-BLESS as a personal gift reward.
- After successful local save, synchronize again and POST `/api/gifts/claimed` with `{profileId,token,ids}` for server-pending IDs already in the local permanent receipt list. Failed acknowledgments are recovered from pending next time. No direct coin grant on network receipt.
- No save field or storage key added. `giftClaimedIds` is permanent; `giftHistory` retains its existing 90-day/200-entry limit. Life Quest receipt handling is unchanged.
- The transient inbox is profile-and-save-object scoped. Late responses for a switched profile/save are discarded. A successful authoritative refresh removes stale entries while keeping concurrently accepted feedback gifts. Restarting offline can temporarily hide unclaimed personal gifts; they remain on the server and reappear after connection. No credentials enter saves or feedback receipts.
- The existing prologue completion gate, Web Lock, save-identity guard, conflict check and one-save rollback protect all personal acquisitions.
- `data/gift-catalog.json` is generated from explicit published game source commit 296ee055a0ed619ee53b268c0b3135caa5969c04. Run `node scripts/export-gift-catalog.mjs <published-source-commit>` only after verifying the chosen source is published. Copy exactly the same catalog to the receiver and administrator. It includes all five allowed reward kinds, distinct unit classifications and non-deprecated skill cards, including synthesis-only cards.

## Validation

`check:feedback` runs actual form/outbox tests, VM tests with real reward registries and transaction logic, and isolated portrait browser tests at 412×780 and 360×640 with mocked endpoints. No live player data or production endpoint is modified. CI uploads portrait evidence.

The local full `npm run check` was attempted but its first browser suite cannot start: the environment has no Chromium executable, and the official browser download returned a truncated archive. Non-browser checks are run independently; current-head GitHub CI is the browser/full-suite authority, not an implied local pass.

## Galaxy manual checks before permission to publish

1. 9 and 10 Japanese characters: send remains allowed; only the short-body hint changes. Check keyboard, counter, button visibility and scrolling.
2. First eligible feedback: 500-coin gift, correct completion text and BOX button. Second same-JST-day feedback has no second automatic gift; next day eligible again.
3. Receive once, reload, then close/reopen the app: coins and receipt persist with no duplicate. Verify tutorial cannot claim before completion.
4. Offline send then reconnect; response loss/retry; offline after local gift claim then reconnect: one feedback, one reward, eventual acknowledgment.
5. Switch profiles during fetch and check special gifts only reach the addressed profile.
6. Special gift letter/excerpt and all five reward types, levels/counts and NEW; existing global gifts and Life Quest remain correct.
7. Recheck title, home, party, hunt, battle start, save and reload, and complete the prologue with fresh data.
