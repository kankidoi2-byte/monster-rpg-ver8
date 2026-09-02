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

## Validation

```sh
npm run check:dev-inspection-agent-manual
npm run check:dev-inspection-agent-triggers
npm run check:dev-inspection-agent-reports
```

No player-visible behavior changes in this project, so `js/notices-data.js` is not updated.
