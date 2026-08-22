function contractAnimationStage(roll, successRate) {
  const rate = Math.max(0, Math.min(1, Number(successRate) || 0));
  const value = Math.max(0, Math.min(1, Number(roll) || 0));
  if (value < rate || rate >= 1) return 3;
  if (rate >= .999999) return 2;
  const failureDistance = (value - rate) / (1 - rate);
  if (failureDistance < 1 / 3) return 2;
  if (failureDistance < 2 / 3) return 1;
  return 0;
}

function contractAnimationDelay(ms) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new Promise(resolve => setTimeout(resolve, reduced ? Math.min(ms, 140) : ms));
}

async function playContractAnimation({monsterName, stage}) {
  const overlay = document.getElementById('contractAnimation');
  const paper = document.getElementById('contractPaper');
  const message = document.getElementById('contractAnimationMessage');
  if (!overlay || !paper || !message) return;

  const pulseCount = Math.max(0, Math.min(3, Number(stage) || 0));
  const zoomLevels = [1.16, 1.32, 1.48];
  overlay.classList.remove('hidden');
  paper.style.setProperty('--contract-zoom', '1');
  paper.style.setProperty('--contract-zoom-from', '1');
  paper.style.setProperty('--contract-zoom-to', '1');
  paper.className = 'contract-paper is-entering';
  message.textContent = '契約を試みている……';
  await contractAnimationDelay(620);
  paper.classList.remove('is-entering');
  await contractAnimationDelay(650);

  for (let index = 0; index < pulseCount; index++) {
    const from = index === 0 ? 1 : zoomLevels[index - 1];
    const to = zoomLevels[index];
    paper.style.setProperty('--contract-zoom-from', String(from));
    paper.style.setProperty('--contract-zoom-to', String(to));
    paper.classList.remove('is-zooming');
    void paper.offsetWidth;
    paper.classList.add('is-zooming');
    await contractAnimationDelay(400);
    paper.classList.remove('is-zooming');
    paper.style.setProperty('--contract-zoom', String(to));
    if (index < pulseCount - 1) await contractAnimationDelay(780);
  }

  if (pulseCount === 3) {
    await contractAnimationDelay(850);
    paper.classList.add('is-stamping');
    await contractAnimationDelay(560);
    message.textContent = `${monsterName}と契約しました`;
    await contractAnimationDelay(1100);
  } else {
    await contractAnimationDelay(pulseCount === 0 ? 420 : 800);
    paper.classList.add('is-tearing');
    await contractAnimationDelay(740);
    message.textContent = '契約できなかった……';
    await contractAnimationDelay(850);
  }

  overlay.classList.add('hidden');
  paper.className = 'contract-paper';
  paper.style.removeProperty('--contract-zoom');
  paper.style.removeProperty('--contract-zoom-from');
  paper.style.removeProperty('--contract-zoom-to');
}
