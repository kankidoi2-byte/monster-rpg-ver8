// Review surface only. Media/network mocked, no actual playback claim.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const {JSDOM,VirtualConsole}=createRequire(import.meta.url)('jsdom');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const pending=[];
const dom=new JSDOM(fs.readFileSync(new URL('../tools/motion-review/asset-review.html',import.meta.url),'utf8'),{
 url:'https://review.test/motion-review.html',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  w.fetch=url=>new Promise(resolve=>pending.push({url,resolve}));
  w.HTMLMediaElement.prototype.pause=function(){this.wasPaused=true;};
  w.HTMLMediaElement.prototype.load=function(){};
  w.HTMLMediaElement.prototype.play=function(){return Promise.resolve();};
 }
});
const w=dom.window,d=w.document,video=d.getElementById('video');
assert.equal(d.querySelectorAll('video').length,1);
assert(video.src.endsWith('/volteck_v4.webm'));
d.getElementById('asset').value='gran_volmoog';d.getElementById('asset').dispatchEvent(new w.Event('change'));
assert(video.wasPaused&&video.src.endsWith('/gran_volmoog_v18.webm'));
pending[1].resolve({ok:true,json:async()=>({candidate:'gran_volmoog'})});
await new Promise(r=>setTimeout(r,0));
pending[0].resolve({ok:true,json:async()=>({candidate:'volteck'})});
await new Promise(r=>setTimeout(r,0));
assert(d.getElementById('evidence').textContent.includes('gran_volmoog'));
d.getElementById('flip').click();assert(video.classList.contains('flip'));
assert.equal(d.getElementById('flip').getAttribute('aria-pressed'),'true');
d.getElementById('background').value='lake';d.getElementById('background').dispatchEvent(new w.Event('change'));
assert(d.getElementById('stage').style.backgroundImage.includes('lake_battle_v1.webp'));
w.dispatchEvent(new w.PageTransitionEvent('pagehide'));assert(!video.hasAttribute('src'));
w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));assert(video.src.endsWith('/gran_volmoog_v18.webm'));
assert.equal(d.querySelectorAll('video').length,1);
dom.window.close();assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS: one lazy video, switch releases media, stale report ignored, flip/background, BFCache re-selection (mocked).');
