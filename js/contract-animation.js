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
  overlay.classList.remove('hidden');
  paper.className = 'contract-paper is-entering';
  message.textContent = '契約を試みている……';
  await contractAnimationDelay(470);
  paper.classList.remove('is-entering');

  for (let index = 0; index < pulseCount; index++) {
    paper.classList.remove('is-pulsing');
    void paper.offsetWidth;
    paper.classList.add('is-pulsing');
    await contractAnimationDelay(650);
    paper.classList.remove('is-pulsing');
  }

  if (pulseCount === 3) {
    await contractAnimationDelay(260);
    paper.classList.add('is-stamping');
    await contractAnimationDelay(540);
    message.textContent = `${monsterName}と契約しました`;
    await contractAnimationDelay(1050);
  } else {
    paper.classList.add('is-tearing');
    await contractAnimationDelay(700);
    message.textContent = '契約できなかった……';
    await contractAnimationDelay(780);
  }

  overlay.classList.add('hidden');
  paper.className = 'contract-paper';
}
