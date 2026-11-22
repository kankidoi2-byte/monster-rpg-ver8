import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';

function fixture({id='elna_beginner',level=3,exp=0,stock=40,coins=1000}={}){
  const r=runtime();
  for(const file of ['traits-data','traits-rewards'])vm.runInContext(
    fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),r.context,{filename:`js/${file}.js`});
  const {run}=r;
  r.context.console={...console,error(){}};
  r.context.showUiNotice=(message,kind)=>notifications.push([message,kind]);
  const notifications=[];
  run(`save=initSave();save.coins=${coins};save.items.kilo_data=${stock};save.items.mega_data=${stock};save.items.giga_data=${stock};pendingEvolutions=[];
    const actor=addInstance(${JSON.stringify(id)},${level},${exp},{evolutionOffset:0});
    let writes=0,checks=0,progressions=0,fail=false;
    const realCheck=checkEvolution;checkEvolution=ins=>{checks++;realCheck(ins);};
    processNextEvolution=()=>progressions++;
    saveGame=()=>{writes++;return !fail;};`);
  return {run,notifications, json:expr=>JSON.parse(run(`JSON.stringify(${expr})`))};
}

for(const id of ['elna_beginner','freigal']){
  for(const item of ['kilo_data','mega_data','giga_data']){
    const bulk=fixture({id,level:3,exp:179}),separate=fixture({id,level:3,exp:179});
    const award=bulk.run(`expItemGain(actor,ITEM_BY_ID.${item})`);
    if(id==='elna_beginner')assert(award>bulk.run(`ITEM_BY_ID.${item}.expAmount`),'canonical learner trait is included');
    const projected=bulk.json(`previewExpItems(ITEM_BY_ID.${item},actor,6)`);
    assert.equal(bulk.run(`useExpItemOnInstance('${item}',actor.uid,6)`),true);
    for(let i=0;i<6;i++)assert.equal(separate.run(`useExpItemOnInstance('${item}',actor.uid)`),true);
    const after=`[actor.level,actor.exp,save.items.${item}]`;
    assert.deepEqual(bulk.json(after),separate.json(after));
    assert.deepEqual(bulk.json(after),[projected.level,projected.exp,34]);
    assert.deepEqual(bulk.json('[writes,checks]'),[1,1],'one commit and one check even if many levels were crossed');
  }
}

const threshold=fixture({id:'freigal',level:13,exp:759,stock:400});
assert.deepEqual(threshold.json('expItemLimits(ITEM_BY_ID.kilo_data,actor,1)'),{next:0,cap:1},'next shortcut cannot choose an insufficient quantity');
assert.equal(threshold.run('expItemLimits(ITEM_BY_ID.kilo_data,actor,400).next'),2);
assert.equal(threshold.run('previewExpItems(ITEM_BY_ID.kilo_data,actor,1).level'),13);
assert.equal(threshold.run('previewExpItems(ITEM_BY_ID.kilo_data,actor,2).level'),14);
assert.equal(threshold.run("useExpItemOnInstance('kilo_data',actor.uid,2)"),true);
assert.deepEqual(threshold.json('[writes,checks,progressions,pendingEvolutions.length]'),[1,1,1,1],
  'reaching an evolution invokes the original progression once');

const cap=fixture({id:'freigal',level:99,exp:5899,stock:50});
assert.deepEqual(cap.json('expItemLimits(ITEM_BY_ID.kilo_data,actor,50)'),{next:3,cap:3});
assert.equal(cap.run('previewExpItems(ITEM_BY_ID.kilo_data,actor,2).level'),99);
assert.equal(cap.run("useExpItemOnInstance('kilo_data',actor.uid,4)"),false);
assert.deepEqual(cap.json('[actor.level,actor.exp,save.items.kilo_data,writes,checks]'),[99,5899,50,0,0]);
assert.equal(cap.run("useExpItemOnInstance('kilo_data',actor.uid,3)"),true);
assert.deepEqual(cap.json('[actor.level,actor.exp,save.items.kilo_data,writes,checks]'),[100,0,47,1,1]);

const atomic=fixture({level:3,exp:10,stock:12,coins:46});
atomic.run(`const ProloguePart2Events={shopReturnMarkup(){return ''},recordShopPurchase(){save.progress.purchaseChecks=(save.progress.purchaseChecks||0)+1}};
  save.items.attack_potion=2;`);
assert.equal(atomic.run('shopPurchaseLimit(ITEM_BY_ID.attack_potion)'),2);
assert.equal(atomic.run('shopPurchaseLimit(ITEM_BY_ID.attack_potion,1e6)'),99);
assert.equal(atomic.run("buyItem('attack_potion',3)"),false);
assert.deepEqual(atomic.json('[writes,save.coins,save.items.attack_potion]'),[0,46,2]);
const before=atomic.run('JSON.stringify(save)');
atomic.run('fail=true');
assert.equal(atomic.run("buyItem('attack_potion',2)"),false);
assert.equal(atomic.run('JSON.stringify(save)'),before,'failed purchase rolls back inventory, coins, and prologue record');
assert.equal(atomic.run("useExpItemOnInstance('mega_data',actor.uid,5)"),false);
assert.equal(atomic.run('JSON.stringify(save)'),before,'failed EXP use rolls back inventory, level, and EXP');
assert.equal(atomic.run('pendingEvolutions.length'),0);
atomic.run('fail=false');
assert.equal(atomic.run("buyItem('attack_potion',2)"),true);
assert.deepEqual(atomic.json('[writes,save.coins,save.items.attack_potion,save.progress.purchaseChecks]'),[3,6,4,1]);
assert.match(atomic.notifications.at(-1)[0],/2個買った/);
assert.equal(atomic.notifications.at(-1)[1],'success');
console.log('Bulk items: exact repeated-use parity, real trait preview, minimum thresholds, no waste, evolution, affordability, and atomic rollback PASS');
