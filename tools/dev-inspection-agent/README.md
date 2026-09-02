# Development inspection agent

Phase 24 provides a manual, local-input, read-only analysis path. It does not fetch data, change files, call GitHub write APIs, create branches or PRs, post Issues, start workflows, or publish anything.

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

The CLI reads exactly one local input file and writes only the normalized result to standard output. It does not read tokens or environment variables. Phase 25 will handle automatic triggers separately.

## Validation

```sh
npm run check:dev-inspection-agent-manual
```

No player-visible behavior changes in this project, so `js/notices-data.js` is not updated.
