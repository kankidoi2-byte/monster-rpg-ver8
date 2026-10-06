import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
import {applyStatusDataCopy,applyStatusCoreCopy} from './status-description-copy-baseline.mjs';
const base='a546894691f243aeb41de9e1a46f4c66e299bc28';
const read=n=>fs.readFileSync(new URL('../js/'+n+'.js',import.meta.url),'utf8');
const original=n=>execFileSync('git',['show',base+':js/'+n+'.js'],{encoding:'utf8'});
const before=runtime({data:()=>original('data'),core:()=>original('core')}),r=runtime();
r.context.document.addEventListener=()=>{};
for(const file of ['dex','skill-dex','battle-ui'])vm.runInContext(read(file),r.context);
const expected={skill_grassbeat_04:['poison',60],skill_grassbeat_05:['sleep',70],skill_grassbeat_06:['poison',70],skill_volteck_04:['paralysis',30],skill_volteck_05:['paralysis',80],skill_volteck_06:['paralysis',50],skill_nemes_04:['confusion',60],skill_nemes_05:['poison',40],skill_goblin_03:['poison',50],skill_kimeragna_01:['poison',40],skill_kimeragna_apex_01:['poison',60]};
const details={poison:'3ターン継続し、各ターン終了時に最大HPの10%ダメージ（端数切り捨て、最低1ダメージ）',paralysis:'3回の行動まで継続し、行動時30%で行動不能（行動できた場合も残り回数を消費）',confusion:'2～3回の行動まで継続し、行動時50%で通常行動、25%で行動不能、25%で自分を攻撃',sleep:'2回の行動まで継続し、行動時に行動不能'};
const labels={poison:'毒',paralysis:'麻痺',confusion:'こんらん',sleep:'ねむり'};
const json=x=>JSON.parse(JSON.stringify(x));
const cards=json(r.run('MOVE_CARDS'));
assert.deepEqual(cards.filter(s=>Object.keys(labels).includes(s.effect)).map(s=>s.id).sort(),Object.keys(expected).sort());
for(const sk of cards){
 const arg=JSON.stringify(sk.id),move=json(r.run(`skillToMove(${arg})`)),oldMove=json(before.run(`skillToMove(${arg})`));
 if(expected[sk.id]){
  const [effect,percent]=expected[sk.id];assert.equal(sk.effect,effect);assert.equal(sk.chance??.5,percent/100);
  // Only move[6] (演出文) and derived card.desc may differ.
  move[6]=oldMove[6];assert.deepEqual(move,oldMove,'all performance/equipment data unchanged: '+sk.id);
  const oldCard=json(before.run(`SKILL_BY_ID[${arg}]`));assert.deepEqual({...sk,desc:oldCard.desc,customDesc:oldCard.customDesc},oldCard);
  const text=r.run(`moveEffectText(skillToMove(${arg}),{includeBase:false})`);
  assert(text.startsWith(`${percent}%で相手を${labels[effect]}状態にする。${details[effect]}`));
  assert.equal(text.split(`相手を${labels[effect]}状態にする`).length-1,1,'no duplicate effect');
  if(sk.customDesc)assert(!/確率|状態|ターン|麻痺|しびれ|判断/.test(sk.customDesc),'flavor only: '+sk.id);
  const html=r.run(`renderUnitSkillList(by(${JSON.stringify(sk.sourceUnitId)}))`);assert(html.includes(text));
  r.run(`save=initSave();save.instances=[];save.party=[];var ins=addInstance(${JSON.stringify(sk.sourceUnitId)},1);save.party=[ins.uid];save.skillCards=Object.fromEntries(MOVE_CARDS.map(s=>[s.id,10]));editingSkillUid=ins.uid;renderSkillEdit();showSkillDexDetail(${arg},false);`);
  assert(r.elements.get('skillCardList').innerHTML.includes(text));assert(r.elements.get('skillDexDetail').innerHTML.includes(text));
  for(const multi of [false,true]){r.run(`multiBattle={active:${multi}}`);assert(r.run(`battleUiSkillInfo(skillToMove(${arg}))`).includes(text));}
 }else{
  assert.deepEqual(sk,json(before.run(`SKILL_BY_ID[${arg}]`)),'non-target card unchanged: '+sk.id);
  for(const opts of ['',',{includeBase:false}'])assert.equal(r.run(`moveEffectText(skillToMove(${arg})${opts})`),before.run(`moveEffectText(skillToMove(${arg})${opts})`));
 }
}
assert.equal(read('data'),applyStatusDataCopy(original('data')),'exact nine flavor edits, no other data changes');
assert.equal(read('core'),applyStatusCoreCopy(original('core')),'exact four shared description edits, no logic changes');
for(const name of ['battle-rules','multi-battle','save','skills','dex','skill-dex','battle-ui'])assert.equal(read(name),original(name),'unchanged production logic/callers: '+name);
assert.deepEqual(json(r.run('BATTLE_STATUS_EFFECTS.poison')),{duration:3,maxHpDamageRate:.10});
console.log('PASS status descriptions: all 11 skills, equipment/unit dex/skill dex/single+multi battle text; all 316 cards compared; nine flavor edits and four shared descriptions only; battle/save/eligibility unchanged.');
