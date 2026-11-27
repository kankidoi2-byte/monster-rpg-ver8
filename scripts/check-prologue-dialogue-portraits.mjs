import assert from 'node:assert/strict';

// Read the live nameplate and the images on the character stage after decoding.
// Seed each cursor so mutually exclusive contract outcomes are all exercised.
export async function readDialoguePortraits(page) {
  return page.evaluate(async () => {
    const rows = [];
    const portraits = prologuePart2Data().portraits;
    for (const episode of prologuePart2Episodes()) {
      const state = prologuePart2WritableEpisode(episode.id);
      prologuePart2Ui = {id:episode.id, identity:saveTransactionIdentity(), seen:[], captionShown:true};
      for (const [index, step] of episode.steps.entries()) {
        if (!['dialogue', 'narration', 'system', 'production'].includes(step.kind)) continue;
        Object.assign(state, step.when, {cursor:step.id});
        renderProloguePart2();
        const scene = document.querySelector('#prologuePart2.active [data-card]');
        if (scene?.dataset.card !== step.id) throw new Error('Wrong scene for ' + step.id);
        const images = [...scene.querySelectorAll('.map-story-character-stage img')];
        await Promise.all(images.map(image => image.decode()));
        const stage = scene.querySelector('.map-story-character-stage').getBoundingClientRect();
        const drawn = images.map(image => {
          const rect = image.getBoundingClientRect();
          if (!image.checkVisibility({opacityProperty:true, visibilityProperty:true}) || !image.naturalWidth ||
              Math.min(rect.right, stage.right, innerWidth) <= Math.max(rect.left, stage.left, 0) ||
              Math.min(rect.bottom, stage.bottom, innerHeight) <= Math.max(rect.top, stage.top, 0)) {
            throw new Error('Invisible portrait on ' + step.id + ': ' + image.alt);
          }
          if (image.currentSrc !== new URL(dialoguePortraitUrl(portraits[image.alt]), document.baseURI).href) {
            throw new Error('Incorrect image for ' + image.alt + ' on ' + step.id);
          }
          return image.alt;
        });
        const recent = episode.steps.slice(Math.max(0, index - 4), index + 1)
          .map(previous => previous.speaker).filter(name => portraits[name]);
        rows.push({
          id:step.id, speaker:step.speaker, registered:step.kind === 'dialogue' && !!portraits[step.speaker],
          nameplate:scene.querySelector('.story-scene-nameplate')?.textContent,
          active:images.filter(image => image.classList.contains('is-speaking')).map(image => image.alt),
          cast:step.cast, recent, drawn
        });
      }
    }
    return rows;
  });
}

export function checkDialoguePortraits(rows) {
  for (const row of rows) {
    if (row.cast) {
      assert.deepEqual(row.drawn, row.cast, row.id);
    } else if (row.registered) {
      const partner = row.recent.findLast(name => name !== row.speaker);
      assert.deepEqual([...row.drawn].sort(), [row.speaker, partner].filter(Boolean).sort(), row.id);
    } else {
      assert.deepEqual(row.drawn, [...new Set(row.recent)].slice(-2), row.id);
    }
    if (row.registered) {
      assert.equal(row.nameplate, row.speaker, row.id);
      assert.deepEqual(row.active, [row.nameplate], row.id);
    }
  }

  // Bordo returns after Gnosis, Tobia and Gnosis, then speaks again immediately.
  for (const id of ['pb_08_pre_06', 'pb_08_pre_06a']) {
    const row = rows.find(row => row.id === id);
    assert.deepEqual(row.active, ['ボルド'], id);
    assert.deepEqual([...row.drawn].sort(), ['グノーシス', 'ボルド'], id);
  }
}
