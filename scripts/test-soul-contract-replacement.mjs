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


const contract=h=>{assert.equal(h.run('commitCharacterGacha(1,()=>0).ok'),true);h.context.confirm=()=>true;return h.storage.get(h.run('characterGachaRecoveryKey()'));};
const importRaw=async(h,raw)=>{h.context.importInput={files:[{text:async()=>raw}],value:'selected'};await h.run('importSaveData(importInput)');};
const reload=h=>h.run('save=loadSave();');
const unblocked=h=>assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),false);
const archived=(h,raw)=>assert(h.run('readCharacterGachaRecoveryArchive().records').some(x=>x.raw===raw));
// A: a real paid contract, reset, reload, and a further contract.
{
 const h=harness();h.seed();const old=contract(h);
 assert.equal(h.run('resetSave()'),true);assert.equal(h.reloads(),1);reload(h);unblocked(h);archived(h,old);
 h.run('save.coins=2000;saveGame();');assert.equal(h.run('commitCharacterGacha(1,()=>0).ok'),true);
 console.log('SAVE-01 A PASS');
}
// B: importing the pre-contract snapshot clears the current record, preserving evidence.
{
 const h=harness();h.seed();const pre=h.snapshot(),old=contract(h);await importRaw(h,pre);reload(h);unblocked(h);archived(h,old);
 assert.equal(h.storage.get(h.run('characterGachaRecoveryKey()')),undefined);
 assert.equal(h.run('exportReplacementRecovery()'),true);
 assert.equal(JSON.parse(h.downloads.at(-1).text).soulContractArchive.records[0].raw,old);
 console.log('SAVE-01 B PASS');
}
// C: importing another legitimate marker establishes that marker as the baseline.
{
 const h=harness();h.seed();contract(h);const other=JSON.parse(h.snapshot());other.soulContractAppliedId='other-contract';other.soulContractReceipt=null;
 await importRaw(h,JSON.stringify(other));reload(h);unblocked(h);
 const record=JSON.parse(h.storage.get(h.run('characterGachaRecoveryKey()')));
 assert.equal(record.id,'other-contract');assert.equal(record.status,'baseline');
 console.log('SAVE-01 C PASS');
}
// D: restoring the pre-contract backup re-enables contracts without reapplying rewards.
{
 const h=harness();h.seed();const pre=h.snapshot(),old=contract(h);h.storage.set(h.run('SAVE_BACKUP_KEY'),pre);
 assert.equal(h.run('restoreLastKnownGood()'),true);reload(h);unblocked(h);archived(h,old);assert.equal(h.run('save.coins'),2000);
 console.log('SAVE-01 D PASS');
}
// E: unknown modifications retain the original fail-closed behavior.
{
 const h=harness();h.seed();contract(h);h.run("save.soulContractAppliedId='unexpected';saveGame();");
 assert.equal(h.run('inspectCharacterGachaRecovery().blocked'),true);assert.equal(h.run('inspectCharacterGachaRecovery().reason'),'diverged');
 console.log('SAVE-01 E PASS');
}
// F: cancel the second confirmation for an unresolved prepared contract.
{
 const h=harness();h.seed();const pre=h.snapshot();contract(h);
 const key=h.run('characterGachaRecoveryKey()'),record=JSON.parse(h.storage.get(key));record.status='prepared';h.storage.set(key,JSON.stringify(record));
 const before=new Map(h.storage);h.context.confirm=message=>!message.includes('未確定');await importRaw(h,pre);
 assert.deepEqual(h.storage,before);assert.equal(h.reloads(),0);
 console.log('SAVE-01 F PASS');
}
// G: primary write failure restores the original contract record and live save.
{
 const h=harness();h.seed();const pre=h.snapshot(),old=contract(h),primary=h.storage.get(h.key),memory=h.snapshot();h.fault.key=h.key;
 await importRaw(h,pre);assert.equal(h.storage.get(h.key),primary);assert.equal(h.storage.get(h.run('characterGachaRecoveryKey()')),old);assert.equal(h.snapshot(),memory);assert.equal(h.reloads(),0);
 console.log('SAVE-01 G PASS');
}
// Additional storage faults and successful writes whose notification throws.
for(const mode of ['archive','recovery','after-primary']){
 const h=harness();h.seed();const pre=h.snapshot(),old=contract(h),primary=h.storage.get(h.key);
 h.fault.key=mode==='archive'?h.run('characterGachaRecoveryArchiveKey()'):mode==='recovery'?h.run('characterGachaRecoveryKey()'):h.key;
 if(mode==='recovery')h.fault.remove=h.fault.key;h.fault.afterWrite=mode==='after-primary';await importRaw(h,pre);
 if(mode==='after-primary'){assert.equal(h.reloads(),1);reload(h);unblocked(h);}
 else{assert.equal(h.storage.get(h.key),primary);assert.equal(h.storage.get(h.run('characterGachaRecoveryKey()')),old);assert.equal(h.reloads(),0);}
}
// Profile 2 uses its own archive and does not touch profile 1.
{
 const storage=new Map(),a=harness({storage,profiles:true,slot:1});a.seed();const oldA=contract(a),keyA=a.run('characterGachaRecoveryKey()');
 const b=harness({storage,profiles:true,slot:2});b.seed();const oldB=contract(b);assert.equal(b.run('resetSave()'),true);reload(b);unblocked(b);archived(b,oldB);assert.equal(storage.get(keyA),oldA);
}
// Successive replacements append rather than overwrite earlier evidence.
{
 const h=harness();h.seed();const old=contract(h);assert.equal(h.run('resetSave()'),true);reload(h);h.run('save.coins=2000;saveGame();');const next=contract(h);
 assert.equal(h.run('resetSave()'),true);archived(h,old);archived(h,next);
}
// Browser path queues the same profile lock, retaining both records until granted.
{
 const h=harness();h.seed();contract(h);const locks=queuedWebLocks();h.context.navigator={locks};const before=new Map(h.storage);
 const result=h.run('resetSave()');assert.deepEqual(h.storage,before);assert.equal(locks.waiting.length,1);
 await locks.grant();assert.equal(await result,true);reload(h);unblocked(h);
}
console.log('SAVE-01 additional storage, profile, archive, and Web Locks tests PASS');
// Failed rollback remains protected after reload, with both candidates exportable.
{
 const h=harness();h.seed();const pre=h.snapshot(),old=contract(h),key=h.run('characterGachaRecoveryKey()'),primary=h.storage.get(h.key);
 const original=h.context.localStorage.setItem;
 h.context.localStorage.setItem=(k,v)=>{if(k===h.key||k===key&&v===old)throw Error('double fault');original(k,v);};
 await importRaw(h,pre);assert.equal(h.storage.get(h.key),primary);assert.equal(h.run('soulContractReplacementBlocked'),true);
 h.context.localStorage.setItem=original;reload(h);assert.equal(h.run('soulContractReplacementBlocked'),true);assert.equal(h.run('saveGame()'),false);
 assert.equal(h.run('exportReplacementRecovery()'),true);const archive=JSON.parse(h.downloads.at(-1).text).soulContractArchive;
 assert.equal(archive.pending.beforePrimary,primary);assert.equal(archive.pending.beforeRecovery,old);
}
// Archive-only evidence is exportable even when replacement staging fails.
{
 const h=harness();h.seed();const pre=h.snapshot(),old=contract(h);h.fault.key=h.run('SAVE_REPLACEMENT_RECOVERY_KEY');await importRaw(h,pre);
 assert.equal(h.storage.has(h.run('SAVE_REPLACEMENT_RECOVERY_KEY')),false);assert.equal(h.run('exportReplacementRecovery()'),true);
 assert.equal(JSON.parse(h.downloads.at(-1).text).soulContractArchive.records[0].raw,old);
}
console.log('SAVE-01 durable double-fault protection and archive-only export PASS');
