import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

function fixture(){
  const r=runtime();
  r.context.console={...console,error(){}};
  r.run(`save=initSave();save.progress.tutorial.status='completed';save.coins=2000;
    var member=addInstance('freigal',1),fighter=addInstance('aquaron',1);member.exp=4;
    save.party=[fighter.uid];save.items.monster_bone=7;
    var entry={id:'exp_recovery_test',mapId:'grassland',distanceId:'short',memberUids:[member.uid],
      progress:1,requiredWins:1,status:'complete',reward:null,
      suitability:{grade:'D',total:0,greatRate:0,reasons:[]}};
    save.expeditions.active=[entry];var originalEntry=JSON.stringify(entry);
    var notices=[],writes=[];showUiNotice=message=>notices.push(message);
    saveGame=()=>{writes.push(JSON.stringify(save));return true;};
    renderExpedition=renderParty=renderPartySetup=()=>{};checkEvolution=()=>{};
    function assets(){return JSON.stringify({coins:save.coins,items:save.items,
      instances:save.instances.map(ins=>({uid:ins.uid,level:ins.level,exp:ins.exp})),
      completedCount:save.expeditions.completedCount,contractor:save.contractor});}
    var beforeAssets=assets();`);
  return r;
}
function assertReleased(r,label){
  assert.equal(r.run('save.expeditions.active.length'),0,`${label}: slot released`);
  assert.equal(r.run('isInstanceOnExpedition(member.uid)'),false,`${label}: member unlocked`);
  assert.equal(r.run('expeditionAvailableInstances().some(ins=>ins.uid===member.uid)'),true,`${label}: member may be dispatched`);
  assert.equal(r.run('assets()'),r.run('beforeAssets'),`${label}: no coins, items, EXP or completion awarded`);
}
function assertOriginal(r,label){
  assert.equal(r.run('JSON.stringify(save.quarantine.invalidExpeditions[0])'),r.run('originalEntry'),`${label}: exact original quarantined`);
}

// A: use the actual load path, then verify both dispatch and party eligibility.
{
  const r=fixture();
  r.run(`localStorage.setItem(SAVE_KEY,JSON.stringify(save));saveRecoveryReport=[];save=loadSave();`);
  assertReleased(r,'A');assertOriginal(r,'A');
  assert(r.run("saveRecoveryReport.some(message=>message.includes('遠征')&&message.includes('隔離'))"),'A: repair report explains recovery');
  assert.equal(r.run('togglePartyMember(member.uid)'),true,'A: released member can join party');
  assert.equal(r.run('save.party.includes(member.uid)'),true);
  r.run('normalizeExpeditionSave();');
  assert.equal(r.run('save.quarantine.invalidExpeditions.length'),1,'A: repeated normalization does not duplicate quarantine');
  console.log('PASS SAVE-04 A: load quarantines original, frees member/slot and grants no reward');
}

// B: preserve SEC-02 policy: remove unknown IDs, floor nonnegative counts, clamp negatives.
{
  const r=fixture();
  r.run(`entry.reward={coins:24,exp:18,great:false,items:{monster_bone:2.9,magic_crystal:-3,'<img src=x onerror=1>':10}};
    save=parseAndPrepareSave(JSON.stringify(save),[]);`);
  assert.equal(r.run('save.expeditions.active.length'),1,'B: recoverable item issues retain expedition');
  assert.equal(r.run('JSON.stringify(save.expeditions.active[0].reward.items)'),'{"monster_bone":2,"magic_crystal":0}','B: unsafe item IDs removed and counts never increased');
  assert.equal(r.run('assets()'),r.run('beforeAssets'),'B: normalization does not award anything');
  console.log('PASS SAVE-04 B: invalid item fields repaired without creating rewards');
}

// C: over-progress is safe to clamp; stale active rewards must not become claimable.
for(const path of ['load','runtime']){
  const r=fixture();
  r.run(`entry.status='active';entry.distanceId='medium';entry.requiredWins=3;entry.progress=99;
    entry.reward={coins:9999,exp:9999,great:true,items:{monster_bone:9999}};`);
  r.run(path==='load'?'save=parseAndPrepareSave(JSON.stringify(save),[]);':'normalizeExpeditionSave();');
  assert.equal(r.run('save.expeditions.active.length'),1,`C/${path}: active record retained`);
  assert.equal(r.run('save.expeditions.active[0].progress'),3,`C/${path}: progress clamped to required wins`);
  assert.equal(r.run('save.expeditions.active[0].status'),'active');
  assert.equal(r.run('save.expeditions.active[0].reward'),null,`C/${path}: stale reward removed`);
  assert.equal(r.run('assets()'),r.run('beforeAssets'));
}
console.log('PASS SAVE-04 C: shared load/runtime normalization clamps progress and clears active rewards');

// D: legitimate completed reward is paid once; repeated claim cannot duplicate it.
{
  const r=fixture();
  r.run(`entry.reward={coins:24,exp:18,great:false,items:{monster_bone:1}};var expBefore=member.exp;
    claimExpedition(entry.id);`);
  assert.equal(r.run('save.coins'),2024,'D: expected coins');
  assert.equal(r.run('save.items.monster_bone'),8,'D: expected items');
  assert.equal(r.run('getInstance(member.uid).exp-expBefore'),18,'D: expected member EXP');
  assert.equal(r.run('save.expeditions.completedCount'),1,'D: one completion');
  assert.equal(r.run('save.expeditions.active.length'),0,'D: slot released');
  r.run('var afterClaim=assets();claimExpedition(entry.id);');
  assert.equal(r.run('assets()'),r.run('afterClaim'),'D: no repeated rewards');
  assert.equal(r.run('writes.length'),1,'D: claim commits once');
  console.log('PASS SAVE-04 D: legitimate completion awards normal rewards exactly once');
}

// E: unchanged early-return formula: medium distance, 1/3 progress, 50% reward.
{
  const r=fixture();
  r.run(`entry.status='active';entry.distanceId='medium';entry.requiredWins=3;entry.progress=1;
    Math.random=()=>.99;var expBefore=member.exp;recallExpedition(entry.id);`);
  assert.equal(r.run('save.coins'),2008,'E: 24 × 2 × 1/3 × 50% coins');
  assert.equal(r.run('getInstance(member.uid).exp-expBefore'),6,'E: 18 × 2 × 1/3 × 50% EXP');
  assert.equal(r.run('save.items.monster_bone'),7,'E: fractional item count floors to zero');
  assert.equal(r.run('save.expeditions.completedCount'),0,'E: early return not counted as completion');
  assert.equal(r.run('save.expeditions.active.length'),0);
  assert.equal(r.run('isInstanceOnExpedition(member.uid)'),false);
  console.log('PASS SAVE-04 E: valid active expedition recalls with unchanged 50% progress reward');
}

// F: bypass loading and render-time normalization; claim itself must recover safely.
{
  const r=fixture();
  r.run('claimExpedition(entry.id);');
  assertReleased(r,'F');assertOriginal(r,'F');
  assert.equal(r.run('writes.length'),1,'F: quarantine committed to save');
  assert.equal(r.run('JSON.parse(writes[0]).expeditions.active.length'),0,'F: saved slot released');
  assert.equal(r.run('JSON.stringify(JSON.parse(writes[0]).quarantine.invalidExpeditions[0])'),r.run('originalEntry'),'F: saved quarantine keeps original');
  assert(r.run("notices.some(message=>message.includes('遠征')&&message.includes('戻しました'))"),'F: user receives recovery notice');
  r.run('claimExpedition(entry.id);');
  assert.equal(r.run('writes.length'),1,'F: repeated claim is harmless');
  assert.equal(r.run('save.quarantine.invalidExpeditions.length'),1,'F: original archived once');
  console.log('PASS SAVE-04 F: runtime claim quarantines and commits without awards');
}

// Saving failure must roll back both the quarantine and the release, including report.
{
  const r=fixture();
  r.run(`save.quarantine.invalidExpeditions.push({id:'older_record',reward:null});
    saveRecoveryReport=['existing report'];var before=JSON.stringify(save),beforeReport=JSON.stringify(saveRecoveryReport);
    saveGame=()=>false;claimExpedition(entry.id);`);
  assert.equal(r.run('JSON.stringify(save)'),r.run('before'),'rollback: original active and archive intact');
  assert.equal(r.run('JSON.stringify(saveRecoveryReport)'),r.run('beforeReport'),'rollback: report restored');
  assert.equal(r.run('isInstanceOnExpedition(member.uid)'),true,'rollback: uncommitted release not shown as success');
  assert.equal(r.run("notices.some(message=>message.includes('遠征記録が壊れていたため'))"),false,'rollback: no success notice');
  r.run(`saveGame=()=>true;claimExpedition(entry.id);`);
  assertReleased(r,'rollback retry');
  assert.equal(r.run('save.quarantine.invalidExpeditions.length'),2,'rollback retry: older quarantine preserved');
  assert.equal(r.run('save.quarantine.invalidExpeditions[0].id'),'older_record');
  assert.equal(r.run('JSON.stringify(save.quarantine.invalidExpeditions[1])'),r.run('originalEntry'));
  console.log('PASS SAVE-04 rollback: failed commit preserves all state, retry retains older quarantine');
}

// Invalid status/progress/scalars are not guessed, rerolled, or silently converted to active.
for(const patch of [
  {status:'unknown'}, {progress:-1}, {progress:.5},
  {reward:{coins:-1,exp:18,great:false,items:{}}},
  {reward:{coins:24,exp:.5,great:false,items:{}}},
  {reward:{coins:24,exp:18,great:'yes',items:{}}}
])for(const path of ['load','runtime']){
  const r=fixture();r.context.patch=patch;
  r.run(`Object.assign(entry,patch);originalEntry=JSON.stringify(entry);`);
  r.run(path==='load'?'save=parseAndPrepareSave(JSON.stringify(save),saveRecoveryReport);':'normalizeExpeditionSave();');
  assertReleased(r,`invalid/${path}`);assertOriginal(r,`invalid/${path}`);
}
console.log('PASS SAVE-04 validation: bad status/progress/reward scalars preserve originals and grant nothing');

for(const distanceId of ['__proto__','constructor','unknown']){
  const r=fixture();r.context.distanceId=distanceId;
  r.run(`entry.distanceId=distanceId;entry.reward={coins:24,exp:18,great:false,items:{monster_bone:1}};
    originalEntry=JSON.stringify(entry);claimExpedition(entry.id);`);
  assertReleased(r,'invalid distance');assertOriginal(r,'invalid distance');
}
console.log('PASS SAVE-04 runtime: unknown/prototype distance names cannot grant rewards');
