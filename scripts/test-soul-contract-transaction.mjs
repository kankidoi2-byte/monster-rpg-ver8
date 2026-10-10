import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const read=name=>fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function harness({storage=new Map(),slot=1,profiles=false}={}){
  const elements=new Map(),alerts=[],writes=[],callbacks=[],rankStates=[];
  const fault={key:null,afterWrite:false,read:false},session=new Map([['mb_profile_tab_v1',String(slot)]]);
  let reloads=0;
  const element=id=>{
    if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',scrolls:0,style:{},dataset:{},
      classList:{contains:()=>false,add(){},remove(){}},scrollIntoView(){this.scrolls++;}});
    return elements.get(id);
  };
  const buttons=[1,10].map(count=>({dataset:{characterGachaCount:String(count)},disabled:false}));
  const context=vm.createContext({console,Math:Object.create(Math),Date,JSON,crypto:webcrypto,
    localStorage:{getItem:key=>{if(fault.read)throw Error('read unavailable');return storage.get(key)??null;},
      setItem:(key,value)=>{writes.push(key);if(key===fault.key&&!fault.afterWrite)throw Error('quota');storage.set(key,value);if(key===fault.key)throw Error('after write');},
      removeItem:key=>storage.delete(key)},
    sessionStorage:{getItem:key=>session.get(key)??null,setItem:(key,value)=>session.set(key,value)},
    document:{getElementById:element,querySelectorAll:()=>buttons,querySelector:()=>({id:'characterGacha'}),body:element('body')},
    addEventListener(){},location:{reload(){reloads++;}},alert:text=>alerts.push(text),confirm:()=>false,
    vis:unit=>`<img alt="${unit.name}">`,updateAppResourceBar(){},
    playSoulContractPresentation:(result,onFinish)=>{callbacks.push({result,onFinish});},
  });
  if(profiles)vm.runInContext(read('profiles'),context,{filename:'js/profiles.js'});
  for(const file of ['data','core','save','skills','contractor-rank','character-gacha'])vm.runInContext(read(file),context,{filename:`js/${file}.js`});
  const run=source=>vm.runInContext(source,context);
  context.refreshContractorRankUi=()=>rankStates.push(run('save.contractor.exp'));
  const key=profiles?context.MonsterProfiles.key('mb_v95c'):'mb_v95c';
  return {context,run,storage,key,element,buttons,alerts,writes,callbacks,fault,rankStates,reloads:()=>reloads,
    seed(coins=2000){run(`save=initSave();save.coins=${coins};save.customSoulCompatibility={retained:true};saveGame();`);writes.length=0;},
    finish(index=callbacks.length-1){callbacks[index].onFinish();},
    primaryWrites:()=>writes.filter(k=>k===key).length,
    snapshot:()=>run('JSON.stringify(save)'),
  };
}

// A paid ten-draw commits its exact ordered IDs and all acquisition side effects
// before the cinematic sees a result; skip/finish can never acquire or save again.
{
  const h=harness();h.seed();
  const before=h.run('save.coins');
  const result=h.run('rollCharacterGacha(10)');
  assert(result.ok);assert.equal(h.callbacks.length,1);assert.equal(h.primaryWrites(),1);
  assert.equal(h.run('save.coins'),before-900);
  const saved=JSON.parse(h.storage.get(h.key)),receipt=saved.soulContractReceipt;
  assert.equal(receipt.entries.length,10);assert.equal(saved.instances.length,10);
  assert.deepEqual(receipt.entries.map(x=>x.instanceUid),saved.instances.map(x=>x.uid));
  assert.deepEqual(receipt.entries.map(x=>x.unitId),plain(result.entries.map(x=>x.unit.id)));
  assert.deepEqual(receipt.entries.map(x=>x.isNew),plain(result.entries.map(x=>x.isNew)));
  assert(saved.contractor.exp>0);assert(Object.values(saved.skillCards).some(n=>n>0));
  assert.equal(Object.keys(saved.equippedSkills).length,10);assert(saved.customSoulCompatibility.retained);
  assert(h.buttons.every(button=>button.disabled));
  for(let i=0;i<8;i++)assert.equal(h.run('rollCharacterGacha(10).busy'),true);
  assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),false,'cannot acknowledge an unseen cinematic');
  assert.equal(h.primaryWrites(),1);
  h.finish();h.finish();
  assert.equal((h.element('characterGachaResult').innerHTML.match(/<article/g)||[]).length,10);
  assert.equal(h.primaryWrites(),1,'finish and duplicate finish do not save');
  assert.equal(h.run('save.coins'),1100);
  assert(h.buttons.every(button=>!button.disabled));
  assert.equal(h.run('isCharacterGachaPresenting()'),false);
  assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),true);
  assert.equal(h.primaryWrites(),2);assert.equal(h.run('save.soulContractReceipt'),null);
  assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),false);
  assert.equal(h.primaryWrites(),2,'duplicate acknowledgment is a no-op');
}

// Both pre-reveal and post-result reloads recover the saved receipt without RNG,
// writes, duplicate instances, duplicate cards, or a repeated cinematic.
{
  const h=harness();h.seed();
  const result=h.run('commitCharacterGacha(10,()=>0)');
  assert(result.ok);assert.equal(result.entries.filter(entry=>entry.isNew).length,1);
  assert.equal(result.entries.filter(entry=>entry.instance.locked).length,1);
  assert(result.entries.every(entry=>entry.unit.id==='elna_beginner'));
  const recovered=h.run('recoverCharacterGachaReceipt()');
  assert.deepEqual(plain(recovered.entries.map(entry=>entry.isNew)),[true,...Array(9).fill(false)]);
  assert.equal(h.primaryWrites(),1);assert.equal(h.run('save.coins'),1100);
}
for(const finishFirst of [false,true]){
  const h=harness();h.seed();h.run('rollCharacterGacha(10)');if(finishFirst)h.finish();
  const raw=h.storage.get(h.key),saved=JSON.parse(raw);
  const reloaded=harness({storage:h.storage});
  reloaded.context.Math.random=()=>{throw Error('recovery must not draw');};
  const recovered=reloaded.run('rollCharacterGacha(1)');
  assert(recovered.ok&&recovered.recovered);assert.equal(reloaded.callbacks.length,0);assert.equal(reloaded.primaryWrites(),0);
  assert.deepEqual(plain(recovered.entries.map(x=>x.instance.uid)),saved.soulContractReceipt.entries.map(x=>x.instanceUid));
  assert.equal(reloaded.run('save.coins'),saved.coins);assert.equal(reloaded.run('save.instances.length'),10);
  assert.equal(reloaded.storage.get(h.key),raw);
  reloaded.run('renderCharacterGacha();recoverCharacterGachaReceipt();renderCharacterGacha()');
  assert.equal(reloaded.primaryWrites(),0);assert.equal(reloaded.element('characterGachaResult').scrolls,1);
  assert.deepEqual(plain(reloaded.run('save.skillCards')),saved.skillCards);
  assert.deepEqual(plain(reloaded.run('save.contractor.expEventIds')),saved.contractor.expEventIds);
}

// An explicit next draw can replace a result that was actually rendered, without
// a separate acknowledgment write or rerolling the previous transaction.
{
  const h=harness();h.seed();h.run('rollCharacterGacha(1)');h.finish();
  const first=h.run('save.soulContractReceipt.id');
  h.run('rollCharacterGacha(1)');assert.equal(h.run('save.coins'),1800);assert.equal(h.primaryWrites(),2);
  const second=h.run('save.soulContractReceipt.id');assert.notEqual(first,second);
  h.finish(0);assert.equal(h.run('isCharacterGachaPresenting()'),true,'stale callback cannot finish a later draw');
  h.finish(1);assert.equal(h.run('isCharacterGachaPresenting()'),false);
  assert.equal(h.run('save.instances.length'),2);
}

// Roll back the entire object, not only coins/instances: addInstance grants cards,
// equipment and contractor XP; saveGame can additionally repair arbitrary fields.
{
  const h=harness();h.seed();
  h.run('save.keptReference=undefined;globalThis.originalSave=save;globalThis.originalReport=saveRecoveryReport;');
  const before=h.snapshot(),persisted=h.storage.get(h.key);
  h.fault.key=h.key;
  assert.equal(h.run('rollCharacterGacha(10).ok'),false);
  assert.equal(h.snapshot(),before);assert.equal(h.storage.get(h.key),persisted);
  assert(h.run('save===originalSave&&saveRecoveryReport===originalReport'));
  assert.equal(h.callbacks.length,0);assert.equal(h.run('isCharacterGachaPresenting()'),false);
  assert.equal(h.rankStates.at(-1),h.run('save.contractor.exp'));
  assert.equal(h.run('Object.keys(save.equippedSkills).length'),0);
  assert.equal(h.run('save.contractor.expEventIds.length'),JSON.parse(before).contractor.expEventIds.length);
  h.fault.key=null;assert(h.run('rollCharacterGacha(10).ok'));
  assert.equal(h.run('save.coins'),1100);assert.equal(h.run('save.instances.length'),10);
}

// A thrown acquisition callback or thrown save routine also restores all state.
for(const mode of ['acquisition','save']){
  const h=harness();h.seed();const before=h.snapshot(),persisted=h.storage.get(h.key);
  if(mode==='acquisition')h.run('grantEquippedSkillCardsForInstance=()=>{save.items.potion+=99;throw Error("acquisition fault");}');
  else h.run('saveGame=()=>{save.items.potion+=99;throw Error("save fault");}');
  assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  assert.equal(h.snapshot(),before);assert.equal(h.storage.get(h.key),persisted);
  assert.equal(h.callbacks.length,0);assert.equal(h.primaryWrites(),0);
}

// A write that succeeds before its hook throws is committed, never rolled back.
{
  const h=harness();h.seed();h.fault.key=h.key;h.fault.afterWrite=true;
  assert(h.run('rollCharacterGacha(1).ok'));
  assert.equal(h.run('save.coins'),1900);assert.equal(h.run('save.instances.length'),1);
  assert.equal(h.primaryWrites(),1);assert.equal(h.callbacks.length,1);
  assert.equal(JSON.parse(h.storage.get(h.key)).soulContractReceipt.id,h.run('save.soulContractReceipt.id'));
}

// Failed acknowledgment retains the saved receipt and owned resources. Retrying
// clears only the receipt; an actual next draw still costs exactly once.
{
  const h=harness({profiles:true});h.seed();
  h.run('globalThis.originalAfterSave=MonsterProfiles.afterSave;MonsterProfiles.afterSave=raw=>{originalAfterSave(raw);throw Error("hook fault");}');
  assert(h.run('rollCharacterGacha(1).ok'));
  assert.equal(h.run('save.coins'),1900);assert.equal(h.primaryWrites(),1);
  assert.equal(JSON.parse(h.storage.get(h.key)).soulContractReceipt.id,h.run('save.soulContractReceipt.id'));
}
{
  const h=harness();h.seed();h.run('rollCharacterGacha(1)');h.finish();
  const before=h.snapshot(),raw=h.storage.get(h.key);h.fault.key=h.key;
  assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),false);
  assert.equal(h.snapshot(),before);assert.equal(h.storage.get(h.key),raw);
  h.fault.key=null;assert(h.run('acknowledgeCharacterGachaReceipt()'));
  assert.equal(h.run('save.coins'),1900);assert.equal(h.run('save.instances.length'),1);
  assert.equal(JSON.parse(h.storage.get(h.key)).soulContractReceipt,null);
}

// Late callbacks from an imported/replaced save cannot expose results or clear
// receipts belonging to another save. Recovered consumed/evolved UIDs stay gone.
{
  const h=harness();h.seed();h.run('rollCharacterGacha(1)');
  h.run('save=initSave();save.coins=777;saveGame()');const raw=h.storage.get(h.key);
  h.finish();assert.equal(h.storage.get(h.key),raw);assert.equal(h.run('save.coins'),777);
  assert.equal(h.element('characterGachaResult').innerHTML,'');
  const consumed=harness();consumed.seed();consumed.run('rollCharacterGacha(1)');
  consumed.run('save.instances=[];save.equippedSkills={};saveGame()');
  const reloaded=harness({storage:consumed.storage});reloaded.run('renderCharacterGacha()');
  assert.equal(reloaded.run('save.instances.length'),0);assert.equal(reloaded.primaryWrites(),0);
  assert.equal((reloaded.element('characterGachaResult').innerHTML.match(/<article/g)||[]).length,1);
}

// Malformed/future receipts are retained for export and never silently replaced.
{
  const h=harness();h.seed();h.run('save.soulContractReceipt={version:2,id:"future",entries:[]};saveGame()');
  const before=h.snapshot();assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  assert.equal(h.snapshot(),before);assert.equal(h.callbacks.length,0);
  assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),false);
}

// Even duplicate legacy UID generation must produce a receipt containing the
// canonical repaired UIDs that were committed with the acquired instances.
{
  const h=harness();h.seed();h.run('uid=()=>"forced-collision"');
  assert(h.run('rollCharacterGacha(10).ok'));
  const stored=JSON.parse(h.storage.get(h.key));
  assert.equal(new Set(stored.instances.map(x=>x.uid)).size,10);
  assert.deepEqual(stored.soulContractReceipt.entries.map(x=>x.instanceUid),stored.instances.map(x=>x.uid));
  const reloaded=harness({storage:h.storage});assert(reloaded.run('recoverCharacterGachaReceipt().ok'));
}

// Reject invalid counts / insufficient currency before any durable mutation.
{
  const h=harness();h.seed(99);const before=h.snapshot();
  for(const count of [0,2,1,10])assert.equal(h.run(`rollCharacterGacha(${count}).ok`),false);
  assert.equal(h.snapshot(),before);assert.equal(h.primaryWrites(),0);assert.equal(h.callbacks.length,0);
}

// Profile-specific save keys, real profile-switch guard, and cross-tab conflict
// protection apply to both committing a draw and acknowledging its receipt.
{
  const storage=new Map(),one=harness({storage,profiles:true,slot:1});one.seed();one.run('rollCharacterGacha(1)');
  const firstRaw=storage.get('mb_v95c');
  assert.equal(one.context.MonsterProfiles.switchTo(2),false);assert.equal(one.reloads(),0);
  const two=harness({storage,profiles:true,slot:2});two.seed(3000);
  assert.equal(two.run('save.soulContractReceipt'),undefined);
  two.run('rollCharacterGacha(10)');assert.equal(two.run('save.coins'),2100);
  assert.equal(storage.get('mb_v95c'),firstRaw);assert(storage.has('mb_v95c_profile2'));
  const reloadOne=harness({storage,profiles:true,slot:1});reloadOne.run('renderCharacterGacha()');
  assert.equal(reloadOne.run('save.soulContractReceipt.count'),1);assert.equal(reloadOne.run('save.coins'),1900);
  const reloadTwo=harness({storage,profiles:true,slot:2});reloadTwo.run('renderCharacterGacha()');
  assert.equal(reloadTwo.run('save.soulContractReceipt.count'),10);assert.equal(reloadTwo.run('save.coins'),2100);
  // Another tab acknowledges slot 1. The original tab must not overwrite it.
  assert(reloadOne.run('acknowledgeCharacterGachaReceipt()'));one.finish();
  const newer=storage.get('mb_v95c'),before=one.snapshot();
  assert.equal(one.run('rollCharacterGacha(1).ok'),false);
  assert.equal(one.snapshot(),before);assert.equal(storage.get('mb_v95c'),newer);
  assert.equal(one.run('acknowledgeCharacterGachaReceipt()'),false);
  assert.equal(storage.get('mb_v95c'),newer);
}

// Broken/missing presentation code falls back to the real final list immediately.
for(const mode of ['missing','throws','declines','rejects']){
  const h=harness();h.seed();
  if(mode==='missing')delete h.context.playSoulContractPresentation;
  if(mode==='throws')h.context.playSoulContractPresentation=()=>{throw Error('render fault');};
  if(mode==='declines')h.context.playSoulContractPresentation=()=>false;
  if(mode==='rejects')h.context.playSoulContractPresentation=()=>Promise.reject(Error('async render fault'));
  assert(h.run('rollCharacterGacha(1).ok'));await Promise.resolve();
  assert.equal(h.run('isCharacterGachaPresenting()'),false);
  assert.equal((h.element('characterGachaResult').innerHTML.match(/<article/g)||[]).length,1);
  assert.equal(h.run('save.instances.length'),1);assert.equal(h.primaryWrites(),1);
}

// Rank overlay may not cover an active contract; finishing reschedules normally.
{
  const h=harness();h.seed();
  const source=read('ui'),start=source.indexOf('function contractorRankUpCanPresent(){'),end=source.indexOf('\nfunction ',start+1);
  vm.runInContext(source.slice(start,end),h.context);
  h.element('contractorRankUpOverlay').classList.contains=()=>true;
  assert.equal(h.run('contractorRankUpCanPresent()'),true);
  h.run('rollCharacterGacha(1)');assert.equal(h.run('contractorRankUpCanPresent()'),false);
  h.finish();assert.equal(h.run('contractorRankUpCanPresent()'),true);
}
console.log('Soul Contract transactions: single/ten atomic commits, repeated input, ordered receipts, reload recovery, full side-effect rollback, failed acknowledgments, UID repair, corrupt receipts, profiles/conflicts, and presentation fallbacks passed.');
