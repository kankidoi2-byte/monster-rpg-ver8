# Reproducible game balance audit

Start with [the Japanese findings](../../docs/balance-audit/REPORT.md).

Requirements: Node >=20 and Python 3; no npm dependencies, network, browser, or player save required to simulate.
Run from repository root with a full git history. A shallow checkout needs the baseline commit and legacy test commit available.

```sh
# Regressions against your CURRENT working-tree game code:
npm run check:balance-audit
npm run check

# Reproduce the BASELINE audit, candidate comparisons, and report:
npm run analyze:balance
```

The analysis commands pin source to `4ad50548f3dd9e5803cb7f2308c8df2e2d3c6f1a`, not the PR's changed game code.
The deliberate distinction prevents silently labelling post-fix results as pre-fix data. Defaults: Mulberry32 seed 20260908,
200 trials per base case, 500 per focused battle comparison, 200-turn cap. All saved cases include their inputs.

```sh
# Exploratory base run; writes results.json and raw trials (does not regenerate all other experiments):
TRIALS=50 SEED=123 node tools/balance-audit/run.mjs

# Audit a new commit explicitly. Source-patch experiments fail if their old anchors changed.
AUDIT_REF=<commit-sha> node tools/balance-audit/run.mjs

# Individual experiments:
node tools/balance-audit/compare.mjs
node tools/balance-audit/economy.mjs
node tools/balance-audit/mechanics.mjs
node tools/balance-audit/acquisition-candidates.mjs
python3 tools/balance-audit/report.py
```

The checked-in report is specific to the recorded baseline and default trial counts. `report.py` has Japanese editorial
interpretation and baseline-specific explanations; do not treat its prose as automatically valid after changing source/inputs.
For another source or seed, use generated numeric JSON/CSV and revise the interpretation. Preserve a copy of the default results first.

Files:

- `runtime.mjs`: VM loads production files; in-memory storage only, source SHA256 recording. Animation, screen rendering,
  persistence, narrative/map progression are stubbed. Damage, status, enemy AI, turns, switches, links, and reward functions are original.
- `battles.mjs`: disposable parties, legal default/equipped moves, explicit action policies. Conditional maps/bosses are labelled.
- `run.mjs`: broad battles and live gacha/alchemy/expedition calls. `results.json` contains source/configuration and Wilson win intervals.
- `compare.mjs` / `candidates.mjs`: candidate changes only inside VM source strings. Only the independently reviewed bugfixes
  were applied to game files. Poison, EXP, expedition and gacha weights remain unchanged in the game.
- `economy.mjs`: conditional single-win payout, XP and material acquisition distributions. These are not full campaign simulations.
- `mechanics.mjs`: isolated production one-action effects, type matrix, default-card acquisition and contract-stage sampling.
- `test-regressions.mjs` / `test-link-invasion.mjs`: current-source regression checks, including actual poison KO after invasion.

Raw base trials are gzip JSONL; focused trials are gzip JSON. They are generated locally and ignored by Git.
The retained aggregates keep all fields and numeric values; formatting is one row per line.
`npm run analyze:balance` verifies all 10 expected hashes, then normalizes aggregate formatting.
`node tools/balance-audit/verify-reproduction.mjs --generated` verifies raw outputs too.
`npm run check:balance-audit` verifies the 7 retained aggregate/report hashes without requiring raw outputs.
For exploratory seeds or another source, run individual commands: the default manifest deliberately rejects changed results.
See [the integration review](../../docs/balance-audit/INTEGRATION-REVIEW.md) for storage decisions and release gates. For example:

```sh
python3 - <<'PY'
import gzip, json
with gzip.open('docs/balance-audit/battle-trials.jsonl.gz', 'rt') as f:
    first = json.loads(next(f))
print(first)
PY
```

95% acquisition quantiles mean 5% can take longer; they are not pity limits. Capped battles are separate from defeats.
The simple tactical controller can repeatedly heal without making progress; that is not proof of an engine infinite loop.
No measured play time, Android/Chromebook validation, optimal-party proof, full campaign, or absence-of-all-exploits proof is claimed.
The local browser connection was denied; see report for the manual screen checks remaining before any merge.
