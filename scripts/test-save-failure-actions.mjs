import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';

// DOM-light unit/integration coverage using the real profile, save, transaction,
// reward and UI-action functions. Actual clicks, visible DOM and browser reloads
// are covered separately by test-save-failure-ui.mjs.
const read=name=>fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8');
const profileSource=read('profiles');

function fixture(slot,setup=''){
  const r=runtime({
    data:source=>`globalThis.crypto={randomUUID:()=>String(Math.random())};
      globalThis.sessionStorage={getItem:()=> '${slot}',setItem(){}};
      localStorage.setItem('mb_v95c',JSON.stringify({coins:11111,auditMarker:'profile1'}));
      localStorage.setItem('mb_v95c_profile2',JSON.stringify({coins:22222,auditMarker:'profile2'}));
      ${profileSource}\n${source}`,
    save:source=>`${source}\nglobalThis.originalSaveGame=saveGame;`
  });
  // Quota failures are intentional. Assertions, not expected console traces,
  // determine the test result; unexpected errors still fail the state checks.
  r.context.console={...console,error(){}};
  r.context.document.addEventListener=()=>{};
  for(const file of ['contractor-rank','ui'])vm.runInContext(read(file),r.context,{filename:`js/${file}.js`});
  const overlay=r.context.document.getElementById('contractorRankUpOverlay');
  const overlayClasses=new Set();
  overlay.classList={
    contains:name=>overlayClasses.has(name),
    add:name=>overlayClasses.add(name),
    remove:name=>overlayClasses.delete(name)
  };
  r.run(`
    saveGame=originalSaveGame;
    save=initSave();
    save.coins=20000;
    save.contractor.exp=contractorCumulativeExpForRank(5);
    syncContractorRankTitles();
    var unit=addInstance('freigal',1);
    save.party=[];
    save.items.golden_land_map=2;
    save.contractor.pendingRankUps=[];
    var notices=[],alerts=[],rankUiSnapshots=[];
    showUiNotice=(text,kind='success')=>notices.push({text,kind});
    alert=text=>alerts.push(text);
    var originalUpdateRankHeader=updateContractorRankHeader;
    updateContractorRankHeader=()=>{
      rankUiSnapshots.push(JSON.stringify(save));
      originalUpdateRankHeader();
    };
    renderParty=()=>{};
    saveGame();
    ${setup}
    saveGame();
    notices=[];alerts=[];rankUiSnapshots=[];
    var before=JSON.stringify(save);
    var key=MonsterProfiles.key(SAVE_KEY);
    var otherKey=${slot===1?"'mb_v95c_profile2'":"'mb_v95c'"};
    var disk=localStorage.getItem(key);
    var other=localStorage.getItem(otherKey);
    var originalSet=localStorage.setItem;
    var writes=0;
  `);
  assert.equal(r.run('before'),r.run('disk'),'fixture must start fully saved');
  return {...r,overlayClasses};
}

function injectQuota(r){
  r.run(`localStorage.setItem=(k,value)=>{
    if(k===key)throw Error('injected primary-save quota');
    return originalSet(k,value);
  };`);
}

function restoreStorage(r){
  r.run(`localStorage.setItem=(k,value)=>{
    if(k===key)writes++;
    return originalSet(k,value);
  };notices=[];alerts=[];rankUiSnapshots=[];`);
}

function assertRolledBack(r,label){
  assert.equal(r.run('JSON.stringify(save)'),r.run('before'),`${label}: exact memory rollback`);
  assert.equal(r.run('localStorage.getItem(key)'),r.run('disk'),`${label}: primary save unchanged`);
  assert.equal(r.run('localStorage.getItem(otherKey)'),r.run('other'),`${label}: other profile unchanged`);
  assert(r.run("notices.some(notice=>notice.kind==='error')"),`${label}: error notice`);
  assert.equal(r.run("notices.filter(notice=>notice.kind!=='error').length"),0,`${label}: no success notice`);
  assert.equal(r.run('alerts.length'),0,`${label}: no success alert`);
}

function assertPersisted(r,label){
  assert.equal(r.run('writes'),1,`${label}: exactly one successful primary write`);
  assert.equal(r.run('JSON.stringify(save)'),r.run('localStorage.getItem(key)'),`${label}: memory matches saved state`);
  assert.equal(r.run('localStorage.getItem(otherKey)'),r.run('other'),`${label}: other profile unchanged`);
}

const actions=[
  {name:'reward-single',call:'claimContractorRewardUi(2)'},
  {name:'reward-all',call:'claimAllContractorRewardsUi()'},
  {name:'title-equip',call:"setContractorTitle('rank_05_full_contractor')"},
  {name:'title-remove',call:"setContractorTitle('')",setup:"save.contractor.equippedTitleId='rank_05_full_contractor';"},
  {name:'rank-close',call:'closeContractorRankUp()',setup:'save.contractor.pendingRankUps=[{fromRank:1,toRank:5,unlockedTitleIds:[]}];'},
  {name:'lock',call:'toggleInstanceLock(unit.uid)'},
  {name:'party-add',call:'togglePartyMember(unit.uid)',setup:'save.party=[];'},
  {name:'party-remove',call:'togglePartyMember(unit.uid)',setup:'save.party=[unit.uid];'},
  {name:'map',call:'useGoldenLandMap()'}
];

for(const slot of [1,2])for(const action of actions){
  const r=fixture(slot,action.setup);
  const label=`profile ${slot}/${action.name}`;
  injectQuota(r);
  assert.equal(r.run(action.call),false,`${label}: failure result`);
  assertRolledBack(r,label);
  if(action.name==='rank-close')assert.equal(r.overlayClasses.has('hidden'),false,`${label}: overlay remains open`);
  restoreStorage(r);
  assert.equal(r.run(action.call),true,`${label}: same-action retry succeeds`);
  assertPersisted(r,label);
  if(action.name==='rank-close')assert.equal(r.overlayClasses.has('hidden'),true,`${label}: overlay closes after save`);
  if(action.name.startsWith('reward')){
    const after=r.run('JSON.stringify(save)');
    assert.equal(r.run(action.call),false,`${label}: repeated claim is a no-op`);
    assert.equal(r.run('JSON.stringify(save)'),after,`${label}: no duplicate reward`);
    assert.equal(r.run('writes'),1,`${label}: repeated claim does not save`);
  }
  // This calls the real save loader but is not a browser/page reload.
  r.run('save=loadSave();');
  assert.equal(r.run('JSON.stringify(save)'),r.run('localStorage.getItem(key)'),`${label}: loader preserves saved state`);
}

const noops=[
  {name:'invalid-rank',call:'claimContractorRewardUi(1)'},
  {name:'locked-rank',call:'claimContractorRewardUi(50)'},
  {name:'claimed-rank',call:'claimContractorRewardUi(2)',setup:'save.contractor.claimedRankRewards=[2];'},
  {name:'all-claimed',call:'claimAllContractorRewardsUi()',setup:'save.contractor.claimedRankRewards=availableContractorRankRewardRanks();'},
  {name:'unknown-title',call:"setContractorTitle('not_a_title')"},
  {name:'locked-title',call:"setContractorTitle('rank_50_star_binder')"}
];
for(const slot of [1,2])for(const action of noops){
  const r=fixture(slot,action.setup);
  const label=`profile ${slot}/${action.name}`;
  restoreStorage(r);
  assert.equal(r.run(action.call),false,`${label}: no-op result`);
  assert.equal(r.run('writes'),0,`${label}: no unnecessary save`);
  assert.equal(r.run('JSON.stringify(save)'),r.run('before'),`${label}: no state change`);
  assert.equal(r.run('localStorage.getItem(key)'),r.run('disk'),`${label}: no disk change`);
  assert.equal(r.run("notices.filter(notice=>notice.kind==='success').length"),0,`${label}: no success notice`);
}

for(const slot of [1,2]){
  const r=fixture(slot,`
    save.contractor.exp=contractorCumulativeExpForRank(6)-CONTRACTOR_ACTION_EXP.dexRegistration+1;
    save.contractor.pendingRankUps=[];
  `);
  const label=`profile ${slot}/new reward item registration`;
  assert.equal(r.run("save.itemDex.includes('contract_scroll')"),false,`${label}: first-time catalog reward fixture`);
  r.run('var beforeTimer=contractorRankUpTimer;');
  injectQuota(r);
  assert.equal(r.run('claimContractorRewardUi(2)'),false);
  assertRolledBack(r,label);
  assert.equal(r.run('rankUiSnapshots.length'),0,`${label}: no intermediate Rank redraw`);
  assert.equal(r.run('contractorRankUpTimer===beforeTimer'),true,`${label}: existing presentation timer preserved`);
  assert.equal(r.run('contractorRewardSavePending'),false,`${label}: redraw deferral resets after failure`);
  restoreStorage(r);
  assert.equal(r.run('claimContractorRewardUi(2)'),true);
  assertPersisted(r,label);
  assert.equal(r.run('rankUiSnapshots.length'),1,`${label}: single committed Rank redraw`);
  assert.equal(r.run('rankUiSnapshots[0]'),r.run('localStorage.getItem(key)'),`${label}: redraw sees persisted result`);
  assert.equal(r.run("save.itemDex.includes('contract_scroll')"),true,`${label}: catalog item retained`);
  assert.equal(r.run('save.contractor.pendingRankUps.at(-1).toRank'),6,`${label}: catalog EXP rank-up retained`);
  assert.equal(r.run('contractorRewardSavePending'),false,`${label}: redraw deferral resets after success`);
}

console.log('PASS save-failure actions (DOM-light): 18 profile/action rollback + retry cases, 12 no-op guards, 2 catalog EXP/redraw cases; real save/profile functions and loader, not browser/device coverage.');
