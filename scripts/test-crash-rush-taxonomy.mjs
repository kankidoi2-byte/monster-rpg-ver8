import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const core=read('js/core.js');
function load(source){
  const context=vm.createContext({console});
  vm.runInContext(read('js/data.js'),context);
  vm.runInContext(source,context);
  return vm.runInContext(`({cards:MOVE_CARDS,units:M,skillFormFor,skillRequirementsFor,
    isSkillAllowedForMonster,skillBattleMotionForMove,skillToMove,defaultSkillIdsForMonster,
    chargeRule:SKILL_FORM_RULES.find(rule=>rule.tag==='capability:charge')})`,context);
}
const current=load(core);
// Reproduce the pre-fix partial-match rule against exactly the same data/code.
const legacyCore=core.replace('(?<!ク)ラッシュ','ラッシュ');
assert.notEqual(core,legacyCore,'the guarded rush alternative must be present');
const previous=load(legacyCore);
const plain=value=>JSON.parse(JSON.stringify(value));
const affected=['skill_thornbeat_03','skill_icegolem_03','skill_proto_icegolem_05','skill_proto_icegolem_03'];
assert.deepEqual(plain(current.cards.filter(card=>card.deprecated&&card.name.includes('クラッシュ')).map(card=>card.id)),affected);

for(const name of ['クラッシュ','凍結クラッシュ','スパイクラッシュ','クラッシュクラッシュ']){
  assert.equal(current.chargeRule.pattern.test(name),false,name);
}
for(const name of ['ラッシュ','フレアラッシュ','ガイアスラッシュ','突進','急降下','ダイブ','ランページ','チャージ',
  'クラッシュラッシュ','ラッシュクラッシュ','クラッシュ突進','ダイブクラッシュ']){
  assert.equal(current.chargeRule.pattern.test(name),true,name);
}
// Keep independent form/requirement selection for deliberate mixed names.
const source={entityKind:'monster',tags:['capability:charge']};
for(const name of ['クラッシュラッシュ','クラッシュ突進','ダイブクラッシュ']){
  const form=current.skillFormFor(source,[name]);
  assert.equal(form,'strike');
  assert.deepEqual(plain(current.skillRequirementsFor(source,[name],form).requiredAll),['capability:charge']);
}
const diffs=[];
const equipmentDiffs=[];
for(const card of current.cards){
  const old=previous.cards.find(candidate=>candidate.id===card.id);
  assert(old);
  if(affected.includes(card.id)){
    assert.equal(card.form,'strike');
    assert.deepEqual(plain(old.requirements.requiredAll),['capability:charge']);
    assert.deepEqual(plain(card.requirements.requiredAll),[]);
    const expected=plain(old);expected.requirements.requiredAll=[];
    assert.deepEqual(plain(card),expected,'only the false requirement may change');
    diffs.push({id:card.id,name:card.name,form:card.form,before:plain(old.requirements.requiredAll),after:[]});
  }else assert.deepEqual(plain(card),plain(old),`unrelated card ${card.id}`);
  assert.deepEqual(plain(current.skillBattleMotionForMove(current.skillToMove(card.id))),
    plain(previous.skillBattleMotionForMove(previous.skillToMove(card.id))),`motion ${card.id}`);
  for(const unit of current.units){
    const before=previous.isSkillAllowedForMonster(card.id,unit);
    const after=current.isSkillAllowedForMonster(card.id,unit);
    if(before!==after){
      assert(affected.includes(card.id));assert.equal(before,false);assert.equal(after,true);
      equipmentDiffs.push({skillId:card.id,unitId:unit.id});
    }
  }
}
assert.equal(diffs.length,4);
for(const unit of current.units){
  for(const level of [1,7,30,100]){
    assert.deepEqual(plain(current.defaultSkillIdsForMonster(unit,{level})),
      plain(previous.defaultSkillIdsForMonster(unit,{level})),`initial loadout ${unit.id} Lv${level}`);
  }
}
assert.equal(current.isSkillAllowedForMonster('skill_icegolem_03',current.units.find(unit=>unit.id==='aquaron'),{allowDeprecated:true}),true);
assert.equal(current.isSkillAllowedForMonster('skill_proto_icegolem_05',current.units.find(unit=>unit.id==='slime')),false,'exclusive Golem restriction remains');
console.log(JSON.stringify({cardsCompared:current.cards.length,equipmentPairsCompared:current.cards.length*current.units.length,diffs,equipmentDiffs},null,2));
