import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=name=>fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8');
const startupSave=source('init').split('\n').find(line=>line.includes('save-result-allow: startup-migration'));
assert.match(startupSave,/saveGame\(\)/,'exercise the actual optionless startup save call');
const primary=slot=>slot===1?'mb_v95c':'mb_v95c_profile2';
const backup=slot=>`${primary(slot)}_lastKnownGood`;
const original=JSON.stringify({schemaVersion:4,coins:2000});
const results=[];
function boot({slot=1,raw=original,backupRaw=original,loadFault=false,profiles=true,recover=true}={}){
  const other=slot===1?2:1;
  const storage=new Map([[primary(other),original],[backup(other),original]]);
  if(raw!==null)storage.set(primary(slot),raw);
  if(backupRaw!==null)storage.set(backup(slot),backupRaw);
  const writes=[],alerts=[],downloads=[];
  let faultAfter=0,reloads=0;
  const context=vm.createContext({console,crypto:webcrypto,Date,JSON,Math,structuredClone,
    localStorage:{getItem(key){if(key===primary(slot)&&faultAfter>0&&--faultAfter===0)throw Error('injected primary read failure');return storage.get(key)??null;},
      setItem(key,value){writes.push(['set',key]);storage.set(key,String(value));},
      removeItem(key){writes.push(['remove',key]);storage.delete(key);}},
    sessionStorage:{getItem:()=>String(slot),setItem(){}},
    alert:message=>alerts.push(message),confirm:()=>recover,location:{reload:()=>reloads++},
    document:{getElementById:()=>null,querySelector:()=>null},addEventListener(){}});
  const run=code=>vm.runInContext(code,context);
  for(const file of ['data','core'])run(source(file));
  if(profiles)run(source('profiles'));
  writes.length=0;
  if(loadFault)faultAfter=1; // Profiles baseline succeeds; only loadSave's read throws.
  run(source('save'));
  context.captureDownload=(filename,text)=>downloads.push({filename,text});
  run('downloadTextFile=captureDownload');
  return {run,storage,writes,alerts,downloads,failReadAfter:n=>{faultAfter=n;},reloads:()=>reloads,other};
}
function assertOtherUntouched(h){
  assert.equal(h.storage.get(primary(h.other)),original);
  assert.equal(h.storage.get(backup(h.other)),original);
}
for(const slot of [1,2]){
  // A: startup load failure must stay read-only even after storage recovers.
  const h=boot({slot,loadFault:true});
  assert.equal(h.run('save.coins'),0,'temporary fresh game remains usable');
  assert.equal(h.run('primaryReadFailed'),true);
  assert(h.alerts.some(x=>x.includes('保存を停止')&&x.includes('再読み込み')&&x.includes('書き出')));
  for(let i=0;i<2;i++)assert.equal(h.run(startupSave),false);
  for(const options of ['{}','{requireReadable:true}','{requireBackup:true}'])assert.equal(h.run(`saveGame(${options})`),false);
  h.run('resetSave()');
  assert.equal(h.reloads(),0);
  assert.equal(h.run('safeStorageSet(SAVE_KEY,"replacement")'),false);
  assert.equal(h.run('safeStorageRemove(SAVE_KEY)'),false);
  assert.equal(h.run('safeStorageSet(SAVE_BACKUP_KEY,"replacement")'),false);
  assert.equal(h.run('safeStorageRemove(SAVE_BACKUP_KEY)'),false);
  h.run('exportSaveData()');
  assert.equal(h.downloads.at(-1).text,original,'export stored original, never temporary fresh data');
  h.failReadAfter(1);h.run('exportSaveData()');
  assert.equal(h.downloads.length,1,'a failed export must not substitute fresh data');
  assert(h.alerts.at(-1).includes('元データを読み取れません'));
  h.run('restoreLastKnownGood()');
  h.run('var incoming=initSave();incoming.coins=99');
  h.run('globalThis.importInput={files:[{text:async()=>JSON.stringify(incoming)}],value:"fixture.json"}');
  await h.run('importSaveData(importInput)');
  assert.equal(h.storage.get(primary(slot)),original);
  assert.equal(h.storage.get(backup(slot)),original);
  assert.equal(JSON.parse(h.storage.get(primary(slot))).coins,2000);
  assert.equal(JSON.parse(h.storage.get(backup(slot))).coins,2000);
  assert.deepEqual(h.writes,[],'no game-data writes or removals after a load failure');
  assertOtherUntouched(h);
  assert.equal(h.run(`MonsterProfiles.switchTo(${h.other})`),true,'read-only failed slot can still switch to healthy slot');
  assert.equal(h.reloads(),1);
  assert.equal(h.storage.get(primary(slot)),original);
  assert.equal(h.storage.get(backup(slot)),original);
  // A real reload creates a fresh guard and resumes the original game.
  const reload=boot({slot,raw:h.storage.get(primary(slot)),backupRaw:h.storage.get(backup(slot))});
  assert.equal(reload.run('save.coins'),2000);
  assert.equal(reload.run('primaryReadFailed'),false);
  assert.equal(reload.run(startupSave),true);
  results.push(`A/slot${slot}: repeated startup, reset, direct writes, export, import/restore, switch/reload PASS`);

  // B: null without an exception remains a genuinely new game.
  const fresh=boot({slot,raw:null,backupRaw:null});
  fresh.run('lastSaveError=Error("stale error");save=loadSave()');
  assert.equal(fresh.run('primaryReadFailed'),false,'clear stale errors before loading');
  assert.equal(fresh.run(startupSave),true);
  assert.equal(JSON.parse(fresh.storage.get(primary(slot))).coins,0);
  assert.equal(JSON.parse(fresh.storage.get(backup(slot))).coins,0);
  fresh.run('save.coins=123');assert.equal(fresh.run('saveGame()'),true);
  assert.equal(JSON.parse(fresh.storage.get(primary(slot))).coins,123);
  assert.equal(JSON.parse(fresh.storage.get(backup(slot))).coins,0);
  assertOtherUntouched(fresh);
  results.push(`B/slot${slot}: new game and normal save PASS`);

  // C: beforeSave succeeds, but saveGame's own previous read throws.
  for(const options of ['{}','{requireReadable:true}','{requireBackup:true}']){
    const h=boot({slot});h.writes.length=0;
    h.run('save.coins=999');h.failReadAfter(2);
    assert.equal(h.run(`saveGame(${options})`),false);
    assert.equal(h.storage.get(primary(slot)),original);
    assert.equal(h.storage.get(backup(slot)),original);
    assert.deepEqual(h.writes,[]);
    assertOtherUntouched(h);
    assert.equal(h.run('saveGame()'),true,'a later readable save retains normal retry behavior');
    assert.equal(JSON.parse(h.storage.get(primary(slot))).coins,999);
    results.push(`C/slot${slot}/${options}: previous-read failure PASS`);
  }

  // D: syntactically corrupt JSON keeps its existing quarantine/recovery paths.
  for(const recover of [true,false]){
    const h=boot({slot,raw:'{broken',recover});
    assert.equal(h.storage.get(`${primary(slot)}_corrupt`),'{broken');
    assert.equal(h.run('primaryReadFailed'),false);
    assert.equal(h.run('save.coins'),recover?2000:0);
    assert.equal(h.run(startupSave),true);
    assert.equal(JSON.parse(h.storage.get(primary(slot))).coins,recover?2000:0);
    assert.equal(h.storage.get(backup(slot)),original,'do not back up rejected corrupt JSON');
    assertOtherUntouched(h);
    results.push(`D/slot${slot}/restore=${recover}: corrupt JSON PASS`);
  }
  const futureRaw=JSON.stringify({schemaVersion:999,coins:2000});
  const future=boot({slot,raw:futureRaw});
  assert.equal(future.run(startupSave),false);future.run('resetSave();exportSaveData()');
  assert.equal(future.storage.get(primary(slot)),futureRaw);
  assert.equal(future.storage.get(backup(slot)),original);
  assert.equal(future.downloads[0].text,futureRaw);
  assertOtherUntouched(future);
  results.push(`newer-schema/slot${slot}: existing protection PASS`);
}
// The guard also works without the optional profiles integration.
const standalone=boot({profiles:false,loadFault:true});
assert.equal(standalone.run(startupSave),false);
assert.deepEqual(standalone.writes,[]);
const previous=boot({profiles:false});previous.failReadAfter(1);
assert.equal(previous.run('saveGame()'),false);
assert.equal(previous.storage.get(primary(1)),original);
assert.equal(previous.storage.get(backup(1)),original);
console.log(results.join('\n'));
console.log('SAVE-02 read-failure fault injection: all cases PASS');
