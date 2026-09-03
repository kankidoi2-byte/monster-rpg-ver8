import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=relativePath=>fs.readFileSync(new URL(`../${relativePath}`,import.meta.url),'utf8');
const view=read('js/battle-view.js');
const css=read('css/ui-redesign.css');
const index=read('index.html');
const notices=read('js/notices-data.js');

const activation=view.slice(view.indexOf('function playKokoroLinkActivationAnimation'),view.indexOf('function kokoroLinkStatusAbilityStateText'));
assert(view.includes('const KOKORO_LINK_ANIMATION_DURATION=600'),'all Kokoro Link activations must use the single 0.6 second duration');
assert(activation.includes("visual.className='kokoro-link-center-visual'")&&activation.includes("flash.className='kokoro-link-flash'"),'activation must show the selected source large in the center with one strong flash');
assert(activation.includes("title.textContent='ココロリンク！'"),'activation must show the agreed title');
assert(activation.includes('targetCue.textContent=`${link.targetName}へ効果付与`;'),'activation must identify the combat monster receiving the effect');
assert(activation.includes("targetCue.className='kokoro-link-activation-target';"),'target cue must receive its presentation class');
assert(activation.includes("target.classList.add('is-kokoro-link-receive','is-kokoro-linked')"),'activation must flash the receiving target and leave its linked aura visible');
assert(!activation.includes('kokoro-link-cut-in')&&!activation.includes('kokoro-link-beam')&&!activation.includes('kokoro-link-shock'),'the superseded side cut-in, beam, and circular shock must be removed');
assert(!activation.includes('busy=')&&!activation.includes('await ')&&!activation.includes('disabled='),'the animation must not block battle commands');
assert(view.includes('playKokoroLinkActivationAnimation(source,link);'),'successful activation must launch the animation from the existing one-source flow');
for(const animation of ['kokoroLinkScene','kokoroLinkCenter','kokoroLinkFlash','kokoroLinkCopy'])assert(css.includes(`animation:${animation} .6s`),`${animation} must share the 0.6 second presentation`);
assert(!css.includes('.kokoro-link-cut-in')&&!css.includes('.kokoro-link-beam')&&!css.includes('.kokoro-link-shock'),'superseded side-travel effects must not remain in CSS');
assert(css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('kokoroLinkReduced .6s'),'reduced-motion users must receive a calm, equally brief title treatment');
assert(index.includes('kokoro-link-animation-2'),'published assets must be cache-busted');
assert(notices.includes("id: '20260903-kokoro-link-centered-animation'"),'the player-visible correction must have a notice');

console.log('Kokoro Link animation validation passed (large centered source, simultaneous title, strong flash, target cue, 0.6 seconds, non-blocking input, aura, and reduced motion).');
