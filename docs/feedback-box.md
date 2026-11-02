# Feedback box (adopted 2026-11-02)

Implementation branch `feat/feedback-box-20261102`, based on source main `ee33eeb5385c38af2fcc95ea83bb2a4fd624d513`. No production publication or main merge is authorized.

## Changes

Menu → 意見箱 below お知らせ, with a first-open NEW marker. The new settings-themed screen follows the adopted Drive prototype. Wire kinds are bug/idea/praise. Screen selection remembers the last substantive screen before the menu. Body length uses the prototype's JavaScript counter (2–1000 UTF-16 units). Metadata uses current profile/name, the displayed feature version, analytics model hint and tutorial progress only; no raw save.

`mb_feedback_v1_<profile UUID>` stores up to 20 receipts and 20 pending messages separately from `mb_v95c`; `mb_feedback_seen_v1` records first open. Queue writes precede requests. UUIDs survive response loss/restart; credentials are not stored in queue payloads or receipts. The existing token is added at transmission. Requests time out and retry at startup/open/online without blocking gameplay. Web Locks serialize supported same-profile tabs; the server enforces quotas regardless.

Japanese calendar day limits include local reservations and server-confirmed quota. A 429 retains the queued UUID until the next Japanese day. Offline deliveries count on server receipt day. Permanent validation/auth/origin rejections show an error, keep the current draft and do not falsely report delivery. Failed local storage never reports an unsaved reservation as accepted.

Bodies use textContent and textarea value; the administrator uses React text children. Save schema and analytics production payload are unchanged. Analytics exposes a read-only copy of the existing device hint.

## Validation and limitations

`npm run check:feedback` covers actual form handlers, validation/cap, stored outbox, reload/stable UUID, profile separation, XSS text, storage failure and 429/permanent responses. The required `npm run check` also runs; historical test fixtures require Git history beyond a shallow clone.

Receiver tests run actual routes against SQLite: origins, tokens, fields, concurrent quota, UUID dedup, protected reads/status, test exclusion, Japanese dates and pagination. Administrator tests cover six filters/toggles, actual rendered JSX with hostile body/profile/metadata, owner and same-origin proxy checks. Both Sites build/typecheck independently.

Supported Sites preview was attempted; cloud browser returned ERR_CONNECTION_REFUSED. Android/Chromebook visual checks and production round-trip verification remain pending.

## Publication after approval only

Receiver and additive D1 migration 0004_feedback first, then private administrator, then game PR and separate pactforge-studio deployment PR. Keep existing Site IDs, audiences, storage bindings and secrets. Verify public delivery/retry/status/filtering with a test-designated profile and recheck normal analytics and saves. No production runtime or database update is authorized in this step.

## Acceptance results (2026-11-02, unpublished)

Full `npm run check` completed with exit 0 after fetching the required historical Git fixtures. The final expanded feedback tests also passed independently. Both Sites typechecks/builds passed, and receiver legacy analytics tests passed.

An in-process integration executed the real game form/outbox, real receiver routes with SQLite and real administrator JSX. It covered offline reservation, loss of the success response after server insertion, the next retry yielding one stored row, metadata display, escaped body text, status updates and unchanged game save. It did not exercise a physical network, browser layout or production.

| # | Adopted acceptance item | Result |
| --- | --- | --- |
| 1 | Menu placement and settings theme | Placement/theme contract passed; visual browser/device review pending. |
| 2 | Required kind/body, length and daily caps | Game and real receiver tests passed; empty-profile concurrency accepts exactly five. |
| 3 | Delivery and administrator metadata | Local integration passed for kind/screen/version/device/progress/profile; production round trip pending. |
| 4 | Offline retry with no duplicates | Local integration passed, including response loss after database commit and retry with unchanged UUID. |
| 5 | Read/done toggles and six filters | Model, actual JSX and protected route tests passed; browser click-through pending. |
| 6 | No public reading and literal text | Anonymous reads rejected; game text APIs and rendered administrator JSX preserve hostile script text. |
| 7 | Existing analytics and save | Legacy receiver tests and complete game check passed; save code/schema unchanged, integration save byte comparison unchanged. |

Saved source branches: game `feat/feedback-box-20261102`; receiver same branch at `9f9939462dd4bb93a19cb9479017354411182abd`; administrator same branch at `ff079be8a19257a54d64da78bcfbb62f3f8e7797`. Receiver production remains version 7 and administrator version 6. No Site deployment, production D1 migration, source main merge or public-game update was performed. GitHub PR creation was blocked by automatic approval review because explicit permission to post the PR was not present; source branch remains available for review.
