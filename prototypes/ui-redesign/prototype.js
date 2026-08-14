const screens = {
  home: document.getElementById('prototype-home'),
  hunt: document.getElementById('prototype-hunt'),
  battle: document.getElementById('prototype-battle')
};
const bottomNav = document.querySelector('.bottom-nav');
const toast = document.getElementById('prototype-toast');
let toastTimer = null;

function showPrototypeScreen(id) {
  Object.values(screens).forEach(screen => screen.classList.remove('is-active'));
  screens[id]?.classList.add('is-active');
  bottomNav.classList.toggle('is-hidden', id === 'battle');
  bottomNav.querySelectorAll('button').forEach(button => {
    button.classList.toggle('is-active', button.dataset.open === id && id !== 'hunt');
  });
  window.scrollTo({top: 0, behavior: 'instant'});
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 1500);
}

document.addEventListener('click', event => {
  const opener = event.target.closest('[data-open]');
  if (opener) showPrototypeScreen(opener.dataset.open);

  const placeholder = event.target.closest('[data-placeholder]');
  if (placeholder) showToast(`${placeholder.dataset.placeholder}画面は次の移行対象です`);

  const attack = event.target.closest('[data-attack]');
  if (!attack) return;
  const enemy = document.getElementById('enemy-visual');
  const damage = document.getElementById('damage-number');
  const hp = document.querySelector('.enemy-hp span');
  const hpText = document.getElementById('enemy-hp-text');
  const value = Number(attack.dataset.attack);
  const nextHp = Math.max(0, Number(hpText.textContent) - value);
  enemy.classList.add('is-hit');
  damage.textContent = value;
  damage.classList.remove('is-visible');
  void damage.offsetWidth;
  damage.classList.add('is-visible');
  hp.style.width = `${nextHp / 98 * 100}%`;
  hpText.textContent = nextHp;
  setTimeout(() => enemy.classList.remove('is-hit'), 170);
  if (nextHp === 0) setTimeout(() => showToast('討伐成功！ 報酬画面へつなげます'), 420);
});
