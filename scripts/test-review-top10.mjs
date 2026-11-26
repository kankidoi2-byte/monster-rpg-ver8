import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const script=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
for(const slot of [1,2]){
  const key=slot===1?'mb_v95c':'mb_v95c_profile2';
  function load(raw){
    const r=runtime({data:s=>`
        globalThis.crypto={randomUUID:()=>String(Math.random())};
        globalThis.sessionStorage={getItem:()=>'${slot}',setItem(){}};
        localStorage.setItem('${key}',${JSON.stringify(raw)});
        localStorage.setItem('${key}_lastKnownGood','{"coins":777}');
        ${script('js/profiles.js')}
        ${s}`,save:s=>s+'\nglobalThis.originalSaveGame=saveGame;'});
    r.run('saveGame=originalSaveGame;');
    return r;
  }
  const recovered=load('broken');
  assert.equal(recovered.run('save.coins'),777);
  assert(recovered.run('saveGame()'));
  assert.equal(recovered.context.localStorage.getItem(key+'_lastKnownGood'),'{"coins":777}');
  assert.equal(recovered.run('loadSave().coins'),777);
  const future='{"schemaVersion":5, "coins":98765}';
  const newer=load(future);
  assert.equal(newer.run('saveGame()'),false);
  newer.run('resetSave();downloadTextFile=(_name,raw)=>globalThis.exported=raw;exportSaveData()');
  assert.equal(newer.context.exported,future);
  assert.equal(newer.context.localStorage.getItem(key),future);
  assert.equal(newer.context.localStorage.getItem(key+'_lastKnownGood'),'{"coins":777}');
}
for(const metadata of ['{}','{',JSON.stringify({version:1,profiles:[null,null]})]){
  const raw=new Map([['mb_profiles_v1',metadata],['mb_v95c_profile2','untouched']]);
  const ctx=vm.createContext({crypto:webcrypto,console:{error(){}},sessionStorage:{getItem:()=>2},
    localStorage:{getItem:k=>raw.get(k)??null,setItem:()=>assert.fail('unexpected write')}});
  vm.runInContext(script('js/profiles.js'),ctx);
  assert.equal(ctx.MonsterProfiles.current(),null);
  assert.equal(ctx.MonsterProfiles.beforeSave(),false);
  assert.equal(ctx.MonsterProfiles.key('mb_v95c'),'mb_v95c_profile2');
}
const r=runtime({save:s=>s+'\nglobalThis.actualSaveGame=saveGame;'});
r.context.document.addEventListener=()=>{};
r.context.window={addEventListener(){}};
r.context.setInterval=()=>0;
r.context.document.getElementById('giftDialog').addEventListener=()=>{};
for(const file of ['life-quest/rewards.js','js/life-quest.js','js/gifts-data.js','js/gifts.js'])r.run(script(file));
r.run(`
  saveGame=actualSaveGame; save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
  save.history.logs=['<b data-review="injected">probe</b>'];save=repairSave(save); renderShop();
  localStorage.setItem('lifequest_rewards_v1','broken');
  DEV_GIFTS.push({id:'test-isolation',title:'test',letter:'',startAt:'2000-01-01',until:null,rewards:[{kind:'coins',amount:7}]});
`);
assert(!r.run('document.getElementById("shop").innerHTML.includes("<b data-review")'));
assert(r.run('document.getElementById("shop").innerHTML.includes("&lt;b data-review")'));
assert(r.run("commitGiftClaim(['developer:test-isolation'],saveTransactionIdentity(),save).ok"));
assert.equal(r.run("commitGiftClaim(['developer:test-isolation'],saveTransactionIdentity(),save).ok"),false);
assert.equal(r.run("localStorage.getItem('lifequest_rewards_v1')"),'broken');
assert.equal(r.run("save.coins"),7);
assert.equal(r.run(`giftRow({...save.giftHistory[0],source:'developer" data-unsafe="1'},true).includes('data-unsafe')`),false);
console.log('PASS review: backup preservation, future-schema read-only/export in both slots, profile corruption, shop history, gift isolation and attributes.');

// Two independent page closures use one storage area and one exclusive lock.
const html=script('life-quest/index.html');
const inline=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const shared=new Map(), storage={getItem:k=>shared.get(k)??null,setItem:(k,v)=>shared.set(k,v)};
let tail=Promise.resolve();
const locks={request(_key,fn){const result=tail.then(fn);tail=result.catch(()=>{});return result;}};
function tab(){
  const c=vm.createContext({localStorage:storage,navigator:{locks},window:{addEventListener(){}},
    document:{addEventListener(){},getElementById(){return {remove(){}}}},setInterval(){}});
  vm.runInContext(script('life-quest/rewards.js'),c);
  vm.runInContext(inline.replace(/render\(\);\s*\}\)\(\);\s*$/, 'globalThis.qa={changeState,parseState};})();'),c);
  return c.qa;
}
const a=tab(),b=tab(),q={id:'q1',cat:'str',nm:'walk',unit:'分',per:5,step:1,exp:20,cost:2};
const key='lifequest.v1';
await Promise.all([a.changeState(s=>{s.quests.push(q);return s;}),
  b.changeState(s=>{s.quests.push({...q,id:'q2'});return s;})]);
assert.equal(JSON.parse(storage.getItem(key)).quests.length,2);
const date='2026-11-03';
const increment=s=>{const day=s.hist[date]??={};day.q1=(day.q1||0)+1;return s;};
const previous=storage.getItem(key);
await Promise.all([a.changeState(increment),b.changeState(increment)]);
assert.equal(JSON.parse(storage.getItem(key)).hist[date].q1,2);
assert.equal(await a.changeState(()=>JSON.parse(previous),{expected:previous,replace:true}),false);
const valid=storage.getItem(key);
for(const override of [{unit:'<img>'},{per:0},{exp:1e300},{id:'" onclick="bad'},{cat:'__proto__'}]){
  const s=JSON.parse(valid);Object.assign(s.quests[0],override);
  assert.throws(()=>a.parseState(JSON.stringify(s)));
  assert.equal(storage.getItem(key),valid);
}
assert.throws(()=>a.parseState(JSON.stringify({quests:[q],hist:{'bad-date':{q1:1}}})));
console.log('PASS Life Quest: invalid backup rejected, bounded EXP, additive writes in two tabs, stale replacement rejected.');
