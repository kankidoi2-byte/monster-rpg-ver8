import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const read=name=>fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function queuedWebLocks(){
  const waiting=[],held=new Set(),names=[];
  return {
    waiting,names,
    request(name,options,callback){
      assert.equal(options.mode,'exclusive');names.push(name);
      return new Promise((resolve,reject)=>waiting.push({name,callback,resolve,reject}));
    },
    async grant(index=0){
      const request=waiting.splice(index,1)[0];assert(request);assert(!held.has(request.name));held.add(request.name);
      try{request.resolve(await request.callback({name:request.name,mode:'exclusive'}));}
      catch(error){request.reject(error);}
      finally{held.delete(request.name);}
      await Promise.resolve();
    }
  };
}
function harness({storage=new Map(),slot=1,profiles=false}={}){
  const elements=new Map(),alerts=[],writes=[],callbacks=[],rankStates=[],listeners=new Map(),downloads=[];
  const fault={key:null,afterWrite:false,read:false,remove:null},session=new Map([['mb_profile_tab_v1',String(slot)]]);
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
      removeItem:key=>{if(fault.remove===key)throw Error('remove denied');storage.delete(key);}},
    sessionStorage:{getItem:key=>session.get(key)??null,setItem:(key,value)=>session.set(key,value)},
    document:{getElementById:element,querySelectorAll:()=>buttons,querySelector:()=>({id:'characterGacha'}),body:element('body')},
    addEventListener(type,listener){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(listener);},location:{reload(){reloads++;}},alert:text=>alerts.push(text),confirm:()=>false,
    vis:unit=>`<img alt="${unit.name}">`,updateAppResourceBar(){},
    playSoulContractPresentation:(result,onFinish)=>{callbacks.push({result,onFinish});},
  });
  if(profiles)vm.runInContext(read('profiles'),context,{filename:'js/profiles.js'});
  for(const file of ['data','core','save','skills','contractor-rank','character-gacha'])vm.runInContext(read(file),context,{filename:`js/${file}.js`});
  const run=source=>vm.runInContext(source,context);
  context.refreshContractorRankUi=()=>rankStates.push(run('save.contractor.exp'));
  context.downloadTextFile=(name,text)=>downloads.push({name,text});
  const key=profiles?context.MonsterProfiles.key('mb_v95c'):'mb_v95c';
  return {context,run,storage,key,element,buttons,alerts,writes,callbacks,fault,rankStates,downloads,reloads:()=>reloads,
    emitStorage(key){for(const listener of listeners.get('storage')||[])listener({key,newValue:storage.get(key)??null});},
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

// Same-origin browser tabs serialize before the baseline re-read, not merely
// before setItem. The losing tab never consumes RNG, currency, cards, or units.
{
  const storage=new Map(),first=harness({storage,profiles:true});first.seed();
  const second=harness({storage,profiles:true}),locks=queuedWebLocks();
  first.context.navigator={locks};second.context.navigator={locks};
  const secondBefore=second.snapshot();second.context.Math.random=()=>{throw Error('conflicted draw must not roll');};
  const one=first.run('rollCharacterGacha(1)'),two=second.run('rollCharacterGacha(10)');
  assert.equal(locks.waiting.length,2);assert.equal(first.run('rollCharacterGacha(1).busy'),true);
  assert.equal(first.context.MonsterProfiles.switchTo(2),false,'pending lock blocks profile switching');
  assert(first.buttons.every(button=>button.disabled));assert.equal(first.primaryWrites(),0);
  assert.deepEqual(locks.names,['monster-rpg:character-gacha:mb_v95c','monster-rpg:character-gacha:mb_v95c']);
  await locks.grant();assert((await one).ok);assert.equal(first.primaryWrites(),1);
  assert.equal(first.run('isCharacterGachaPresenting()'),true,'lock released before the cinematic finishes');
  const committed=storage.get(first.key);
  await locks.grant();assert.equal((await two).ok,false);
  assert.equal(second.primaryWrites(),0);assert.equal(second.callbacks.length,0);
  assert.equal(second.snapshot(),secondBefore);assert.equal(storage.get(first.key),committed);
  assert.equal(second.run('isCharacterGachaPresenting()'),false);
  first.finish();
}

// Receipt acknowledgment uses that same lock, so it cannot overwrite a draw
// committed by another tab between its conflict check and final storage write.
{
  const h=harness({profiles:true});h.seed();h.run('rollCharacterGacha(1)');h.finish();
  const locks=queuedWebLocks();h.context.navigator={locks};const before=h.primaryWrites();
  const result=h.run('acknowledgeCharacterGachaReceipt()');
  assert.equal(h.primaryWrites(),before);assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),false);
  await locks.grant();assert.equal(await result,true);assert.equal(h.primaryWrites(),before+1);
  assert.equal(h.run('save.soulContractReceipt'),null);assert.equal(h.run('save.coins'),1900);
}
{
  const storage=new Map(),seed=harness({storage,profiles:true});seed.seed();seed.run('rollCharacterGacha(1)');seed.finish();
  const drawer=harness({storage,profiles:true}),acknowledger=harness({storage,profiles:true}),locks=queuedWebLocks();
  for(const tab of [drawer,acknowledger]){tab.run('renderCharacterGacha()');tab.context.navigator={locks};}
  const draw=drawer.run('rollCharacterGacha(1)'),ack=acknowledger.run('acknowledgeCharacterGachaReceipt()');
  assert.equal(locks.waiting.length,2);await locks.grant();assert((await draw).ok);
  const committed=storage.get(drawer.key);await locks.grant();assert.equal(await ack,false);
  assert.equal(storage.get(drawer.key),committed);assert.equal(JSON.parse(committed).instances.length,2);
  assert.equal(acknowledger.primaryWrites(),0);
}

// Different profile slots use distinct lock names, and queued work is cancelled
// if an import replaces the owning save before its lock is acquired.
{
  const storage=new Map(),one=harness({storage,profiles:true,slot:1}),two=harness({storage,profiles:true,slot:2}),locks=queuedWebLocks();
  one.seed();two.seed();one.context.navigator={locks};two.context.navigator={locks};
  const first=one.run('rollCharacterGacha(1)'),second=two.run('rollCharacterGacha(1)');
  assert.notEqual(locks.names[0],locks.names[1]);assert(locks.names[1].endsWith('mb_v95c_profile2'));
  one.run('save=initSave();save.coins=555;');const replacement=one.snapshot();
  await locks.grant();assert.equal((await first).ok,false);assert.equal(one.snapshot(),replacement);
  assert.equal(one.primaryWrites(),0);await locks.grant();assert((await second).ok);
}

// Leaving the gacha screen while its lock is queued cancels without charging.
{
  const h=harness();h.seed();const locks=queuedWebLocks();h.context.navigator={locks};
  const before=h.snapshot(),pending=h.run('rollCharacterGacha(1)');
  h.run('cancelPendingCharacterGacha()');await locks.grant();
  assert.equal((await pending).ok,false);assert.equal(h.snapshot(),before);
  assert.equal(h.primaryWrites(),0);assert.equal(h.callbacks.length,0);
  assert.equal(h.run('isCharacterGachaPresenting()'),false);
  assert(read('ui').includes("if(id!=='characterGacha'&&typeof cancelPendingCharacterGacha==='function')cancelPendingCharacterGacha();"));
}

// Browsers without Web Locks (or denied/rejected lock acquisition) must fail
// closed. No silently unlocked browser fallback is allowed.
for(const mode of ['unavailable','throws','rejects']){
  const h=harness();h.seed();const before=h.snapshot();
  h.context.navigator=mode==='unavailable'?{}:{locks:{request(){
    if(mode==='throws')throw Error('lock access denied');
    return Promise.reject(Error('lock unavailable'));
  }}};
  assert.equal((await h.run('rollCharacterGacha(1)')).ok,false);
  assert.equal(h.snapshot(),before);assert.equal(h.primaryWrites(),0);assert.equal(h.callbacks.length,0);
  assert.equal(h.run('isCharacterGachaPresenting()'),false);assert(h.alerts.length>0);
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

// Exact finalized before/after snapshots are independently durable before the
// primary write, and acknowledgment keeps a continuity marker and recovery copy.
{
  const h=harness();h.seed();const before=JSON.parse(h.snapshot()),set=h.context.localStorage.setItem;
  const recoveryKey=h.run('characterGachaRecoveryKey()');let verifiedBeforeWrite=false;
  h.context.localStorage.setItem=(key,raw)=>{
    if(key===h.key){const recovery=JSON.parse(h.storage.get(recoveryKey));
      assert.equal(recovery.status,'prepared');assert.equal(JSON.stringify(recovery.after),raw);
      assert.deepEqual(recovery.before,before);verifiedBeforeWrite=true;}
    return set(key,raw);
  };
  assert(h.run('rollCharacterGacha(1).ok'));assert(verifiedBeforeWrite);h.finish();
  h.context.localStorage.setItem=set;
  const recordRaw=h.storage.get(recoveryKey),record=JSON.parse(recordRaw),marker=h.run('save.soulContractAppliedId');
  assert.equal(record.id,marker);assert.equal(record.status,'committed');assert.equal(record.previous,null);
  assert.equal(JSON.stringify(record.after),h.storage.get(h.key));
  assert(h.run('acknowledgeCharacterGachaReceipt()'));assert.equal(h.run('save.soulContractAppliedId'),marker);
  assert.equal(h.storage.get(recoveryKey),recordRaw,'acknowledgment cannot remove the only recovery copy');
  // Deliberately consume every acquired instance and progress other resources.
  h.run('save.instances=[];save.equippedSkills={};save.coins+=17;save.items.potion+=2;saveGame()');
  assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),false,'legitimate recycling/evolution is identified by marker, not old UIDs');
  assert.equal(h.run('save.instances.length'),0);
}

// Recovery quota/read errors refuse a new paid draw. A primary failure restores
// the previous envelope exactly, or removes a first prepared record safely.
{
  const h=harness();h.seed();const before=h.snapshot(),recoveryKey=h.run('characterGachaRecoveryKey()');
  h.fault.key=recoveryKey;assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  assert.equal(h.snapshot(),before);assert.equal(h.primaryWrites(),0);assert.equal(h.callbacks.length,0);
  assert.equal(h.storage.has(recoveryKey),false);
  h.fault.key=h.key;assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  assert.equal(h.storage.has(recoveryKey),false);assert.equal(h.snapshot(),before);
  h.fault.key=null;h.fault.read=true;assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  h.fault.read=false;assert.equal(h.snapshot(),before);
  assert(h.run('rollCharacterGacha(1).ok'));h.finish();
  const prior=h.storage.get(recoveryKey),priorMain=h.storage.get(h.key),priorLive=h.snapshot();h.fault.key=h.key;
  assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  assert.equal(h.storage.get(recoveryKey),prior);assert.equal(h.storage.get(h.key),priorMain);
  assert.equal(h.snapshot(),priorLive);assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),false);
}

// Failed cleanup is explicit and fail-closed. Both snapshots can be exported,
// but neither is automatically applied and the failed draw never grants units.
{
  const h=harness();h.seed();const before=h.snapshot(),recoveryKey=h.run('characterGachaRecoveryKey()');
  h.fault.key=h.key;h.fault.remove=recoveryKey;
  assert.equal(h.run('rollCharacterGacha(1).ok'),false);assert.equal(h.snapshot(),before);
  assert.equal(JSON.parse(h.storage.get(recoveryKey)).status,'failed');
  assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),true);
  h.fault.key=null;h.fault.remove=null;
  const writes=h.writes.length;assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),false);
  assert.equal(h.run('exportCharacterGachaRecovery()'),true);assert.equal(h.run('exportCharacterGachaRecovery("before")'),true);
  assert.equal(JSON.parse(h.downloads[0].text).instances.length,1);assert.equal(JSON.parse(h.downloads[1].text).instances.length,0);
  assert.equal(h.writes.length,writes);assert.equal(h.snapshot(),before);
}

// If another writer changes primary during a failed commit, cleanup may not
// discard the staged evidence even though no successful main write was proven.
{
  const h=harness();h.seed();const before=h.snapshot();
  const other=JSON.parse(h.storage.get(h.key));other.items.potion+=1;
  h.context.otherPrimary=JSON.stringify(other);
  h.run('globalThis.actualStorageSet=safeStorageSet;safeStorageSet=(key,raw)=>{if(key===SAVE_KEY){localStorage.setItem(SAVE_KEY,otherPrimary);return false;}return actualStorageSet(key,raw);};');
  assert.equal(h.run('rollCharacterGacha(1).ok'),false);assert.equal(h.snapshot(),before);
  const record=JSON.parse(h.storage.get(h.run('characterGachaRecoveryKey()')));
  assert.equal(record.status,'failed');assert.equal(record.after.instances.length,1);
  assert.equal(h.storage.get(h.key),h.context.otherPrimary);assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),true);
}

// A successful primary write plus a throwing hook and transient proof-read
// failure is uncertain, not a proven refund. Keep recovery evidence and use
// accurate fail-closed wording without touching the committed durable save.
{
  const h=harness({profiles:true});h.seed();
  const after=h.context.MonsterProfiles.afterSave,get=h.context.localStorage.getItem;let failProof=false;
  h.context.MonsterProfiles.afterSave=raw=>{after(raw);failProof=true;throw Error('afterSave hook fault');};
  h.context.localStorage.getItem=key=>{if(key===h.key&&failProof){failProof=false;throw Error('transient readback failure');}return get(key);};
  const result=h.run('rollCharacterGacha(1)');assert.equal(result.ok,false);assert(result.recovery);
  assert.match(result.error,/保存状態を確認できない/);assert.doesNotMatch(result.error,/契約前の状態に戻しました/);
  assert.equal(h.run('save.coins'),2000);assert.equal(JSON.parse(h.storage.get(h.key)).coins,1900);
  const record=JSON.parse(h.storage.get(h.run('characterGachaRecoveryKey()')));
  assert.equal(record.status,'failed');assert.equal(record.after.instances.length,1);
}

// Optional compaction may fail without sacrificing the already verified backup.
// Even repeated compaction failures retain only one prior envelope, never a chain.
{
  const h=harness();h.seed();const recoveryKey=h.run('characterGachaRecoveryKey()'),set=h.context.localStorage.setItem;
  h.context.localStorage.setItem=(key,raw)=>{
    if(key===recoveryKey&&JSON.parse(raw).status==='committed')throw Error('compaction quota');
    return set(key,raw);
  };
  let previousId=null;
  for(let n=0;n<3;n++){
    assert(h.run('rollCharacterGacha(1).ok'));h.finish();
    const record=JSON.parse(h.storage.get(recoveryKey));assert.equal(record.status,'prepared');
    assert.equal(record.previous?.id??null,previousId);assert.equal(record.previous?.previous,undefined);
    assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),false);previousId=record.id;
  }
  assert.equal(h.primaryWrites(),3);assert.equal(h.run('save.instances.length'),3);
}

// Reproduce the real mixed-writer race: ordinary tab B has already read its old
// baseline when A commits. B's non-locking save then overwrites the new primary.
// The independent contract snapshot survives, blocks more draws and exports
// exactly, while B's current primary and each tab's live state remain untouched.
{
  const storage=new Map(),a=harness({storage,profiles:true});a.seed();
  const b=harness({storage,profiles:true}),get=b.context.localStorage.getItem;
  let reads=0,aResult=null;
  b.context.localStorage.getItem=key=>{
    const captured=get(key);
    if(key===b.key&&++reads===3)aResult=a.run('commitCharacterGacha(1,()=>0)');
    return captured;
  };
  assert.equal(b.run('save.items.potion+=1;saveGame()'),true);assert(aResult?.ok);
  const rawB=storage.get(b.key),primaryB=JSON.parse(rawB),key=a.run('characterGachaRecoveryKey()'),backup=JSON.parse(storage.get(key));
  assert.equal(primaryB.coins,2000);assert.equal(primaryB.instances.length,0);assert.equal(primaryB.soulContractAppliedId,undefined);
  assert.equal(backup.after.coins,1900);assert.equal(backup.after.instances.length,1);
  assert.equal(backup.after.instances[0].uid,aResult.entries[0].instance.uid);
  assert.equal(backup.id,backup.after.soulContractAppliedId);
  assert.equal(a.run('inspectCharacterGachaRecovery().blocked'),true);assert.equal(b.run('inspectCharacterGachaRecovery().blocked'),true);
  a.emitStorage(a.key);assert.match(a.element('characterGachaResult').innerHTML,/契約時のセーブを書き出す/);
  assert(a.buttons.every(button=>button.disabled));
  const liveA=a.snapshot(),liveB=b.snapshot(),allStored=JSON.stringify([...storage]);
  for(const tab of [a,b]){
    assert.equal(tab.run('rollCharacterGacha(1).ok'),false);assert.equal(tab.run('rollCharacterGacha(10).ok'),false);
    assert.equal(tab.run('acknowledgeCharacterGachaReceipt()'),false);
    assert(tab.run('exportCharacterGachaRecovery()'));assert.deepEqual(JSON.parse(tab.downloads.at(-1).text),backup.after);
    assert(tab.run('exportCharacterGachaRecovery("current")'));
    assert.equal(tab.downloads.at(-1).text,rawB,'current export contains durable B history, not stale A memory');
  }
  assert.equal(a.snapshot(),liveA);assert.equal(b.snapshot(),liveB);assert.equal(storage.get(a.key),rawB);
  assert.equal(JSON.stringify([...storage]),allStored,'export/recovery must be read-only');
  const reload=harness({storage,profiles:true});reload.run('renderCharacterGacha()');
  assert.equal(reload.run('save.instances.length'),0);assert.equal(reload.run('rollCharacterGacha(1).ok'),false);
  const other=harness({storage,profiles:true,slot:2});other.seed();
  assert.notEqual(other.run('characterGachaRecoveryKey()'),key);assert(other.run('rollCharacterGacha(1).ok'));
  assert.equal(storage.get(a.key),rawB);assert.equal(JSON.parse(storage.get(key)).id,backup.id);
}

// A crash after preparation but before primary commitment is ambiguous. The old
// primary equalling the before snapshot is not permission to auto-apply a draw.
{
  const h=harness();h.seed();const before=h.storage.get(h.key);h.run('rollCharacterGacha(1)');
  const key=h.run('characterGachaRecoveryKey()'),record=JSON.parse(h.storage.get(key));record.status='prepared';
  h.storage.set(key,JSON.stringify(record));h.storage.set(h.key,before);
  const reload=harness({storage:h.storage});const live=reload.snapshot(),writes=reload.writes.length;
  reload.run('renderCharacterGacha()');assert.equal(reload.run('rollCharacterGacha(1).ok'),false);
  assert.equal(reload.snapshot(),live);assert.equal(reload.writes.length,writes);assert.equal(reload.run('save.instances.length'),0);
}

// A legitimate export/import on a fresh device has no companion record. Only
// explicit confirmation may establish an imported-current baseline; original
// contract history is not fabricated, and primary/economy/RNG are untouched.
for(const acknowledge of [false,true]){
  const original=harness();original.seed();original.run('rollCharacterGacha(1)');original.finish();
  if(acknowledge){original.run('acknowledgeCharacterGachaReceipt();save.instances=[];save.equippedSkills={};save.coins+=23;saveGame()');}
  const importedRaw=original.storage.get(original.key),storage=new Map([['mb_v95c',importedRaw]]),h=harness({storage});
  const before=h.snapshot(),key=h.run('characterGachaRecoveryKey()');
  assert.equal(h.run('inspectCharacterGachaRecovery().canEstablishBaseline'),true);
  assert.equal(h.run('rollCharacterGacha(1).ok'),false);
  assert.equal(h.run('establishCharacterGachaRecoveryBaseline()'),false,'cancel makes no writes');
  assert.equal(storage.has(key),false);assert.equal(h.primaryWrites(),0);
  h.context.confirm=()=>true;h.context.Math.random=()=>{throw Error('baseline cannot draw');};
  h.fault.key=key;assert.equal(h.run('establishCharacterGachaRecoveryBaseline()'),false);
  assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),true);assert.equal(storage.has(key),false);
  h.fault.key=null;assert.equal(h.run('establishCharacterGachaRecoveryBaseline()'),true);
  assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),false);
  const baseline=JSON.parse(storage.get(key));assert.equal(baseline.status,'baseline');
  assert.equal(JSON.stringify(baseline.after),importedRaw);assert.equal(h.snapshot(),before);
  assert.equal(storage.get(h.key),importedRaw);assert.equal(h.primaryWrites(),0);
  assert.equal(h.run('establishCharacterGachaRecoveryBaseline()'),false,'existing records cannot be reset');
}

// Missing-record confirmation cannot excuse a mismatched marker, replace a
// corrupt/failed/divergent existing envelope, or bleed between profile slots.
{
  const original=harness();original.seed();original.run('rollCharacterGacha(1)');original.finish();
  const raw=original.storage.get(original.key),storage=new Map([['mb_v95c',raw],['mb_v95c_profile2',raw]]);
  const one=harness({storage,profiles:true,slot:1}),two=harness({storage,profiles:true,slot:2});
  one.context.confirm=()=>true;two.context.confirm=()=>true;
  one.run('save.soulContractAppliedId="different"');
  assert.equal(one.run('establishCharacterGachaRecoveryBaseline()'),false);assert.equal(one.primaryWrites(),0);
  assert(two.run('establishCharacterGachaRecoveryBaseline()'));
  assert.equal(storage.has(one.run('characterGachaRecoveryKey()')),false);
  assert.equal(two.run('inspectCharacterGachaRecovery().blocked'),false);
  storage.set(one.run('characterGachaRecoveryKey()'),'{broken');
  assert.equal(one.run('establishCharacterGachaRecoveryBaseline()'),false);
  assert.equal(storage.get(one.run('characterGachaRecoveryKey()')),'{broken');
}

console.log('Soul Contract transactions: single/ten atomic commits, repeated input, ordered receipts, reload recovery, full side-effect rollback, failed acknowledgments, UID repair, corrupt receipts, profiles/conflicts, and presentation fallbacks passed.');
