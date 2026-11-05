import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const {run,context}=runtime();
const plain=value=>JSON.parse(JSON.stringify(value));
const monsters=plain(run('MONSTER_ID_ALIASES'));
const skills=plain(run('RENAMED_SKILL_ID_ALIASES'));
assert.deepEqual(Object.values(monsters),['ashleia','morglum']);
assert.equal(Object.keys(skills).length,6);
const oldIds=Object.keys(monsters);
context.oldIds=oldIds;
context.oldSkills=Object.keys(skills);
const fixture=plain(run(`(()=>{
  const value=initSave();
  value.instances=oldIds.map((id,i)=>({id,uid:id,level:51+i,exp:101+i,locked:i===0,evolutionOffset:0,
    alchemy:{exclusiveSkillIds:[oldSkills[i*3]],custom:'preserve'}}));
  value.instances.push({uid:'another-ashleia',id:'ashleia',level:19,exp:17,locked:false,evolutionOffset:0});
  value.party=[oldIds[0],'another-ashleia'];
  value.caught=[...oldIds,'ashleia'];value.homeFavoriteId=oldIds[1];
  value.levels={[oldIds[0]]:51,[oldIds[1]]:52,ashleia:19};
  value.exp={[oldIds[0]]:101,[oldIds[1]]:102,ashleia:17};
  value.expeditions={completedCount:7,active:[{id:'exp-kept',mapId:'forest',distanceId:'long',
    memberUids:[oldIds[1]],requiredWins:5,progress:3,status:'active',reward:null,startedAt:12345}]};
  value.autoBattle.defeated={'volcano:hard':[oldIds[0]],'forest:hard':[oldIds[1]]};
  value.autoBattle.unlocked=['volcano:hard'];
  value.skillCards=Object.fromEntries(oldSkills.map((id,i)=>[id,i+2]));
  value.skillCards.skill_ashleia_01=7;value.skillCards.s110_001=11;
  value.equippedSkills={[oldIds[0]]:oldSkills.slice(0,3),[oldIds[1]]:oldSkills.slice(3)};
  value.skillDex=oldSkills.slice();value.knownSkills=Object.fromEntries(oldSkills.map(id=>[id,true]));
  value.discoveredSkills=oldSkills.slice();value.skill110UnmappedCards={[oldSkills[0]]:3};
  value.history.logs=[oldIds[0]];value.coins=4567;value.items.contract_scroll=13;
  value.skill110MigrationBackup={caught:oldIds.slice(),skillCards:{[oldSkills[0]]:99}};
  return value;
})()`));
context.raw=JSON.stringify(fixture);
const loaded=plain(run(`localStorage.setItem('mb_v95c',raw);loadSave()`));
assert.equal(loaded.instances.length,3,'no individual may be lost or added');
for(let i=0;i<fixture.instances.length;i++){
  assert.deepEqual(loaded.instances[i],{
    ...fixture.instances[i],id:monsters[fixture.instances[i].id]||fixture.instances[i].id,
    ...(fixture.instances[i].alchemy?{alchemy:{...fixture.instances[i].alchemy,
      exclusiveSkillIds:fixture.instances[i].alchemy.exclusiveSkillIds.map(id=>skills[id])}}:{})
  },'UID, level, EXP, lock and individual metadata survive');
}
assert.deepEqual(loaded.party,fixture.party,'UIDs matching old species names must not be renamed');
assert.deepEqual(loaded.expeditions,fixture.expeditions,'active expedition and its UID links survive');
assert.deepEqual(loaded.caught,['ashleia','morglum']);
assert.equal(loaded.homeFavoriteId,'morglum');
assert.deepEqual(loaded.levels,{ashleia:51,morglum:52});
assert.deepEqual(loaded.exp,{ashleia:101,morglum:102});
assert.deepEqual(loaded.autoBattle.defeated,{'volcano:hard':['ashleia'],'forest:hard':['morglum']});
assert.deepEqual(loaded.autoBattle.unlocked,fixture.autoBattle.unlocked);
const expectedCards={};
for(const [id,count] of Object.entries(fixture.skillCards)){
  const next=skills[id]||id;expectedCards[next]=(expectedCards[next]||0)+count;
}
assert.deepEqual(loaded.skillCards,expectedCards,'mixed old/new inventories sum instead of dropping copies');
assert.equal(Object.values(loaded.skillCards).reduce((a,b)=>a+b,0),Object.values(fixture.skillCards).reduce((a,b)=>a+b,0));
for(const [uid,ids] of Object.entries(fixture.equippedSkills))assert.deepEqual(loaded.equippedSkills[uid],ids.map(id=>skills[id]));
assert.deepEqual(loaded.skillDex,Object.values(skills));
assert.deepEqual(loaded.discoveredSkills,Object.values(skills));
assert.deepEqual(loaded.knownSkills,Object.fromEntries(Object.values(skills).map(id=>[id,true])));
assert.deepEqual(loaded.skill110UnmappedCards,{skill_ashleia_01:3});
assert.deepEqual(loaded.skill110MigrationBackup,fixture.skill110MigrationBackup,'archived backup is untouched');
assert.deepEqual(loaded.history.logs,fixture.history.logs,'free text is untouched');
assert.equal(loaded.coins,4567);assert.equal(loaded.items.contract_scroll,13);
assert.deepEqual(loaded.quarantine,{unknownInstances:[],unknownCaughtIds:[],invalidExpeditions:[]});
context.raw=JSON.stringify(loaded);
assert.deepEqual(plain(run('parseAndPrepareSave(raw,[])')),loaded,'reload/import is idempotent');

// Both the pre-replacement names and September replacement names retain their
// name-derived aliases; each resolves through the new fixed ID to the same 110 skill.
for(const [oldId,newId] of Object.entries(skills)){
  context.oldId=oldId;context.newId=newId;
  assert.equal(run('normalizeSkillId(oldId)'),newId);
  assert.equal(run('canonicalSkillId(oldId)'),run('canonicalSkillId(newId)'));
  for(const move of [run('REPLACEMENT_SKILL_COMPAT[newId].legacyMove'),run('skillToMove(newId)')]){
    context.move=move;
    const derived=run('legacySkillIdFromMove(move)');
    context.derived=derived;
    assert.equal(run('normalizeSkillId(derived)'),newId);
    const legacy={...fixture,skillCards:{[derived]:4},equippedSkills:{[oldIds[0]]:[derived]}};
    context.raw=JSON.stringify(legacy);
    const result=plain(run('parseAndPrepareSave(raw,[])'));
    assert.deepEqual(result.skillCards,{[newId]:4});
    assert.deepEqual(result.equippedSkills[oldIds[0]],[newId]);
    // A save predating the 110-skill migration follows its existing catalog mapping.
    legacy.saveMeta={migrations:[]};delete legacy.skill110MigrationBackup;
    context.raw=JSON.stringify(legacy);
    const pre110=plain(run('parseAndPrepareSave(raw,[])'));
    assert.equal(pre110.skillCards[run('canonicalSkillId(derived)')],4);
    assert.equal(Object.keys(pre110.skill110UnmappedCards).length,0);
    assert.deepEqual(pre110.instances.map(ins=>ins.uid),fixture.instances.map(ins=>ins.uid));
  }
}

console.log('Renamed monster IDs: on-disk load, UID/expedition preservation, mixed inventory, six fixed/name aliases, pre-110 saves and idempotent reload PASS');
