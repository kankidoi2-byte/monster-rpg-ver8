import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const r=runtime();
const run=source=>r.run(source);
const payload='<img src=x onerror="globalThis.__xss=1">';
r.context.payload=payload;
run(`var archetype=ALCHEMY_MONSTER_CONFIGS.galdra.archetypes[0];
  var fixture={instances:[{uid:'test_member',id:'galdra',level:1,exp:0,alchemy:{archetypeId:archetype.id,archetypeLabel:payload,statModifiers:{...archetype.modifiers}}}],party:[],coins:100,items:{}};
  var prepared=parseAndPrepareSave(JSON.stringify(fixture),[]);var ins=prepared.instances[0];normalizeInstanceSaveFields(ins);`);
assert.equal(run('ins.alchemy.archetypeLabel'),run('archetype.label'),'A: load repair replaces the untrusted label');
assert(!run('instanceAlchemySummary(ins)').includes('<img'),'A: no injected HTML tag');
assert(run('instanceAlchemySummary(ins)').includes(run('archetype.label')),'A: configuration label is shown');
run('ins.alchemy.archetypeLabel=payload;');
assert(!run('instanceAlchemySummary(ins)').includes('<img'),'A: display never trusts a stored label even after normalization');
run("ins.alchemy.archetypeId='not-a-real-type';normalizeInstanceSaveFields(ins);");
assert(run('instanceAlchemySummary(ins)').includes('不明な錬成タイプ'),'A: unknown archetype gets fixed label');
assert(!run('instanceAlchemySummary(ins)').includes('<img'));
console.log('PASS SEC-01 A: parse, normalization, direct display and unknown archetype');

run(`var entry={id:'exp_abc_1234',mapId:'grassland',distanceId:'short',memberUids:['test_member'],progress:1,requiredWins:1,status:'complete',reward:{coins:24,exp:18,items:{monster_bone:1},great:false},suitability:{grade:'D',total:0,greatRate:0,reasons:[]}};`);
r.context.badId="x');globalThis.__xss=1;//";
run(`fixture.expeditions={completedCount:0,active:[{...entry,id:badId}]};prepared=parseAndPrepareSave(JSON.stringify(fixture),[]);`);
assert.equal(run('prepared.expeditions.active.length'),0,'B: unsafe expedition ID quarantined');
assert.equal(run('prepared.quarantine.invalidExpeditions[0].id'),r.context.badId,'B: original ID retained in quarantine');
assert.equal(r.context.__xss,undefined,'B: payload is not executed');
console.log('PASS SEC-02 B: injected expedition ID quarantined');

run(`fixture.expeditions.active=[structuredClone(entry)];fixture.expeditions.active[0].reward.items={[payload]:1,monster_bone:2.9,magic_crystal:-3};prepared=parseAndPrepareSave(JSON.stringify(fixture),[]);`);
assert.equal(run('prepared.expeditions.active.length'),1,'C: valid expedition is retained');
assert.equal(run('Object.hasOwn(prepared.expeditions.active[0].reward.items,payload)'),false,'C: unknown reward ID removed');
assert.equal(run('prepared.expeditions.active[0].reward.items.monster_bone'),2,'C: fractional count rounded down');
assert.equal(run('prepared.expeditions.active[0].reward.items.magic_crystal'),0,'C: negative count clamped');
assert(!run('expeditionRewardText(prepared.expeditions.active[0].reward)').includes('<img'),'C: repaired display has no tag');
assert(!run('expeditionRewardText({coins:payload,exp:payload,items:{[payload]:payload}})').includes('<img'),'C: runtime fallback and scalar fields are also escaped');
for(const invalidItems of [[payload],payload]){
  r.context.invalidItems=invalidItems;
  run('fixture.expeditions.active=[structuredClone(entry)];fixture.expeditions.active[0].reward.items=invalidItems;prepared=parseAndPrepareSave(JSON.stringify(fixture),[]);');
  assert.equal(run('prepared.expeditions.active.length'),1,'C: invalid items container does not discard an otherwise valid expedition');
  assert.equal(run('JSON.stringify(prepared.expeditions.active[0].reward.items)'),'{}','C: array/string items container is cleared');
  assert(!run('expeditionRewardText(prepared.expeditions.active[0].reward)').includes('<img'),'C: invalid items container cannot inject display HTML');
}
console.log('PASS SEC-02 C: unknown rewards removed, counts normalized, runtime display escaped');

// A small DOM adapter captures the actual listeners installed on rendered buttons.
// Attribute entity decoding matches HTML parsing; no handler is fabricated by the test.
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const root=r.elements.get('expeditionContent')||r.context.document.getElementById('expeditionContent');
let buttons=[];
Object.defineProperty(root,'innerHTML',{get(){return this.html||'';},set(html){this.html=html;buttons=[...html.matchAll(/<button\b([^>]*)>/g)].map(([,attrs])=>{
  const dataset={};for(const [,key,value] of attrs.matchAll(/data-([a-z-]+)="([^"]*)"/g))dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=decode(value);
  const handlers={};return {dataset,attrs,addEventListener(type,fn){handlers[type]=fn;},click(){assert(handlers.click,'render must install click listener');handlers.click({currentTarget:this,target:this});}};
});}});
root.querySelectorAll=selector=>buttons.filter(b=>b.dataset.expeditionId!==undefined);
run(`save=initSave();save.progress.tutorial.status='completed';save.coins=100;
 var member=addInstance('freigal',1),fighter=addInstance('aquaron',1);save.party=[fighter.uid];
 renderPartySetup=()=>{};checkEvolution=()=>{};expeditionSelectedMapId='grassland';expeditionSelectedDistanceId='short';expeditionSelectedUids=[member.uid];`);
assert.equal(run('startExpedition()'),true,'D: normal dispatch succeeds');
const generatedId=run('save.expeditions.active[0].id');
run('prepared=parseAndPrepareSave(JSON.stringify(save),[]);');
assert.equal(run('prepared.expeditions.active[0].id'),generatedId,'D: generated ID survives validation');
run('progressActiveExpeditions(()=>.99,{saveNow:false});var reward=structuredClone(save.expeditions.active[0].reward);var coinsBefore=save.coins,expBefore=member.exp;renderExpedition();');
let button=buttons.find(b=>b.dataset.expeditionId===generatedId);
assert(button,'D: completed expedition button exists');assert(!/\bonclick=/.test(button.attrs),'D: no inline handler on reward button');button.click();
assert.equal(run('save.expeditions.active.length'),0,'D: claim frees slot');
assert.equal(run('save.expeditions.completedCount'),1,'D: one completion');
assert.equal(run('save.coins-coinsBefore'),run('reward.coins'),'D: normal coin reward');
assert.equal(run('member.exp-expBefore'),run('reward.exp'),'D: normal member EXP');
for(const [id,count] of Object.entries(run('reward.items')))assert.equal(run(`save.items[${JSON.stringify(id)}]`),count,'D: normal item reward');
button.click();assert.equal(run('save.expeditions.completedCount'),1,'D: repeated click cannot duplicate claim');
run(`expeditionSelectedDistanceId='medium';expeditionSelectedUids=[member.uid];startExpedition();progressActiveExpeditions(()=>.99,{saveNow:false});var recallId=save.expeditions.active[0].id;coinsBefore=save.coins;expBefore=member.exp;Math.random=()=>.99;renderExpedition();`);
button=buttons.find(b=>b.dataset.expeditionId===run('recallId'));
assert(button,'D: active expedition button exists');assert(!/\bonclick=/.test(button.attrs),'D: no inline handler on recall button');button.click();
assert.equal(run('save.expeditions.active.length'),0,'D: recall frees slot');
assert.equal(run('isInstanceOnExpedition(member.uid)'),false,'D: recall unlocks member');
assert.equal(run('save.coins-coinsBefore'),8,'D: recall grants 50% of completed progress coins');
assert.equal(run('member.exp-expBefore'),6,'D: recall grants 50% of completed progress EXP');
assert.equal(r.context.__xss,undefined);
console.log('PASS SEC-02 D: generated ID, dispatch, rendered-button claim/recall, rewards and released slots');

run(`ins=structuredClone(fixture.instances[0]);ins.alchemy.archetypeLabel=archetype.label;normalizeInstanceSaveFields(ins);`);
const summary=run('instanceAlchemySummary(ins)');
assert(summary.includes(run('archetype.label')),'E: normal type name unchanged');
const mods=run('archetype.modifiers');
for(const stat of ['hp','attack','speed']){
 const value=mods[stat];assert(summary.includes(`${value>=1?'+':''}${Math.round((Number(value||1)-1)*100)}%`),'E: correction percentage unchanged');
}
console.log('PASS SEC-01 E: legitimate type name and correction percentages unchanged');
