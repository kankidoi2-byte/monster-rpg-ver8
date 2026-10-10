import {legacyCardProjection} from './skill110-legacy-projection.mjs';
import {retiredReservations} from './retired-dex-reservations-baseline.mjs';
import {applyNormalHealingSpec} from './normal-healing-baseline.mjs';
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
for(const file of ['skill-synthesis','skill-synthesis-ui','dex','skill-dex','battle-ui'])vm.runInContext(read(file),r.context);
const expected={skill_grassbeat_04:['poison',60],skill_grassbeat_05:['sleep',70],skill_grassbeat_06:['poison',70],skill_volteck_04:['paralysis',30],skill_volteck_05:['paralysis',80],skill_volteck_06:['paralysis',50],skill_nemes_04:['confusion',60],skill_nemes_05:['poison',40],skill_goblin_03:['poison',50],skill_kimeragna_01:['poison',40],skill_kimeragna_apex_01:['poison',60]};
const flavor={"skill_grassbeat_04": "毒を帯びた針で攻撃する。", "skill_grassbeat_05": "眠りを誘う粉をまく。", "skill_grassbeat_06": "猛毒の植物で相手を包み込んで攻撃する。", "skill_volteck_04": "強力な電撃で攻撃する。", "skill_volteck_05": "しびれる電撃で攻撃する。", "skill_volteck_06": "激しい雷嵐で攻撃する。", "skill_nemes_04": "幻覚を見せて攻撃する。", "skill_nemes_05": "毒を含んだ息吹で攻撃する。", "skill_kimeragna_01": "猛毒をまとった風の斬撃で攻撃する。", "skill_kimeragna_apex_01": "天空から猛毒をまとった斬撃を放つ。", "skill_goblin_03": "毒を塗った短剣で切りつける。"};
const shortEffects={"poison": "相手を毒状態にすることがある。", "paralysis": "相手を麻痺させることがある。", "confusion": "相手をこんらんさせることがある。", "sleep": "相手をねむり状態にする。"};
const labels={poison:'毒',paralysis:'麻痺',confusion:'こんらん',sleep:'ねむり'};
const json=x=>JSON.parse(JSON.stringify(x));
const cards=json(r.run('MOVE_CARDS.filter(sk=>!sk.id.startsWith("s110_"))'));
assert.deepEqual(cards.filter(s=>Object.keys(labels).includes(s.effect)).map(s=>s.id).sort(),Object.keys(expected).sort());
for(const sk of cards){
 const arg=JSON.stringify(sk.id),move=json(r.run(`skillToMove(${arg})`)),oldMove=json(before.run(`skillToMove(${arg})`));
 if(expected[sk.id]){
  const [effect,percent]=expected[sk.id];assert.equal(sk.effect,effect);assert.equal(sk.chance??.5,percent/100);
  // Only move[6] (演出文) and derived card.desc may differ.
  move[6]=oldMove[6];assert.deepEqual(move,oldMove,'all performance/equipment data unchanged: '+sk.id);
  const oldCard=json(before.run(`SKILL_BY_ID[${arg}]`));assert.deepEqual(legacyCardProjection({...sk,desc:oldCard.desc,customDesc:oldCard.customDesc}),legacyCardProjection(oldCard));
  const text=r.run(`moveEffectText(skillToMove(${arg}),{includeBase:false})`);
  assert.equal(text,flavor[sk.id]+shortEffects[effect],'exact approved description');
  assert(!/[0-9%％]|ターン|回の行動/.test(text),'no numeric status details');
  const html=r.run(`renderUnitSkillList({...by(${JSON.stringify(sk.sourceUnitId)}),moves:by(${JSON.stringify(sk.sourceUnitId)}).legacyMoves})`);assert(html.includes(text));
  r.run(`save=initSave();save.instances=[];save.party=[];var ins=addInstance(${JSON.stringify(sk.sourceUnitId)},1);save.party=[ins.uid];save.skillCards=Object.fromEntries(MOVE_CARDS.map(s=>[s.id,10]));editingSkillUid=ins.uid;renderSkillEdit();showSkillDexDetail(${arg},false);`);
  assert(!r.elements.get('skillCardList').innerHTML.includes(`equipSkill('${sk.id}')`),'retired skills excluded from new equipment');
  for(const multi of [false,true]){r.run(`multiBattle={active:${multi}}`);assert(r.run(`battleUiSkillInfo(skillToMove(${arg}))`).includes(text));}
 }else{
  assert.deepEqual(legacyCardProjection(sk),legacyCardProjection(json(before.run(`SKILL_BY_ID[${arg}]`))),'non-target card unchanged: '+sk.id);
  for(const opts of ['',',{includeBase:false}'])assert.equal(r.run(`moveEffectText(skillToMove(${arg})${opts})`),before.run(`moveEffectText(skillToMove(${arg})${opts})`));
 }
}
// Whole-source freeze retired: user authorized combat, save, equipment and catalog migration.
assert.equal(r.run('EQUIPPABLE_MOVE_CARDS.length'),110);
for(const sk of r.run('SKILL110_CATALOG.filter(sk=>sk.tactical.status)')){assert(!/[0-9%％]|ターン/.test(sk.customDesc));assert(sk.detailedDesc.includes('%'));}
assert.deepEqual(json(r.run('BATTLE_STATUS_EFFECTS.poison')),{duration:3,maxHpDamageRate:.10});
const help=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').match(/<details id="skillDexStatusHelp"[\s\S]*?<\/details>/)[0];
for(const text of ['しばらくの間、少しずつHPが減る。','体がしびれて、動けないことがある。','行動に失敗したり、自分を攻撃してしまうことがある。','しばらく眠ってしまい、行動できない。'])assert(help.includes(text));
console.log('PASS legacy11 status descriptions and316 compatibility records; new status short/detail split and unchanged duration/poison rules.');
