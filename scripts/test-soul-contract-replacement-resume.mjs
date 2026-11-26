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
// A pending transaction contains exact serialized candidates, not merely matching IDs.
function fixture({slot=1,profiles=false}={}){
  const h=harness({slot,profiles});h.seed();
  const beforePrimary=h.storage.get(h.key),beforeRecovery=null;
  const after=JSON.parse(beforePrimary);after.coins=1700;after.soulContractAppliedId='replacement-resume-id';
  const afterPrimary=JSON.stringify(after);
  const afterRecovery=JSON.stringify({version:1,id:after.soulContractAppliedId,status:'baseline',before:after,after,previous:null});
  const pending={beforePrimary,beforeRecovery,afterPrimary,afterRecovery};
  const archiveKey=h.run('characterGachaRecoveryArchiveKey()'),recoveryKey=h.run('characterGachaRecoveryKey()');
  return Object.assign(h,{pending,archiveKey,recoveryKey});
}
function install(h,side,recordSide=side){
  h.storage.set(h.key,h.pending[`${side}Primary`]);
  const raw=h.pending[`${recordSide}Recovery`];
  if(raw===null)h.storage.delete(h.recoveryKey);else h.storage.set(h.recoveryKey,raw);
  h.storage.set(h.archiveKey,JSON.stringify({version:1,records:[],pending:h.pending}));
}
function candidatePair(h){return [h.storage.get(h.key),h.storage.get(h.recoveryKey),h.storage.get(h.run('SAVE_BACKUP_KEY'))];}
for(const side of ['before','after']){
  const h=fixture();install(h,side);const original=candidatePair(h);reload(h);
  assert.deepEqual(candidatePair(h),original,'automatic cleanup must not rewrite either candidate or backup');
  assert.equal(h.run('primaryReadFailed'),false);
  assert.equal(h.run('soulContractReplacementBlocked'),false);
  assert.equal(JSON.parse(h.storage.get(h.archiveKey)).pending,undefined);
  assert.equal(h.run('saveGame()'),true);
  console.log(`SAVE-01 resume ${side} match PASS`);
}
// Same after ID but different bytes does not qualify as automatic completion.
{
  const h=fixture();install(h,'after');const current=JSON.parse(h.storage.get(h.key));current.coins++;
  h.storage.set(h.key,JSON.stringify(current));const original=candidatePair(h);reload(h);
  assert.deepEqual(candidatePair(h),original);assert.equal(h.run('soulContractReplacementBlocked'),true);
  assert.equal(h.run('saveGame()'),false);assert.equal(h.run('primaryReadFailed'),false);
}
for(const malformed of [false,true]){
  const h=fixture();install(h,'before','after');
  if(malformed)h.storage.set(h.archiveKey,'{broken archived record');
  const original=candidatePair(h),originalArchive=h.storage.get(h.archiveKey);reload(h);
  assert.deepEqual(candidatePair(h),original);
  assert.equal(h.run('primaryReadFailed'),false,'replacement blockage must remain distinct from SAVE-02');
  assert.equal(h.run('soulContractReplacementBlocked'),true);assert.equal(h.run('saveGame()'),false);
  assert(h.alerts.some(message=>message.includes('セーブの置き換え処理が途中で止まっています')));
  assert(!h.alerts.some(message=>message.includes('セーブを読み取れなかったため')));
  h.context.confirm=()=>true;
  assert.notEqual(await h.run('resumeSoulContractReplacement()'),true,'export is required before manual resume');
  assert.deepEqual(candidatePair(h),original);assert.equal(h.storage.get(h.archiveKey),originalArchive);
  assert.equal(h.run('exportReplacementRecovery()'),true);assert(h.downloads.length>0);
  if(malformed)assert(h.downloads.at(-1).text.includes('broken archived record'),'export must preserve malformed original evidence');
  assert.equal(await h.run('resumeSoulContractReplacement()'),true);
  assert.equal(h.reloads(),1);reload(h);
  assert.equal(h.run('soulContractReplacementBlocked'),false);assert.equal(h.run('primaryReadFailed'),false);
  assert.equal(JSON.parse(h.storage.get(h.archiveKey)).pending,undefined);
  assert.equal(h.storage.get(h.key),original[0],'manual baseline must not rewrite the primary');
  assert.equal(h.storage.get(h.run('SAVE_BACKUP_KEY')),original[2]);
  unblocked(h);assert.equal(h.run('saveGame()'),true);
  console.log(`SAVE-01 resume ${malformed?'malformed archive':'mismatched pending'} PASS`);
}
// Manual resume creates a baseline when the actual durable save has a contract ID.
{
  const h=fixture();install(h,'after','before');reload(h);h.context.confirm=()=>true;
  assert.equal(h.run('exportReplacementRecovery()'),true);
  assert.equal(await h.run('resumeSoulContractReplacement()'),true);reload(h);unblocked(h);
  const record=JSON.parse(h.storage.get(h.recoveryKey));assert.equal(record.status,'baseline');assert.equal(record.id,'replacement-resume-id');
}
// Five reset/import cycles must not grow the archive beyond three records.
{
  const h=harness();h.seed();h.context.confirm=()=>true;
  for(let i=0;i<5;i++){
    // Imported receipts must be viewed and acknowledged before another paid draw.
    if(h.run('Boolean(save.soulContractReceipt)')){h.run('recoverCharacterGachaReceipt();');assert.equal(h.run('acknowledgeCharacterGachaReceipt()'),true);}
    h.run('save.coins=2000;saveGame();');contract(h);const snapshot=h.snapshot();
    assert.equal(h.run('resetSave()'),true);reload(h);
    await importRaw(h,snapshot);reload(h);
    const records=h.run('readCharacterGachaRecoveryArchive().records');assert(records.length<=3);
  }
  assert.equal(h.run('readCharacterGachaRecoveryArchive().records.length'),3);
  console.log('SAVE-01 resume archive bounded after five reset/import cycles PASS');
}
// Browser replacement operations without Web Locks use replacement-specific guidance.
for(const operation of ['reset','import','restore']){
  const h=harness();h.seed();h.context.confirm=()=>true;h.context.navigator={};const before=new Map(h.storage);
  if(operation==='reset')await h.run('resetSave()');
  else if(operation==='import')await importRaw(h,h.snapshot());
  else await h.run('restoreLastKnownGood()');
  assert.deepEqual(h.storage,before);
  assert(h.alerts.some(message=>message.includes('このブラウザではセーブの置き換えを安全に実行できません')));
  assert(!h.alerts.some(message=>message.includes('契約を開始できません')||message.includes('契約をやり直してください')));
}
console.log('SAVE-01 resume no-Web-Locks replacement guidance PASS');
// Quota pressure trims oldest archive records and retries without discarding the transaction.
{
  const h=harness();h.seed();const newest=contract(h),key=h.run('characterGachaRecoveryArchiveKey()');
  h.storage.set(key,JSON.stringify({version:1,records:[1,2,3].map(n=>({archivedAt:`old-${n}`,raw:`old-record-${n}`}))}));
  const originalSet=h.context.localStorage.setItem;let rejected=0;
  h.context.localStorage.setItem=(k,v)=>{
    if(k===key&&JSON.parse(v).records.length>1){rejected++;throw Error('archive quota');}
    originalSet(k,v);
  };
  assert.equal(h.run('resetSave()'),true);assert(rejected>0);reload(h);unblocked(h);
  const records=JSON.parse(h.storage.get(key)).records;assert(records.length<=1);
  if(records.length)assert.equal(records[0].raw,newest,'quota trimming must discard oldest records first');
  console.log('SAVE-01 resume archive quota trimming PASS');
}
