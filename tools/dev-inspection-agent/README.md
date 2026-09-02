# Development inspection agent

Phase 24 provides a manual, local-input, read-only analysis path. Phase 25 adds a pure automatic-event coordinator that rejects malformed events and suppresses duplicates before an analysis is enqueued. Neither path fetches data, changes files, calls GitHub write APIs, creates branches or PRs, posts Issues, starts workflows, or publishes anything.

## Manual invocation

Prepare a local JSON file containing the already-normalized Phase 13–15 snapshots, then run:

```sh
npm --prefix tools/dev-inspection-agent run analyze:manual -- --input ./snapshot.json --now 2026-09-02T03:00:00Z
```

The input file must be 256 KiB or smaller and use this envelope:

```json
{
  "schema_version": 1,
  "mode": "manual_read_only",
  "repository_snapshot": {},
  "actions_snapshot": {},
  "pages_snapshot": {},
  "source_links": []
}
```

Extra or untrusted fields are not copied to the result. The result contains only the fixed unified status, bounded public signals, a deterministic next-action code, and explicit zero-side-effect flags.

The CLI reads exactly one local input file and writes only the normalized result to standard output. It does not read tokens or environment variables.

## Deduplicated automatic triggers

`coordinateTrigger(event, ledger, { now })` accepts only versioned events for this repository from five fixed sources: pull requests, main pushes, completed CI runs, completed Pages runs, and hourly scheduled checks. It creates a deterministic SHA-256 trigger ID from bounded identifiers; arbitrary titles, bodies, tokens, and other untrusted fields are never copied.

The caller owns the returned ledger. Entries expire after 24 hours and are capped at 100, so a long-running adapter cannot grow state without bound. A repeated event returns `duplicate_trigger`; a changed PR head, a new run attempt, or a new hourly bucket can enqueue once. Invalid data fails closed with `invalid_event`.

This Phase does not install a webhook, scheduler, GitHub App, token, workflow permission, or persistence adapter. Future adapters must supply and safely persist the returned ledger while continuing to obey the Phase 23 execution contract.

## Automatic unpublished reports

Phase 26 composes the Phase 25 coordinator with Phase 24 normalization. `runAutomaticInspection(input, ledger, { now })` creates a fixed-schema, unpublished report only when the event is valid and not already present in the caller-owned ledger.

Reports contain bounded cause candidates, impact, a deterministic recommendation, confidence, sanitized evidence, and an `unpublished` publication state. Arbitrary titles, bodies, diagnostic payloads, credentials, and free text are not copied. A repeated trigger, invalid envelope, or input over 256 KiB produces no report and performs no retry or publication.

The function returns data in memory only. It does not install persistence, Issue creation, messaging, workflow, or network adapters. Phase 27 will consume the safe report separately when creating an unpublished Issue draft.

## Automatic unpublished Issue drafts

Phase 27 composes the Phase 26 report pipeline with `runAutomaticIssueDraft(input, triggerLedger, draftLedger, { now })`. Only the fixed `failed`, `stale`, and `unavailable` states create a deterministic Issue draft. Healthy, processing, publication-waiting, and human-confirmation states do not create Issue noise.

The draft title, body, suggested labels, repository, and links are assembled only from fixed codes and already-sanitized Phase 26 evidence. Arbitrary input text and credentials are never copied. A second caller-owned 24-hour, 100-entry ledger suppresses duplicate drafts even when the trigger ledger is unavailable.

Every result remains in memory with `publication.state: unpublished` and `requires_fresh_confirmation: true`. This Phase does not call the Phase 21 writer, post an Issue, read a token, add permissions, persist a ledger, or perform any network or filesystem write.

## Isolated remediation environments

Phase 28 prepares a deterministic remediation environment manifest with `prepareIsolatedRemediation(request, { now })`. It accepts only a valid unpublished Phase 27 draft, an immutable `main` SHA, and at most 20 bounded text-file metadata records. Governance files, workflows, Git internals, credentials, save/data sources, and image assets fail closed.

The prepared workspace is an empty in-memory overlay. It identifies the exact read-only source snapshot, the only paths a future proposal may change, and a fixed allowlisted test plan. The session expires after one hour, permits one attempt, retains no patch content, and is discarded rather than persisted.

This Phase does not materialize files, run generated code, access environment variables, create Git branches or Pull Requests, call GitHub, or modify the repository. Phase 29 may consume the manifest to produce an unpublished minimal patch proposal inside the declared overlay.

## Unpublished minimal patch proposals

Phase 29 consumes an unexpired Phase 28 manifest with `generateMinimalPatchProposal(request, { now })`. It verifies every supplied source body against the immutable Git blob SHA and byte size, then permits at most three files, five exact-once text replacements, 8 KiB per replacement fragment, and 120 changed lines.

Proposals fail closed if a path is outside the Phase 28 allowlist, source content does not match its blob, a replacement is ambiguous, a secret pattern or protected save/starter literal is touched, or the bounded isolated test plan is incomplete or failed. Test evidence is bound to the environment, base SHA, and resulting blob SHAs; raw logs are not retained.

The result remains an unpublished in-memory proposal. It creates no file, branch, commit, Pull Request, Issue, workflow action, message, or network request. Phase 30 must obtain fresh confirmation before materializing an approved proposal as a branch and Pull Request.

## Branch and Pull Request approval core

Phase 30 begins with `preparePatchPublication(proposal, repositorySnapshot, { now })`. The pure function revalidates the Phase 29 proposal, requires its isolated environment to remain unexpired, compares the immutable proposal base with a fresh `main` SHA, and rejects an existing open Pull Request carrying the same proposal marker.

When those checks pass, it fixes the exact branch name, commit message, Pull Request title/body, and proposal/base identifiers behind a SHA-256 plan fingerprint. Confirmation must match the proposal-specific text exactly within five minutes and is valid once; it never authorizes a merge.

This checkpoint does not contain a GitHub writer, token reader, network adapter, branch/commit/PR creator, or permission configuration. Adding that external-write capability requires separate explicit approval, and each future materialization still requires a fresh confirmation generated by this core.

## Validation

```sh
npm run check:dev-inspection-agent-manual
npm run check:dev-inspection-agent-triggers
npm run check:dev-inspection-agent-reports
npm run check:dev-inspection-agent-issue-drafts
npm run check:dev-inspection-agent-isolation
npm run check:dev-inspection-agent-proposals
npm run check:dev-inspection-agent-publication-approval
```

No player-visible behavior changes in this project, so `js/notices-data.js` is not updated.
