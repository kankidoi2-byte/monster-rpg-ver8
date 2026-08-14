import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const save = read('js/save.js');
const data = read('js/data.js');

const errors = [];
const expect = (condition, message) => {
  if (!condition) errors.push(message);
};

const saveKey = 'mb_v95c';
expect(save.includes(`localStorage.getItem('${saveKey}')`), `save loader must keep ${saveKey}`);
expect(save.includes(`localStorage.setItem('${saveKey}'`), `save writer must keep ${saveKey}`);
expect(save.includes(`localStorage.removeItem('${saveKey}')`), `save reset must keep ${saveKey}`);

const starterIds = ['elna_beginner', 'freigal', 'aquaron', 'grassbeat', 'volteck'];
starterIds.forEach(id => expect(data.includes(`id:'${id}'`) || data.includes(`id: '${id}'`), `starter id is missing: ${id}`));

const screenIds = [
  'home', 'growthHub', 'moreMenu', 'expedition', 'evolution', 'partySet', 'battleChoices',
  'battleItemSelect', 'contractConfirm', 'battle', 'fusion', 'alchemy',
  'alchemyConfirm', 'alchemyResult', 'shop', 'itemGacha', 'party',
  'skillEdit', 'typeChart', 'dex', 'itemDex'
];
screenIds.forEach(id => {
  const pattern = new RegExp(`<section\\s+id=["']${id}["'][^>]*class=["'][^"']*screen`);
  expect(pattern.test(index), `required screen is missing: #${id}`);
});

const criticalDomIds = [
  'titleScreen', 'currentPartyView', 'partySelectList', 'battleChoiceList',
  'battleMapBanner', 'pName', 'pVis', 'pHpBar', 'pHpText', 'pExpBar',
  'eName', 'eVis', 'eHpBar', 'eHpText', 'commands', 'itemText', 'log', 'next'
];
criticalDomIds.forEach(id => expect(index.includes(`id="${id}"`), `required UI contract is missing: #${id}`));

expect(index.includes('class="title-logo"') && index.includes('class="title-touch"'), 'preserved title artwork hooks are missing');
expect(index.includes('class="app-bottom-nav"'), 'new five-item navigation is missing');
expect(index.includes('class="home-adventure"'), 'new battle-first home entry is missing');
expect(index.includes('class="screen battle-screen"'), 'portrait-first battle screen is missing');
expect(index.includes('class="cmd battle-command-dock"'), 'fixed battle command dock is missing');
expect(read('js/battle-view.js').includes('function playBattleImpact'), 'battle impact feedback is missing');

const requiredScripts = [
  'data.js', 'bootstrap-guard.js', 'core.js', 'state.js', 'save.js', 'ui.js',
  'skills.js', 'dex.js', 'party.js', 'progression.js', 'items.js', 'alchemy.js',
  'battle-view.js', 'battle-rules.js', 'battle-flow.js', 'expedition.js', 'init.js'
];
let previousIndex = -1;
requiredScripts.forEach(file => {
  const currentIndex = index.indexOf(`js/${file}`);
  expect(currentIndex >= 0, `required script is missing: ${file}`);
  expect(currentIndex > previousIndex, `script order changed around: ${file}`);
  previousIndex = currentIndex;
});

if (errors.length) {
  console.error(`UI compatibility validation failed (${errors.length} issue(s)):`);
  errors.forEach(error => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`UI compatibility validation passed (${screenIds.length} screens, ${criticalDomIds.length} DOM contracts, ${requiredScripts.length} scripts).`);
