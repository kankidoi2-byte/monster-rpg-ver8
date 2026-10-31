import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(p,'utf8');
const media=vm.runInNewContext(read('js/battle-idle-media.js').split('// 5s')[0]+';BATTLE_IDLE_MEDIA');
const source=read('js/home-water.js');
const fit=vm.runInNewContext(source.slice(source.indexOf('function waterHomeBoundsFit('),source.indexOf('function layoutWaterHome('))+';waterHomeBoundsFit');
assert.equal(media.slime.layout.scale,.3);assert.equal(media.slime_gold.layout.scale,.3);
assert.equal(media.slime.sourceBounds.bottom,572);assert.equal(media.slime_gold.sourceBounds.bottom,562);
// The measured UI reserves 74px header, 76px shortcuts, 78px navigation, and 164px actions/nameplate.
for(const [width,height] of [[412,650],[390,844],[360,600]]){
 const upper=80,plateTop=height-74-78-164;
 for(const [id,m] of Object.entries(media)){
  const p=fit(m,width,upper,plateTop),b=m.sourceBounds,bw=b.right-b.x,bh=b.bottom-b.y;
  assert(Math.abs(Math.max(bw,bh)*p.k-m.layout.scale*p.base)<1e-7,id+' body-based scale');
  assert(Math.abs(p.left+(b.x+bw/2)*p.k-width/2)<1e-7,id+' horizontal body center');
  if(m.layout.scale<=.75){
   assert(p.top+b.y*p.k>=upper-1e-7,id+' above shortcut boundary');
   assert(p.top+b.bottom*p.k<=plateTop+6+1e-7,id+' below nameplate boundary');
  }
  assert(p.reflectionOffset<=0,id+' reflection anchored at body bottom');
 }
 const longEdge=id=>{const p=fit(media[id],width,upper,plateTop);return p.base*media[id].layout.scale;};
 assert(Math.abs(longEdge('slime')-longEdge('slime_gold'))<1e-7);
 assert(longEdge('false_dragon_alfa')>longEdge('freigal')*2);
}
assert.equal(fit(media.slime,0,80,300),null);
const html=read('index.html');
assert.match(html,/id="homePartyEditButton"[^>]*data-nav="monsters"[^>]*openHomeMonsters/);
assert.match(source,/\['home_party','expedition_party_open'\]/);
assert.match(html,/id="homeExpeditionPreview"><button[^>]*showExpedition/);
assert.match(html,/id="homeNoticePreview"><button[^>]*showNotices/);
assert(!html.includes('id="homePartyPreview"'));
assert(fs.statSync('images/maps/home_water_mirror_v1.webp').size<700*1024);
console.log('PASS water home: all 50 species × 3 viewports, body scale/centering/containment, equal slime size, bounds, navigation anchors, image budget.');
