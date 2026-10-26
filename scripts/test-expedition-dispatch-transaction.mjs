import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const profiles=fs.readFileSync(new URL('../js/profiles.js',import.meta.url),'utf8');
let cases=0;
for(const slot of [1,2])for(const fault of ['none','quota','conflict','read','lateRead','expeditionDisplay','partyDisplay','setupDisplay','startedDisplay']){
  const r=runtime({
    data:source=>`globalThis.crypto={randomUUID:()=>String(Math.random())};
      globalThis.sessionStorage={getItem:()=> '${slot}',setItem(){}};
      localStorage.setItem('mb_v95c',JSON.stringify({coins:11111}));
      localStorage.setItem('mb_v95c_profile2',JSON.stringify({coins:22222}));
      ${profiles}\n${source}`,
    save:source=>source+'\nglobalThis.realSaveGame=saveGame;'
  });
  r.context.console={...console,error(){}};
  r.run(`saveGame=realSaveGame;save=initSave();save.coins=20000;
    var unit=addInstance('freigal',1);var fighter=addInstance('aquaron',1);
    save.party=[fighter.uid];activeInstance=fighter;prepareBattleParty();
    expeditionSelectedMapId='grassland';expeditionSelectedDistanceId='short';expeditionSelectedUids=[unit.uid];
    renderExpedition=renderParty=renderPartySetup=()=>{};
    var notices=[];showUiNotice=text=>notices.push(text);
    var handleTutorialExpeditionStarted=()=>{};
    saveGame();var key=MonsterProfiles.key(SAVE_KEY),otherKey=${slot===1?"'mb_v95c_profile2'":"'mb_v95c'"};
    var before=JSON.stringify(save),disk=localStorage.getItem(key),other=localStorage.getItem(otherKey);
    var set=localStorage.setItem,get=localStorage.getItem,writes=0,reads=0;
    localStorage.setItem=(k,v)=>{if(k===key)writes++;return set(k,v);};`);
  if(fault==='quota')r.run(`localStorage.setItem=(k,v)=>{if(k===key)throw Error('quota');return set(k,v);}`);
  if(fault==='conflict')r.run(`var newer=JSON.parse(disk);newer.coins=99999;set(key,JSON.stringify(newer));`);
  if(fault==='read'||fault==='lateRead')r.run(`localStorage.getItem=k=>{if(k===key&&${fault==='read'?'true':'++reads===2'})throw Error('read');return get(k);};`);
  const renderFault={expeditionDisplay:'renderExpedition',partyDisplay:'renderParty',setupDisplay:'renderPartySetup',startedDisplay:'handleTutorialExpeditionStarted'}[fault];
  if(renderFault)r.run(`${renderFault}=()=>{throw Error('display');};`);
  let returned;
  assert.doesNotThrow(()=>{returned=r.run('startExpedition()');},`${slot}/${fault}: must contain presentation failure`);
  r.run('localStorage.getItem=get;');
  const failed=['quota','conflict','read','lateRead'].includes(fault);
  if(failed){
    assert.equal(returned,false,`${slot}/${fault}: failure result`);
    assert.equal(r.run('JSON.stringify(save)'),r.run('before'),'failed dispatch rolls back all state');
    assert.equal(r.run('localStorage.getItem(key)'),fault==='conflict'?r.run('JSON.stringify(newer)'):r.run('disk'));
    assert.equal(r.run('expeditionSelectedUids[0]'),r.run('unit.uid'),'selection remains retryable');
    assert(r.run('activeInstance===getInstance(fighter.uid)&&partyBattle[0].inst===activeInstance'),'battle pointers stay bound');
    if(fault!=='conflict'){
      r.run('localStorage.setItem=set;');assert.equal(r.run('startExpedition()'),true,'retry succeeds');
    }
  }else{
    assert.equal(returned,true,`${slot}/${fault}: committed dispatch remains successful`);
    assert.equal(r.run('writes'),1);
    assert.equal(r.run('save.expeditions.active.length'),1);
    assert.equal(r.run('expeditionSelectedUids.length'),0);
    assert.equal(r.run('JSON.stringify(save)'),r.run('localStorage.getItem(key)'),'memory agrees with durable dispatch');
    r.run('renderExpedition=renderParty=renderPartySetup=handleTutorialExpeditionStarted=()=>{};');
    assert.equal(r.run('startExpedition()'),false,'repeated button cannot dispatch twice');
    r.run('save=JSON.parse(localStorage.getItem(key));');
    assert.equal(r.run('save.expeditions.active.length'),1,'reload retains one expedition');
    assert(r.run('isInstanceOnExpedition(unit.uid)'),'member remains locked after reload');
  }
  assert.equal(r.run('localStorage.getItem(otherKey)'),r.run('other'),'other profile untouched');
  cases++;
}
console.log(`PASS expedition dispatch transaction: ${cases} profile/fault cases`);
