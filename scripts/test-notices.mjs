import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'js/notices-data.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'js/notices.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const preview = { innerHTML: '' };
const list = { innerHTML: '' };
const unreadIndicator = { hidden: true };
const storage = new Map();
const context = {
  document: {
    getElementById(id) { return id === 'homeNoticePreview' ? preview : id === 'noticeList' ? list : null; },
    querySelectorAll(selector) { return selector === '[data-notice-unread]' ? [unreadIndicator] : []; }
  },
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, String(value)); }
  },
  shownScreen: null,
  show(id) { context.shownScreen = id; }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'js/update-releases.js'), 'utf8'), context);
vm.runInContext(`${source}\nglobalThis.__gameNotices = GAME_NOTICES;\nglobalThis.__noticeCategories = NOTICE_CATEGORIES;`, context);

const notices = context.__gameNotices;
const categories = context.__noticeCategories;
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

expect(Array.isArray(notices) && notices.length > 0, 'at least one player-facing notice is required');
const playerNotices = vm.runInContext('PLAYER_NOTICES', context);
for (let i = 1; i < playerNotices.length; i++) {
  expect(playerNotices[i].date <= playerNotices[i - 1].date,
    `js/notices-data.js: ${playerNotices[i].id} must precede ${playerNotices[i - 1].id} (newest first)`);
}
const ids = new Set();
let previousDate = '9999-12-31';

playerNotices.forEach((notice, index) => {
  const label = `notice ${index + 1}`;
  expect(notice && typeof notice === 'object', `${label} must be an object`);
  expect(typeof notice.id === 'string' && /^[0-9]{8}-[a-z0-9-]+$/.test(notice.id), `${label} has an invalid id`);
  expect(!ids.has(notice.id), `${label} duplicates id ${notice.id}`);
  ids.add(notice.id);
  expect(/^\d{4}-\d{2}-\d{2}$/.test(notice.date || '') && !Number.isNaN(Date.parse(`${notice.date}T00:00:00Z`)), `${label} has an invalid date`);
  expect(notice.date <= previousDate, `${label} is not in newest-first order`);
  previousDate = notice.date;
  expect(Object.hasOwn(categories, notice.category), `${label} has an unknown category`);
  const titleText = notice.title.normalize('NFKC').replace(/(?:アップデート|不具合修正|お知らせ|更新情報|重要)/gu, '');
  expect(!/^[\s\d年月日()/.・-]*$/u.test(titleText), `${notice.id} needs a descriptive title`);
  expect(typeof notice.title === 'string' && notice.title.trim().length > 0, `${label} title is empty`);
  expect(typeof notice.body === 'string' && notice.body.trim().length > 0, `${label} body is empty`);
});

for (const notice of playerNotices) {
  expect(notices.includes(notice), `${notice.id} duplicates another article on ${notice.date}`);
}

const update = {date:'2026-11-27', category:'update', body:'第７話の会話でトビアの立ち絵が隠れる問題を修正しました。'};
const fix = {...update, category:'fix', body:'第7話の会話で、トビアの立ち絵が隠れる不具合を修正した。'};
const smallEdit = {...fix, body:fix.body.replace('会話で', '会話では')};
const otherCharacter = {...fix, body:fix.body.replace('トビア', 'セレネ')};
const otherEpisode = {...fix, body:fix.body.replace('第7話', '第8話')};
const nextDay = {...fix, date:'2026-11-28'};
for (const group of [[update, fix, smallEdit], [fix, update, smallEdit]]) {
  const result = context.distinctGameNotices([...group, otherCharacter, otherEpisode, nextDay]);
  expect(result.length === 4 && result[0] === fix && result.includes(nextDay) &&
    result.includes(otherCharacter) && result.includes(otherEpisode), 'collapse same-day variants, prefer fix, keep other subjects and dates');
}
const dated = notices.filter(n => n.date === '2026-11-27');
for (const id of ['20261127-prologue-transparent-portraits','20261127-prologue-dialogue-speaker']) {
  expect(dated.some(n => n.id === id && n.category === 'fix'), `missing portrait correction: ${id}`);
}
expect(dated.some(n => n.id === '20261127-battle-result-sounds' && n.category === 'update' &&
  n.title === '効果音を追加しました'), 'sound update needs its descriptive title');

expect(index.includes('js/notices-data.js') && index.includes('js/notices.js'), 'notice scripts are not loaded by index.html');
expect(index.indexOf('js/notices-data.js') < index.indexOf('js/notices.js'), 'notice data must load before notice UI');

vm.runInContext(uiSource, context);
expect(context.hasUnreadGameNotice(), 'latest notice should be unread on first visit');
expect(preview.innerHTML.includes('お知らせ') && preview.innerHTML.includes('data-notice-unread') && preview.innerHTML.includes('showNotices()'), 'compact home notice must retain navigation and unread indicator');
expect(unreadIndicator.hidden === false, 'unread indicator should be visible before opening notices');
context.showNotices();
expect(context.shownScreen === 'notices', 'notice action does not open the notice screen');
expect(list.innerHTML.includes(notices[0].title) && list.innerHTML.includes(notices.at(-1).title), 'notice history does not render all entries');
expect(storage.get('mb_notice_last_seen_v1') === notices[0].id, 'opening notices does not store the latest notice id');
expect(!context.hasUnreadGameNotice() && unreadIndicator.hidden === true, 'unread state is not cleared after opening notices');

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`Notice data passed: ${notices.length} entries`);
