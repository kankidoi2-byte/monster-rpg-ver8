import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'acorn';

// This is a syntax check, not an interprocedural proof: explicitly returning,
// storing, testing, or passing the result is a use. Discarded expression values
// (including void, comma, and the final arm of a logical/conditional expression)
// are not. Parse real JavaScript so comments, strings, regexes, templates, nested
// functions, optional calls, and multiline formatting cannot fool a text match.
const MARKER = 'save-result-allow:';
const markerPattern = /^save-result-allow:\s*([a-z][a-z0-9-]*)$/;
const functionTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const root = fileURLToPath(new URL('../', import.meta.url));

function propertyName(node) {
  return node?.type === 'Identifier' ? node.name : node?.type === 'Literal' ? String(node.value) : null;
}
function staticProperty(node) {
  return node.computed && node.property.type !== 'Literal' ? null : propertyName(node.property);
}
function isSaveReference(node) {
  if (!node) return false;
  if (node.type === 'Identifier') return node.name === 'saveGame';
  if (node.type === 'ChainExpression') return isSaveReference(node.expression);
  if (node.type === 'SequenceExpression') return isSaveReference(node.expressions.at(-1));
  return node.type === 'MemberExpression' && staticProperty(node) === 'saveGame' &&
    node.object.type === 'Identifier' && ['window', 'globalThis', 'self'].includes(node.object.name);
}
function isSaveCall(node) {
  if (node.type !== 'CallExpression') return false;
  if (isSaveReference(node.callee)) return true;
  return node.callee.type === 'MemberExpression' && ['call', 'apply'].includes(staticProperty(node.callee)) &&
    isSaveReference(node.callee.object);
}
function functionScope(ancestors) {
  const names = [];
  ancestors.forEach((node, index) => {
    if (!functionTypes.has(node.type)) return;
    const parent = ancestors[index - 1];
    names.push(node.id?.name ||
      (parent?.type === 'VariableDeclarator' ? propertyName(parent.id) : null) ||
      (parent?.type === 'Property' || parent?.type === 'MethodDefinition' ? propertyName(parent.key) : null) ||
      (parent?.type === 'AssignmentExpression' ? propertyName(parent.left) : null) || '<anonymous>');
  });
  return names.join('/') || '<program>';
}
function resultIsUsed(node, ancestors) {
  for (let index = ancestors.length - 1; index >= 0; index--) {
    const parent = ancestors[index];
    if (parent.type === 'ExpressionStatement') return false;
    if (parent.type === 'UnaryExpression' && parent.operator === 'void') return false;
    if (parent.type === 'SequenceExpression' && parent.expressions.at(-1) !== node) return false;
    if (parent.type === 'ForStatement') return parent.test === node;
    if (parent.type === 'LogicalExpression' && parent.left === node) return true;
    if (parent.type === 'ConditionalExpression' && parent.test === node) return true;
    if (['IfStatement', 'WhileStatement', 'DoWhileStatement'].includes(parent.type) && parent.test === node) return true;
    if (['SwitchStatement', 'SwitchCase', 'ForOfStatement', 'ForInStatement'].includes(parent.type)) return true;
    if (['ReturnStatement', 'ThrowStatement', 'VariableDeclarator', 'AssignmentExpression', 'AssignmentPattern',
      'CallExpression', 'NewExpression', 'TaggedTemplateExpression', 'YieldExpression'].includes(parent.type)) return true;
    if (parent.type === 'ArrowFunctionExpression' && parent.body === node) return true;
    // All other expression wrappers inherit their consumer. This catches such
    // apparently-used but discarded values as `${saveGame()}` and [saveGame()].
    node = parent;
  }
  return false;
}
function visit(node, ancestors, callback) {
  if (!node || typeof node.type !== 'string') return;
  callback(node, ancestors);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, [...ancestors, node], callback));
    else if (value && typeof value.type === 'string') visit(value, [...ancestors, node], callback);
  }
}

export function analyzeSaveGameResults(source, file = 'js/fixture.js') {
  const comments = [];
  const ast = parse(source, {ecmaVersion: 'latest', sourceType: 'module', locations: true, onComment: comments});
  const markers = comments.filter(comment => comment.value.includes(MARKER)).map(comment => ({
    id: markerPattern.exec(comment.value.trim())?.[1] || null,
    file, line: comment.loc.start.line, start: comment.start, end: comment.end, used: false
  }));
  const calls = [];
  visit(ast, [], (node, ancestors) => {
    if (!isSaveCall(node)) return;
    // A marker applies only to the immediately following call, never to a whole
    // function, conditional, line, or nested callback. Each ID is single-use.
    const marker = markers.find(value => value.end <= node.start && !source.slice(value.end, node.start).trim());
    if (marker) marker.used = true;
    calls.push({file, line: node.loc.start.line, column: node.loc.start.column + 1,
      scope: functionScope(ancestors), ignored: !resultIsUsed(node, ancestors), marker});
  });
  return {file, calls, markers};
}

export function checkSaveGameResults(sources, allowlist) {
  const errors = [], entries = new Map(), counts = new Map(), calls = [];
  for (const entry of allowlist) {
    if (!entry || !/^[a-z][a-z0-9-]*$/.test(entry.id || '') ||
      typeof entry.file !== 'string' || typeof entry.function !== 'string' || !entry.function.trim() ||
      typeof entry.reason !== 'string' || entry.reason.trim().length < 20) {
      errors.push('Every allowlist entry needs an ID, file, function scope, and a specific recovery reason (at least 20 characters).');
      continue;
    }
    if (entries.has(entry.id)) errors.push(`Duplicate allowlist ID: ${entry.id}`);
    entries.set(entry.id, entry);
  }
  for (const {file, source} of sources) {
    let analysis;
    try { analysis = analyzeSaveGameResults(source, file); }
    catch (error) { errors.push(`${file}: JavaScript parse failed: ${error.message}`); continue; }
    calls.push(...analysis.calls);
    for (const marker of analysis.markers) {
      const location = `${file}:${marker.line}`;
      if (!marker.id) errors.push(`${location}: malformed ${MARKER} marker`);
      else if (!entries.has(marker.id)) errors.push(`${location}: unknown allowlist ID ${marker.id}`);
      if (!marker.used) errors.push(`${location}: allow marker must immediately precede one saveGame call`);
    }
    for (const call of analysis.calls) {
      const location = `${file}:${call.line}:${call.column} (${call.scope})`;
      const id = call.marker?.id;
      if (!call.ignored) {
        if (call.marker) errors.push(`${location}: result is used; remove its stale allowlist marker and entry`);
        continue;
      }
      if (!id || !entries.has(id)) {
        errors.push(`${location}: ignored saveGame result; handle it or add a reviewed, reasoned allowlist entry`);
        continue;
      }
      const entry = entries.get(id);
      counts.set(id, (counts.get(id) || 0) + 1);
      if (entry.file !== file || entry.function !== call.scope)
        errors.push(`${location}: ${id} is allowed only in ${entry.file} (${entry.function})`);
    }
  }
  for (const id of entries.keys()) {
    if ((counts.get(id) || 0) !== 1) errors.push(`${id}: expected exactly one ignored call, found ${counts.get(id) || 0}`);
  }
  return {errors, calls, allowedCount: [...counts.values()].reduce((sum, count) => sum + count, 0)};
}

function decodeHtmlAttribute(value) {
  const named = {amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', Tab: '\t', NewLine: '\n'};
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z][a-z\d]+);/gi, (match, entity) => {
    if (entity[0] !== '#') return named[entity] ?? match;
    const codePoint = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : '\ufffd';
  });
}

// Extract executable HTML without treating comments, quoted '>' characters or
// script/style raw text as markup. JavaScript inside each unit is still parsed
// by Acorn, not by a saveGame regex. Unknown entity/syntax fails closed.
export function htmlJavaScriptSources(html, file) {
  const sources = [];
  let cursor = 0, unit = 0;
  while ((cursor = html.indexOf('<', cursor)) >= 0) {
    if (html.startsWith('<!--', cursor)) {
      const end = html.indexOf('-->', cursor + 4);
      cursor = end < 0 ? html.length : end + 3;
      continue;
    }
    const start = cursor;
    const opening = /^<\s*([a-z][a-z\d:-]*)\b/i.exec(html.slice(start));
    if (!opening) { cursor++; continue; }
    let quote = null, end = start + opening[0].length;
    for (; end < html.length; end++) {
      const char = html[end];
      if (quote) { if (char === quote) quote = null; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end >= html.length) break;
    const attributes = new Map();
    const rawAttributes = html.slice(start + opening[0].length, end);
    const attributePattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    for (const match of rawAttributes.matchAll(attributePattern)) {
      const name = match[1].toLowerCase();
      // Browsers keep the first occurrence of a duplicate HTML attribute.
      if (!attributes.has(name)) attributes.set(name, decodeHtmlAttribute(match[2] ?? match[3] ?? match[4] ?? ''));
    }
    for (const [name, value] of attributes) {
      if (/^on[a-z]+$/.test(name) && value.trim()) sources.push({
        file: `${file}#${name}-${++unit}`,
        source: `function __html_handler__(){\n${value}\n}`
      });
      if (['href', 'action', 'formaction'].includes(name) && /^\s*javascript:/i.test(value)) sources.push({
        file: `${file}#${name}-${++unit}`, source: value.replace(/^\s*javascript:/i, '')
      });
    }
    cursor = end + 1;
    const tag = opening[1].toLowerCase();
    if (['script', 'style', 'textarea', 'title'].includes(tag)) {
      const closing = new RegExp(`</${tag}\\s*>`, 'ig');
      closing.lastIndex = cursor;
      const match = closing.exec(html);
      const body = html.slice(cursor, match ? match.index : html.length);
      if (tag === 'script' && !attributes.has('src')) {
        const type = (attributes.get('type') || '').trim().toLowerCase();
        if (!type || type === 'module' || /^(?:text|application)\/(?:javascript|ecmascript)$/.test(type))
          sources.push({file: `${file}#script-${++unit}`, source: body});
      }
      cursor = match ? closing.lastIndex : html.length;
    }
  }
  return sources;
}

export function runtimeSources(directory = root) {
  const sources = [];
  function walk(relative) {
    for (const entry of fs.readdirSync(path.join(directory, relative), {withFileTypes: true})) {
      const file = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && /\.(?:m?js)$/.test(entry.name))
        sources.push({file, source: fs.readFileSync(path.join(directory, file), 'utf8')});
      else if (entry.isFile() && /\.html?$/.test(entry.name))
        sources.push(...htmlJavaScriptSources(fs.readFileSync(path.join(directory, file), 'utf8'), file));
    }
  }
  walk('js');
  if (fs.existsSync(path.join(directory, 'english'))) walk('english');
  for (const entry of fs.readdirSync(directory, {withFileTypes: true}))
    if (entry.isFile() && /\.html?$/.test(entry.name))
      sources.push(...htmlJavaScriptSources(fs.readFileSync(path.join(directory, entry.name), 'utf8'), entry.name));
  return sources.sort((a, b) => a.file.localeCompare(b.file));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = process.argv[2] ? path.resolve(process.argv[2]) : root;
  const allowlist = JSON.parse(fs.readFileSync(path.join(directory, 'scripts/save-game-result-allowlist.json'), 'utf8'));
  const result = checkSaveGameResults(runtimeSources(directory), allowlist);
  if (result.errors.length) {
    console.error(`saveGame result check failed:\n${result.errors.map(error => `- ${error}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log(`saveGame result check passed: ${result.calls.length} calls, ${result.allowedCount} reviewed exceptions.`);
}
