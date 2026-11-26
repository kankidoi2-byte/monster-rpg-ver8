import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function checkToolSyntax(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && /\.(mjs|js)$/.test(entry.name)) files.push(target);
    }
  }
  for (const directory of ['scripts', 'tools']) visit(path.join(root, directory));
  const failures = [];
  for (const file of files.sort()) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) failures.push({ file: path.relative(root, file), error: result.error?.message || result.stderr });
  }
  return { count: files.length, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = checkToolSyntax(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  for (const failure of result.failures) console.error(`${failure.file}\n${failure.error}`);
  console.log(`Tool syntax: ${result.count} files, ${result.failures.length} failures`);
  if (result.failures.length) process.exitCode = 1;
}
