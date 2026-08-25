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
vm.runInContext(`${source}\nglobalThis.__gameNotices = GAME_NOTICES;\nglobalThis.__noticeCategories = NOTICE_CATEGORIES;`, context);

const notices = context.__gameNotices;
const categories = context.__noticeCategories;
const errors = [];
const expect = (condition, message) => { if (!condition) errors.push(message); };

expect(Array.isArray(notices) && notices.length > 0, 'at least one player-facing notice is required');
const ids = new Set();
let previousDate = '9999-12-31';

notices.forEach((notice, index) => {
  const label = `notice ${index + 1}`;
  expect(notice && typeof notice === 'object', `${label} must be an object`);
  expect(typeof notice.id === 'string' && /^[0-9]{8}-[a-z0-9-]+$/.test(notice.id), `${label} has an invalid id`);
  expect(!ids.has(notice.id), `${label} duplicates id ${notice.id}`);
  ids.add(notice.id);
  expect(/^\d{4}-\d{2}-\d{2}$/.test(notice.date || '') && !Number.isNaN(Date.parse(`${notice.date}T00:00:00Z`)), `${label} has an invalid date`);
  expect(notice.date <= previousDate, `${label} is not in newest-first order`);
  previousDate = notice.date;
  expect(Object.hasOwn(categories, notice.category), `${label} has an unknown category`);
  expect(typeof notice.title === 'string' && notice.title.trim().length > 0, `${label} title is empty`);
  expect(typeof notice.body === 'string' && notice.body.trim().length > 0, `${label} body is empty`);
});

expect(index.includes('js/notices-data.js') && index.includes('js/notices.js'), 'notice scripts are not loaded by index.html');
expect(index.indexOf('js/notices-data.js') < index.indexOf('js/notices.js'), 'notice data must load before notice UI');

vm.runInContext(uiSource, context);
expect(context.hasUnreadGameNotice(), 'latest notice should be unread on first visit');
expect(preview.innerHTML.includes(notices[0].title), 'home preview does not render the latest notice');
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
