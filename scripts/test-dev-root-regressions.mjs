import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { checkToolSyntax } from './check-tool-syntax.mjs';

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'tool-syntax-'));
try {
  fs.mkdirSync(path.join(temporary, 'scripts'));
  fs.mkdirSync(path.join(temporary, 'tools'));
  fs.writeFileSync(path.join(temporary, 'scripts', 'valid.mjs'), 'throw new Error("must not execute");');
  assert.equal(checkToolSyntax(temporary).failures.length, 0);
  fs.writeFileSync(path.join(temporary, 'tools', 'invalid.js'), "r.run('M.filter(m=>!m.id.startsWith('character_vera_'))');");
  const result = checkToolSyntax(temporary);
  assert.equal(result.count, 2);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0].error, /SyntaxError/);
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

// Start the actual CLI with its default host and an OS-assigned port.
const server = spawn(process.execPath, ['scripts/dev-server.mjs', '--port', '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Preview startup timeout: ${errors}`)), 5000);
    server.on('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited ${code}: ${errors}`)); });
    server.stdout.on('data', chunk => {
      output += chunk;
      if (/Static preview ready on 127\.0\.0\.1:\d+/.test(output)) { clearTimeout(timer); resolve(); }
    });
  });
  const port = output.match(/127\.0\.0\.1:(\d+)/)[1];
  const origin = `http://127.0.0.1:${port}`;
  assert.equal((await fetch(`${origin}/%`)).status, 400);
  assert.equal((await fetch(`${origin}/%00`)).status, 400);
  const response = await fetch(`${origin}/package.json`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).name, 'monster-rpg-ver8');
} finally {
  if (server.exitCode === null) { server.kill(); await once(server, 'exit'); }
}
console.log('ROOT-02/ROOT-04: syntax rejection, default loopback, malformed URL recovery passed');
