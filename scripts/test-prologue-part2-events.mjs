import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const read=file=>fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function harness(){
  const storage=new Map(),alerts=[],presentations=[];let fail=false;
  const c=vm.createContext({console,crypto:webcrypto,Date,Math:Object.create(Math),JSON,
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');storage.set(k,v);},removeItem:k=>storage.delete(k)},
    alert:text=>alerts.push(text),confirm:()=>false,
    document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]},
    showShop(){},prologuePart2Return(){},prologuePart2ShowParty(){},
    playSoulContractPresentation(result,finish){presentations.push(plain(result));finish();},
  });
  for(const file of ['data','core','save','skills','contractor-rank','character-gacha','skill-gacha'])vm.runInContext(read(file),c,{filename:`js/${file}.js`});
  const run=code=>vm.runInContext(code,c);
  run(`save=initSave();save.coins=0;save.prologuePart2={episodes:{}};
    var prologuePart2Ui={replay:false},currentEvent='';
    function prologuePart2Step(){return {id:currentEvent};}
    function prologuePart2EpisodeState(id){return save.prologuePart2.episodes[id]||{};}
    function prologuePart2WritableEpisode(id){return save.prologuePart2.episodes[id]??={};}
    function prologuePart2AdvanceEvent(id,{mutate,onSaved}={}){
      if(currentEvent!==id)return false;
      if(prologuePart2Ui.replay){currentEvent='next';onSaved?.();return true;}
      const ok=commitSaveMutation(()=>{mutate?.();save.prologuePart2.cursor='next';},{requireReadable:true});
      if(ok){currentEvent='next';onSaved?.();}return ok;
    }
    saveGame();`);
  vm.runInContext(read('prologue-part2-events'),c,{filename:'js/prologue-part2-events.js'});
  return {c,run,storage,presentations,alerts,setFail(value){fail=value;},persisted:()=>JSON.parse(storage.get('mb_v95c'))};
}
{
  const h=harness();
  h.run("save.skillCards={s110_001:7,s110_061:4};save.coins=0;currentEvent='synthesis';");
  const before=h.run('JSON.stringify(save)');
  assert.equal(h.run("ProloguePart2Events.synthesize('synthesis')"),false);
  assert.equal(h.run('JSON.stringify(save)'),before,'unselected loans cannot advance or mutate inventory');
  h.run("for(const id of ['s110_001','s110_002','s110_008'])ProloguePart2Events.toggleSynthesisMaterial(id);");
  assert.equal(h.run("ProloguePart2Events.synthesize('synthesis')"),true);
  assert.deepEqual(plain(h.run('save.skillCards')),{s110_001:7,s110_061:5});
  assert.equal(h.run('save.coins'),0);
  assert.equal(h.persisted().prologuePart2.episodes.pb_11.grants.skillSynthesis.resultId,'s110_061');
  assert.equal(h.persisted().prologuePart2.cursor,'next');
  assert.equal(h.run("ProloguePart2Events.synthesize('synthesis')"),false,'double click cannot grant');
  h.run("currentEvent='synthesis';prologuePart2Ui.replay=true;for(const id of ['s110_001','s110_002','s110_008'])ProloguePart2Events.toggleSynthesisMaterial(id);");
  assert.equal(h.run("ProloguePart2Events.synthesize('synthesis')"),true);
  assert.equal(h.run('save.skillCards.s110_061'),5,'replay cannot grant');
}
{
  const h=harness();h.run("currentEvent='synthesis';for(const id of ['s110_001','s110_002','s110_008'])ProloguePart2Events.toggleSynthesisMaterial(id);");
  h.setFail(true);assert.equal(h.run("ProloguePart2Events.synthesize('synthesis')"),false);
  assert.equal(h.run("save.prologuePart2.episodes.pb_11?.grants?.skillSynthesis"),undefined);
  assert.equal(h.run('save.skillCards.s110_061||0'),0);
  h.setFail(false); // Reloaded/interrupted practice regenerates only isolated loans.
  h.run("for(const id of ['s110_001','s110_002','s110_008'])ProloguePart2Events.toggleSynthesisMaterial(id);");
  assert.equal(h.run("ProloguePart2Events.synthesize('synthesis')"),true);
  assert.equal(h.run('save.skillCards.s110_061'),1);
}
{
  const h=harness();h.run("currentEvent='shop';save.coins=100;ProloguePart2Events.openShop('shop');");
  const coins=h.run('save.coins');assert(h.run('ProloguePart2Events.shopReturnMarkup()').includes('物語に戻る'));
  assert(h.run('ProloguePart2Events.finishShop()'));assert.equal(h.run('save.coins'),coins);
  assert.equal(h.run('ProloguePart2Events.shopPurchased()'),false);
  h.run("currentEvent='shop';ProloguePart2Events.openShop('shop');");
  h.setFail(true);assert.equal(h.run('commitSaveMutation(()=>{save.coins-=10;ProloguePart2Events.recordShopPurchase();})'),false);
  assert.equal(h.run('ProloguePart2Events.shopPurchased()'),false,'failed purchase cannot select bought branch');
  h.setFail(false);h.run("ProloguePart2Events.openShop('shop');commitSaveMutation(()=>{save.coins-=10;ProloguePart2Events.recordShopPurchase();});");
  assert.equal(h.run('ProloguePart2Events.shopPurchased()'),true);
  assert.equal(h.persisted().coins,90);
  assert.equal(h.persisted().prologuePart2.episodes.pb_08.shopPurchased,true);
}
{
  const h=harness();h.run("currentEvent='draw';");
  const pool=h.run('characterGachaRates()');
  assert(pool.length>3);assert(Math.abs(pool.reduce((n,r)=>n+r.rate,0)-1)<1e-10);
  const result=h.run("ProloguePart2Events.drawCharacter('draw',()=>0)");
  assert(result.ok);assert.equal(result.entries[0].unit.id,pool[0].unit.id);
  assert.equal(h.run('save.coins'),0);assert.equal(h.run('save.instances.length'),1);
  const stored=h.persisted(),receipt=stored.prologuePart2.episodes.pb_ep.grants.freeCharacter;
  assert.equal(receipt.instanceUid,stored.instances[0].uid);assert.equal(stored.prologuePart2.cursor,'next');
  assert.equal(h.presentations.length,1);assert.equal(h.run("ProloguePart2Events.drawCharacter('draw').ok"),false);
  h.run("currentEvent='draw';prologuePart2Ui.replay=true;");
  const replay=h.run("ProloguePart2Events.drawCharacter('draw',()=>{throw Error('must not reroll');})");
  assert(replay.ok&&replay.recovered);assert.equal(h.run('save.instances.length'),1);
  assert.equal(h.presentations.length,1,'replay does not reacquire or repeat reward animation');
  h.run("prologuePart2Ui.replay=false;currentEvent='draw';");
  assert(h.run("ProloguePart2Events.drawCharacter('draw',()=>{throw Error('must not reroll');}).recovered"));
  assert.equal(h.run('save.instances.length'),1,'saved receipt is authoritative after reload');
}
{
  const h=harness();h.run("addInstance(characterGachaPool()[0].id,1);currentEvent='draw';");
  const result=h.run("ProloguePart2Events.drawCharacter('draw',()=>0)");
  assert(result.ok);assert.equal(result.entries[0].isNew,false);
  assert.equal(h.run('save.instances.length'),2,'duplicates add an ordinary same-form instance');
}
{
  const h=harness();h.run("currentEvent='draw';");h.setFail(true);
  assert.equal(h.run("ProloguePart2Events.drawCharacter('draw',()=>0).ok"),false);
  assert.equal(h.run('save.instances.length'),0);assert.equal(h.presentations.length,0);
  assert.equal(h.run("save.prologuePart2.episodes.pb_ep?.grants?.freeCharacter"),undefined);
  h.setFail(false);assert(h.run("ProloguePart2Events.drawCharacter('draw',()=>0).ok"));
  assert.equal(h.run('save.instances.length'),1);
}
console.log('Prologue events: optional shop branches, three isolated loans, atomic grants, ordinary character pool, duplicate/replay/reload/save-failure PASS');
{
  const h=harness();h.run('save.coins=100;saveGame();commitCharacterGacha(1,()=>0);');
  const beforeReceipt=h.run('JSON.stringify(save.soulContractReceipt)'),beforeJournal=h.run('readCharacterGachaStorage(characterGachaRecoveryKey()).raw');
  h.run("currentEvent='draw';");assert(h.run("ProloguePart2Events.drawCharacter('draw',()=>0.99).ok"));
  assert.equal(h.run('JSON.stringify(save.soulContractReceipt)'),beforeReceipt,'existing paid result preserved');
  assert.equal(h.run('readCharacterGachaStorage(characterGachaRecoveryKey()).raw'),beforeJournal,'normal recovery journal unchanged');
  assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),false);
}
{
  const h=harness(),waiting=[];
  h.c.navigator={locks:{request(name,options,action){assert.equal(options.mode,'exclusive');assert.equal(name,'monster-rpg:character-gacha:mb_v95c');return new Promise(resolve=>waiting.push(()=>resolve(action())));}}};
  h.run("currentEvent='draw';");
  const result=h.run("ProloguePart2Events.drawCharacter('draw',()=>0)");
  assert.equal(h.run('save.instances.length'),0,'RNG/acquisition wait for shared character lock');
  assert.equal(h.run("ProloguePart2Events.drawCharacter('draw').busy"),true);
  waiting.shift()();assert((await result).ok);assert.equal(h.run('save.instances.length'),1);
  h.run("currentEvent='otherDraw';");const stale=h.run("ProloguePart2Events.drawCharacter('otherDraw',()=>{throw Error('cancelled draw must not run');})");
  h.run('prologuePart2Ui={replay:false}');waiting.shift()();assert((await stale).cancelled);
}
{
  const h=harness();vm.runInContext(read('items'),h.c,{filename:'js/items.js'});h.c.updateItems=()=>{};h.c.show=()=>{};
  h.run("currentEvent='shop';save.coins=1000;ProloguePart2Events.openShop('shop');var shopItem=SHOP_ITEMS.find(i=>i.shop!==false&&Number.isFinite(i.price));buyItem(shopItem.id);");
  assert(h.run('ProloguePart2Events.shopPurchased()'));assert(h.persisted().prologuePart2.episodes.pb_08.shopPurchased);
}
console.log('Prologue event integration: normal paid receipt/history preservation, shared draw lock/cancellation and real shop hook PASS');
