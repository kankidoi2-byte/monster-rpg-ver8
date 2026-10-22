import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {analyzeSaveGameResults, checkSaveGameResults, htmlJavaScriptSources, runtimeSources} from './check-save-game-results.mjs';

let assertions = 0;
function check(source, allowlist = [], file = 'js/fixture.js') {
  return checkSaveGameResults([{file, source}], allowlist);
}
function pass(source, allowlist = []) {
  const result = check(source, allowlist);
  assert.deepEqual(result.errors, [], source); assertions++;
}
function fail(source, pattern = /ignored saveGame result/, allowlist = []) {
  const result = check(source, allowlist);
  assert(result.errors.some(message => pattern.test(message)), `${source}\n${result.errors.join('\n')}`); assertions++;
}
const entry = {id: 'fixture-checkpoint', file: 'js/fixture.js', function: 'f',
  reason: 'A recoverable fixture checkpoint stays in memory until the next successful save.'};
const marker = '/* save-result-allow: fixture-checkpoint */';

// Existing definitions, mentions, strings, regexes, comments, and template text
// are not calls. Executable template substitutions and nested callbacks are.
pass(`function saveGame() { return true; }
  const text = "saveGame();";
  const escaped = 'it\\\'s saveGame()';
  const template = \`saveGame() \${'not a call'}\`;
  const pattern = /saveGame\\(\\)/;
  // saveGame();
  /* saveGame(); */`);
pass('function f(){ if(!saveGame()) return false; }');
pass('function f(){ if(saveGame() === false) throw Error("save failed"); }');
pass('function f(){ return saveGame(); }');
pass('const f = () => saveGame();');
pass('async function f(){ return await saveGame(); }');
pass('function f(){ const saved = saveGame(); if (!saved) return false; }');
pass('function f(){ let saved; saved = saveGame(); if (!saved) return false; }');
pass('function f(){ consume(saveGame()); }');
pass('function f(){ saveGame() || reportFailure(); }');
pass('function f(){ if(flag && saveGame()) complete(); }');
pass('function f(){ return flag ? saveGame() : false; }');
pass('function f(){ return (prepare(), saveGame()); }');
pass('function f(){ switch(saveGame()){ case false: reportFailure(); } }');

for (const source of [
  'saveGame();',
  'saveGame /* extra comment */ ();',
  'saveGame\n();',
  '(saveGame)();',
  'saveGame?.();',
  'save\\u0047ame();',
  'window.saveGame();',
  'globalThis["saveGame"]();',
  'self?.saveGame?.();',
  'saveGame.call(null);',
  'saveGame["apply"](null, []);',
  '(0, saveGame)();',
  'function f(){ saveGame(); }',
  'function f(){ if (flag) { while (ready) { saveGame(); } } }',
  'function f(){ setTimeout(() => { saveGame(); }, 0); }',
  'function f(){ function inner(){ saveGame(); } }',
  'class Store { save(){ saveGame(); } }',
  'void saveGame();',
  '!saveGame();',
  'saveGame() === false;',
  'async function f(){ await saveGame(); }',
  '(saveGame(), finish());',
  'function f(){ return (saveGame(), true); }',
  'const saved = (saveGame(), true);',
  'flag && saveGame();',
  'flag ? saveGame() : false;',
  'for(saveGame(); flag; tick()) {}',
  'for(; flag; saveGame()) {}',
  '[saveGame()];',
  '({saved: saveGame()});',
  '`result: ${saveGame()}`;',
  'function f(){ return void saveGame(); }',
  'const text="/* save-result-allow: fixture-checkpoint */"; saveGame();'
]) fail(source);

const allowed = `function f(){ ${marker} saveGame(); }`;
pass(allowed, [entry]);
pass(`\n\n// Added lines do not invalidate approval.\nfunction f() {\n  ${marker}\n  saveGame(\n  );\n}`, [entry]);
fail(`${allowed}\nsaveGame();`, /ignored saveGame result/, [entry]);
fail(`function f(){${marker}saveGame(); ${marker}saveGame();}`, /expected exactly one ignored call, found 2/, [entry]);
fail(`function g(){${marker}saveGame();}`, /allowed only in js\/fixture.js \(f\)/, [entry]);
fail(`function f(){ function inner(){${marker}saveGame();} }`, /allowed only/, [entry]);
fail(`function f(){${marker}saveGame();}`, /unknown allowlist ID/);
fail(`function f(){${marker}return saveGame();}`, /must immediately precede/, [entry]);
fail(`function f(){return ${marker}saveGame();}`, /result is used/, [entry]);
fail(`function f(){${marker}if(flag)saveGame();}`, /must immediately precede/, [entry]);
fail(`function f(){${marker}prepare();saveGame();}`, /must immediately precede/, [entry]);
fail(`function f(){/* save-result-allow: */saveGame();}`, /malformed/);
fail(allowed, /specific recovery reason/, [{...entry, reason: 'fine'}]);
fail(allowed, /Duplicate allowlist ID/, [entry, entry]);
fail('function f(){}', /expected exactly one ignored call, found 0/, [entry]);
fail('function f( {', /JavaScript parse failed/);
assert(check(allowed, [entry], 'js/other.js').errors.some(message => /allowed only/.test(message))); assertions++;
assert.equal(analyzeSaveGameResults('const text=`saveGame()`;').calls.length, 0); assertions++;
assert.equal(analyzeSaveGameResults('const text=`${saveGame()}`;').calls.length, 1); assertions++;
assert.equal(analyzeSaveGameResults('function f(){saveGame(); (()=>{saveGame()})();}').calls.length, 2); assertions++;

const html = `<!-- <script>saveGame();</script> -->
  <div title="> saveGame()">saveGame()</div>
  <script>const text = '<button onclick="saveGame()">';</script>
  <script src="external.js">saveGame();</script>
  <script type="application/json">{"text":"saveGame()"}</script>
  <textarea><button onclick="saveGame()"></textarea>
  <style>.x::after { content: "<button onclick='saveGame()'>"; }</style>
  <button onclick="if (!saveGame()) return false;">safe</button>`;
assert.deepEqual(checkSaveGameResults(htmlJavaScriptSources(html, 'index.html'), []).errors, []); assertions++;
for (const html of [
  '<script>saveGame();</script>',
  '<script type="module">await saveGame();</script>',
  '<button onclick="saveGame();">save</button>',
  '<button onclick="ready &amp;&amp; saveGame();">save</button>',
  '<button onclick="&#115;aveGame();">save</button>',
  '<button onclick=saveGame()>save</button>',
  '<a href="javascript:saveGame()">save</a>'
]) {
  assert(checkSaveGameResults(htmlJavaScriptSources(html, 'index.html'), []).errors.some(message => /ignored saveGame result/.test(message)), html); assertions++;
}

// Exercise the actual CLI, using a separate tree rather than modifying live
// game files. A new unapproved call fails, adding a reasoned single-use entry
// passes, a second call still fails, and nested runtime/HTML files are scanned.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'save-game-result-check-'));
try {
  fs.mkdirSync(path.join(directory, 'js/nested'), {recursive: true});
  fs.mkdirSync(path.join(directory, 'scripts'));
  fs.mkdirSync(path.join(directory, 'english'));
  const sourcePath = path.join(directory, 'js/fixture.js');
  const allowPath = path.join(directory, 'scripts/save-game-result-allowlist.json');
  const run = () => spawnSync(process.execPath, [fileURLToPath(new URL('./check-save-game-results.mjs', import.meta.url)), directory], {encoding: 'utf8'});
  fs.writeFileSync(sourcePath, 'function f(){saveGame();}');
  fs.writeFileSync(allowPath, '[]');
  let result = run(); assert.equal(result.status, 1, result.stderr); assert.match(result.stderr, /ignored saveGame result/); assertions++;
  fs.writeFileSync(sourcePath, allowed);
  fs.writeFileSync(allowPath, JSON.stringify([entry]));
  result = run(); assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /1 reviewed exceptions/); assertions++;
  fs.appendFileSync(sourcePath, '\nfunction unapproved(){saveGame();}');
  result = run(); assert.equal(result.status, 1); assert.match(result.stderr, /unapproved/); assertions++;
  fs.writeFileSync(sourcePath, allowed);
  fs.writeFileSync(path.join(directory, 'js/nested/new.js'), 'saveGame();');
  result = run(); assert.equal(result.status, 1); assert.match(result.stderr, /js\/nested\/new.js/); assertions++;
  fs.writeFileSync(path.join(directory, 'js/nested/new.js'), 'if (!saveGame()) reportFailure();');
  fs.writeFileSync(path.join(directory, 'english/new.js'), 'saveGame();');
  result = run(); assert.equal(result.status, 1); assert.match(result.stderr, /english\/new.js/); assertions++;
  fs.writeFileSync(path.join(directory, 'english/new.js'), 'if (!saveGame()) reportFailure();');
  fs.writeFileSync(path.join(directory, 'index.html'), '<script>saveGame();</script>');
  result = run(); assert.equal(result.status, 1); assert.match(result.stderr, /index.html#script/); assertions++;
  fs.writeFileSync(path.join(directory, 'index.html'), '<button onclick="saveGame()">save</button>');
  result = run(); assert.equal(result.status, 1); assert.match(result.stderr, /index.html#onclick/); assertions++;
  assert.equal(runtimeSources(directory).length, 4); assertions++;
} finally { fs.rmSync(directory, {recursive: true, force: true}); }
console.log(`saveGame result guard tests passed: ${assertions} assertions, including CLI reject/approve/regression checks.`);
