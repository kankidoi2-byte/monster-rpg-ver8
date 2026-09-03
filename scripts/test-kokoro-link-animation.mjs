import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=relativePath=>fs.readFileSync(new URL(`../${relativePath}`,import.meta.url),'utf8');
const view=read('js/battle-view.js');
const css=read('css/ui-redesign.css');
const index=read('index.html');
const notices=read('js/notices-data.js');

const activation=view.slice(view.indexOf('function playKokoroLinkActivationAnimation'),view.indexOf('function kokoroLinkStatusAbilityStateText'));
assert(view.includes('const KOKORO_LINK_ANIMATION_DURATION=600'),'all Kokoro Link activations must use the single 0.6 second duration');
assert(activation.includes("cutIn.className='kokoro-link-cut-in'")&&activation.includes("beam.className='kokoro-link-beam'")&&activation.includes("shock.className='kokoro-link-shock'"),'activation must include one source cut-in, link beam, and compact shock');
assert(activation.includes("title.textContent='ココロリンク！'"),'activation must show the agreed title');
assert(activation.includes("target.classList.add('is-kokoro-link-impact','is-kokoro-linked')"),'activation must impact the target and leave its linked aura visible');
assert(!activation.includes('busy=')&&!activation.includes('await ')&&!activation.includes('disabled='),'the animation must not block battle commands');
assert(view.includes('playKokoroLinkActivationAnimation(source,link);'),'successful activation must launch the animation from the existing one-source flow');
for(const animation of ['kokoroLinkScene','kokoroLinkCutIn','kokoroLinkBeam','kokoroLinkShock','kokoroLinkTitle'])assert(css.includes(`animation:${animation} .6s`),`${animation} must share the 0.6 second presentation`);
assert(css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('kokoroLinkReduced .6s'),'reduced-motion users must receive a calm, equally brief title treatment');
assert(index.includes('kokoro-link-animation-1'),'published assets must be cache-busted');
assert(notices.includes("id: '20260903-kokoro-link-animation'"),'the player-visible animation must have a notice');

console.log('Kokoro Link animation validation passed (single source, 0.6 seconds, non-blocking input, persistent aura, and reduced motion).');
