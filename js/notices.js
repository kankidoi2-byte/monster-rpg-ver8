const NOTICE_SEEN_KEY = 'mb_notice_last_seen_v1';

function noticeStorageGet() {
  if (typeof safeStorageGet === 'function') return safeStorageGet(NOTICE_SEEN_KEY);
  try { return localStorage.getItem(NOTICE_SEEN_KEY); } catch (_error) { return null; }
}

function noticeStorageSet(value) {
  if (typeof safeStorageSet === 'function') return safeStorageSet(NOTICE_SEEN_KEY, value);
  try { localStorage.setItem(NOTICE_SEEN_KEY, value); return true; } catch (_error) { return false; }
}

function latestGameNotice() {
  return Array.isArray(GAME_NOTICES) && GAME_NOTICES.length ? GAME_NOTICES[0] : null;
}

function hasUnreadGameNotice() {
  const latest = latestGameNotice();
  return !!latest && noticeStorageGet() !== latest.id;
}

function escapeNoticeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function noticeCategoryMeta(category) {
  return NOTICE_CATEGORIES[category] || NOTICE_CATEGORIES.update;
}

function noticeDateLabel(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : date;
}

function updateNoticeIndicators() {
  const unread = hasUnreadGameNotice();
  document.querySelectorAll('[data-notice-unread]').forEach(element => {
    element.hidden = !unread;
  });
}

function renderNoticePreview() {
  const preview = document.getElementById('homeNoticePreview');
  const notice = latestGameNotice();
  if (!preview || !notice) return;
  const meta = noticeCategoryMeta(notice.category);
  preview.innerHTML = `<button type="button" class="home-notice-card" onclick="showNotices()">
    <span class="home-notice-icon" aria-hidden="true">${meta.icon}</span>
    <span class="home-notice-copy">
      <span><b>${escapeNoticeHtml(meta.label)}</b><time datetime="${escapeNoticeHtml(notice.date)}">${escapeNoticeHtml(noticeDateLabel(notice.date))}</time></span>
      <strong>${escapeNoticeHtml(notice.title)}</strong>
    </span>
    <span class="notice-new-badge" data-notice-unread>NEW</span>
    <span class="home-notice-arrow" aria-hidden="true">›</span>
  </button>`;
  updateNoticeIndicators();
}

function renderNotices() {
  const list = document.getElementById('noticeList');
  if (!list) return;
  list.innerHTML = GAME_NOTICES.map((notice, index) => {
    const meta = noticeCategoryMeta(notice.category);
    return `<article class="notice-entry notice-${escapeNoticeHtml(notice.category)}">
      <div class="notice-entry-meta">
        <span>${meta.icon} ${escapeNoticeHtml(meta.label)}</span>
        <time datetime="${escapeNoticeHtml(notice.date)}">${escapeNoticeHtml(noticeDateLabel(notice.date))}</time>
        ${index === 0 ? '<b>最新</b>' : ''}
      </div>
      <h2>${escapeNoticeHtml(notice.title)}</h2>
      <p>${escapeNoticeHtml(notice.body)}</p>
    </article>`;
  }).join('');
}

function markLatestGameNoticeRead() {
  const latest = latestGameNotice();
  if (latest) noticeStorageSet(latest.id);
  updateNoticeIndicators();
}

function showNotices() {
  show('notices');
  renderNotices();
  markLatestGameNoticeRead();
}

renderNoticePreview();
updateNoticeIndicators();
