import fs from 'node:fs';
import path from 'node:path';
import { analyzeManualSnapshot, MANUAL_ANALYSIS_LIMITS } from './manual-readonly-analysis.mjs';

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return null;
  return process.argv[index + 1];
}

function fail(reasonCode) {
  process.stdout.write(JSON.stringify({
    schema_version: 1,
    phase: 24,
    mode: 'manual_read_only',
    status: 'unavailable',
    reason_code: reasonCode,
    side_effects: {
      network_requests: false,
      file_writes: false,
      github_writes: false,
      workflow_actions: false,
      external_messages: false,
      paid_actions: false
    }
  }, null, 2) + '\n');
  process.exitCode = 1;
}

const inputArgument = argumentValue('--input');
const nowArgument = argumentValue('--now');

if (!inputArgument) {
  fail('manual_input_required');
} else {
  try {
    const inputPath = path.resolve(inputArgument);
    const stat = fs.statSync(inputPath);
    if (!stat.isFile()) {
      fail('manual_input_not_file');
    } else if (stat.size > MANUAL_ANALYSIS_LIMITS.max_input_bytes) {
      fail('manual_input_too_large');
    } else {
      const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
      const result = analyzeManualSnapshot(input, { now: nowArgument || undefined });
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }
  } catch {
    fail('manual_input_invalid');
  }
}
