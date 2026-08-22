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
  'battleMapBanner', 'pName', 'pVis', 'pHpBar', 'pHpTrail', 'pHpText', 'pExpBar',
  'eName', 'eVis', 'eHpBar', 'eHpTrail', 'eHpText', 'commands', 'itemText', 'log', 'battleOutcome', 'next'
];
criticalDomIds.forEach(id => expect(index.includes(`id="${id}"`), `required UI contract is missing: #${id}`));

expect(index.includes('class="title-logo"') && index.includes('class="title-touch"'), 'preserved title artwork hooks are missing');
expect(index.includes('class="app-bottom-nav"'), 'new five-item navigation is missing');
expect(index.includes('class="home-adventure"'), 'new battle-first home entry is missing');
expect(index.includes('class="screen battle-screen"'), 'portrait-first battle screen is missing');
expect(index.includes('class="cmd battle-command-dock"'), 'fixed battle command dock is missing');
expect(read('js/battle-view.js').includes('function playBattleImpact'), 'battle impact feedback is missing');
expect(read('js/battle-view.js').includes('function showBattleOutcome'), 'battle outcome feedback is missing');
expect(read('js/multi-battle.js').includes('function handleMultiTargetKey'), 'accessible multi-target selection is missing');
expect(read('js/multi-battle.js').includes('function setMultiBattleLayout'), 'three-way layout state helper is missing');
expect(read('js/multi-battle.js').includes('multi-enemy-label'), 'three-way enemy labels are missing');
expect(read('css/ui-redesign.css').includes('.battle-screen.is-multi-battle .battle-arena'), 'three-way battle layout state is missing');
expect(read('css/ui-redesign.css').includes('.battle-screen:not(.is-multi-battle) .battle-arena'), 'single battles must use the shared vertical battle flow');
expect(read('css/ui-redesign.css').includes('#singleEnemyBox{order:1}') && read('css/ui-redesign.css').includes('#singlePlayerBox{order:2}'), 'single battle enemy/player vertical order is missing');
expect(read('js/multi-battle.js').includes('function handleMultiEnemyCard'), 'three-way enemy detail interaction is missing');
expect(read('css/ui-redesign.css').includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'side-by-side three-way enemy layout is missing');
expect(read('js/battle-flow.js').includes('function huntRecommendationScore'), 'quest recommendation scoring is missing');
expect(read('js/battle-flow.js').includes('hunt-card-details'), 'progressive quest details are missing');
expect(read('js/party.js').includes('monster-roster-card'), 'monster-first roster cards are missing');
expect(read('js/dex.js').includes('monster-dex-card'), 'monster-first dex cards are missing');
expect(index.includes('class="panel ui-feature-panel skill-edit-panel"'), 'shared skill-edit feature panel is missing');
expect(read('js/expedition.js').includes('expedition-progress'), 'expedition progress feedback is missing');
expect(read('js/items.js').includes('shop-item-card'), 'shared shop item cards are missing');
expect(read('js/ui.js').includes('function showUiNotice'), 'shared reward notice is missing');
expect(read('js/ui.js').includes('function replayUiMotion'), 'shared UI motion helper is missing');
expect(read('js/battle-view.js').includes('is-revealing'), 'staged battle reward reveal is missing');

const requiredScripts = [
  'data.js', 'bootstrap-guard.js', 'core.js', 'state.js', 'save.js', 'ui.js',
  'skills.js', 'dex.js', 'party.js', 'progression.js', 'contract-animation.js', 'items.js', 'alchemy.js',
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
