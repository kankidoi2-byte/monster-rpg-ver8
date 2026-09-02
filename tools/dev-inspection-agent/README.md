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

The separately approved writer is `createGitHubPatchWriter(...)`. It accepts only this repository, a still-valid Phase 29 proposal, the exact reviewed plan, and a matching five-minute one-time authorization. Before any write, it rechecks current `main`, open Pull Requests, every source Git blob, every exact-once replacement, and every expected result blob.

After all preflight reads succeed, the writer may create at most three blobs, one tree, one commit, one `codex/agent-fix-*` branch, and one Pull Request. It cannot merge, write directly to `main`, force push, post Issues, start workflows, or change repository settings. A token is read only by the explicit environment adapter, is never returned, and no real writer invocation is part of validation. Every actual materialization requires a newly prepared exact confirmation; implementation approval does not authorize any branch or Pull Request by itself.

## Limited autonomous trials

Phase 31 adds `authorizeLimitedAutonomyTrial(request, ledger, { now })`, a deny-by-default policy gate for one isolated remediation attempt. It accepts only a high-confidence CI failure bound to the current immutable `main` SHA, an allowlisted failed check, and one of two fixed finding kinds: a declared test failure or a broken reference.

An authorized trial may read fixed blobs, use the Phase 28 memory overlay, generate the Phase 29 exact-once proposal, and run the declared test plan once. It targets at most three safe text paths, expires after one hour, and is deduplicated in a caller-owned 24-hour ledger. Save/data sources, existing IDs, governance, workflows, secrets, images, assets, external writes, retries, and paid actions remain outside the scope.

The policy does not invoke the Phase 30 writer. Every real remediation branch, commit, and Pull Request still requires a new proposal-specific five-minute confirmation; merge and Issue publication remain unauthorized.

## Formal bounded operation

Phase 32 adds `runFormalInspectionCycle(input, runtimeState, { now })` as the single fail-closed operation entrypoint. One invocation accepts one normalized trigger and current repository, CI, and Pages snapshots. It composes duplicate suppression, read-only analysis, an unpublished incident report and Issue draft, the Phase 31 allowlist, one Phase 28 memory overlay, one Phase 29 verified exact-once proposal, and Phase 30 publication preparation.

Healthy observations stop with no action. Running checks and pending Pages deployments remain in monitoring. Existing Pull Requests remain awaiting review. Failed, stale, and unavailable observations create only an unpublished Issue draft unless the caller also supplies complete bounded remediation evidence. Only a current-main CI failure with an allowlisted test failure or broken reference can reach a verified patch plan.

The formal cycle deliberately stops at a five-minute, one-time confirmation request. It does not call the GitHub writer, post an Issue, create a branch, commit, or Pull Request, merge, start a workflow, change settings, or publish manually. After a fresh proposal-specific confirmation, the separately tested Phase 30 writer may materialize exactly the reviewed branch, commit, and Pull Request; merge remains outside this cycle.

The operation core processes every accepted PR, main, CI, Pages, or hourly trigger once and returns bounded ledgers to its caller. It does not install a scheduler, webhook, token, or persistence adapter. The existing scheduled automation or another trusted adapter supplies observations and safely retains the returned ledgers.

## Validation

```sh
npm run check:dev-inspection-agent-manual
npm run check:dev-inspection-agent-triggers
npm run check:dev-inspection-agent-reports
npm run check:dev-inspection-agent-issue-drafts
npm run check:dev-inspection-agent-isolation
npm run check:dev-inspection-agent-proposals
npm run check:dev-inspection-agent-publication-approval
npm run check:dev-inspection-agent-github-writer
npm run check:dev-inspection-agent-limited-autonomy
npm run check:dev-inspection-agent-formal-operation
```

No player-visible behavior changes in this project, so `js/notices-data.js` is not updated.
