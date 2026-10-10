import {legacyUnitProjection} from './skill110-legacy-projection.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runtime,seeded} from '../tools/balance-audit/runtime.mjs';

const id='skill_false_dragon_gamma_01';
const current='["胞子弾",82,"grass",null,null,4,';
const previous='["胞子弾",82,"grass",null,null,null,';
const before=runtime({data:source=>{assert.equal(source.split(current).length,2);return source.replace(current,previous);}});
const after=runtime();
const json=value=>JSON.parse(JSON.stringify(value));
const oldCards=json(before.run('MOVE_CARDS'));
const newCards=json(after.run('MOVE_CARDS'));
assert.equal(before.run(`SKILL_BY_ID['${id}'].cost`),5);
assert.equal(after.run(`SKILL_BY_ID['${id}'].cost`),4);
assert.deepEqual(newCards.map(card=>card.id===id?{...card,cost:5}:card),oldCards,'only target COST changes across all card fields');
assert.deepEqual(json(after.run('M')).map(legacyUnitProjection).map(mon=>({...mon,moves:mon.moves.map(move=>move[8]===id?move.map((value,index)=>index===5?null:value):move)})),json(before.run('M')).map(legacyUnitProjection));
const report={baseline:'7bb99c2ca690b02a2cbabc589d7bf523d72d6283',changedDefaults:[],comparison:[],gacha:{},checks:{}};
assert.equal(after.run('M.length'),100);
let checked=0;
for(const mon of json(after.run('M')))for(let level=1;level<=100;level++){
  const expression=`defaultSkillIdsForMonster(by('${mon.id}'),{level:${level}})`;
  const old=json(before.run(expression)),ids=json(after.run(expression));
  const valid=after.run(`(${JSON.stringify(ids)}).every(id=>SKILL_BY_ID[id]&&isSkillAllowedForMonster(id,by('${mon.id}')))`);
  assert(valid,`${mon.id} Lv${level}: ID/eligibility`);
  assert(ids.length>0&&ids.length<=3);
  assert(after.run(`(${JSON.stringify(ids)}).reduce((sum,id)=>sum+SKILL_BY_ID[id].cost,0)<=skillCostLimitFor(by('${mon.id}'),{level:${level}})`));
  assert(after.run(`(${JSON.stringify(ids)}).some(id=>SKILL_BY_ID[id].power>0)`),`${mon.id} Lv${level}: attack`);
  if(JSON.stringify(old)!==JSON.stringify(ids))report.changedDefaults.push({unit:mon.id,level,before:old,after:ids});
  checked++;
}
assert.deepEqual(report.changedDefaults.map(row=>[row.unit,row.level]),[]);
const combo=json(after.run(`MOVE_CARDS.filter(card=>['胞子弾','守りを固める','癒しの芽吹き'].includes(card.name)).map(card=>card.id)`));
assert.equal(combo.length,3);
assert.equal(after.run(`(${JSON.stringify(combo)}).reduce((sum,id)=>sum+SKILL_BY_ID[id].cost,0)`),8);
assert(after.run(`(${JSON.stringify(combo)}).every(id=>SKILL_BY_ID[id].deprecated)`),'legacy combo remains readable but not newly equippable');
assert.equal(after.run(`skillCostLimitFor(by('false_dragon_gamma'),{level:1})`),8);
for(const r of [before,after]){
  const inventory=Object.fromEntries(oldCards.filter(card=>!card.id.startsWith('s110_')).map(card=>[card.id,7]));
  const fixture={saveMeta:{migrations:['equipped_skill_cards_v1']},instances:[{uid:'morg-1',id:'false_dragon_gamma',level:1,exp:7},{uid:'morg-16',id:'false_dragon_gamma',level:16,exp:22},{uid:'starter',id:'freigal',level:4,exp:3}],party:['morg-16','starter','morg-1'],skillCards:inventory,equippedSkills:{'morg-1':[id],'morg-16':[id,'skill_false_dragon_gamma_03'],starter:['skill_freigal_01']}};
  r.context.fixtureRaw=JSON.stringify(fixture);
  r.run('save=parseAndPrepareSave(fixtureRaw,[]);migrateSkillSystem()');
  const fields='({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})';
  const first=json(r.run(fields));
  assert.deepEqual(first.party,fixture.party);
  for(const [oldId,n] of Object.entries(inventory)){const mapped=r.run(`canonicalSkillId('${oldId}')`);assert(first.skillCards[mapped]>=n,'mapped inventory retains cards');}
  assert.deepEqual(first.instances.map(({uid,id,level,exp})=>({uid,id,level,exp})),fixture.instances);
  r.run('save=parseAndPrepareSave(JSON.stringify(save),[]);migrateSkillSystem()');
  assert.deepEqual(json(r.run(fields)),first,'save reload and repeated migration preserve all fields');
}
for(const kind of ['monster','character'])assert(after.run(`skillGachaPool('${kind}').every(card=>card.id.startsWith('s110_')&&card.cost!==25)`));
let damageComparisons=0;
for(const defender of ['slime','aquaron','grassbeat','nemesion','doom_nemesion'])for(const level of [1,16,100])for(const guard of [false,true])for(const seed of [1,42,1234]){
  for(const r of [before,after]){
    r.context.Math.random=seeded(seed);
    r.run(`save=initSave();save.instances=[];save.party=[];var ins=addInstance('false_dragon_gamma',${level});save.party=[ins.uid];prepareBattleParty();selectedMap=MAPS[0];enemy=by('${defender}');activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[]);pHp=1000;eHp=1000;pAtk=eAtk=1;pGuard=false;eGuard=${guard};pAquaShield=eAquaShield=false;pFlareCharge=eFlareCharge=false;`);
    await r.run(`doAttack(by('false_dragon_gamma'),enemy,skillToMove('${id}'),true)`);
  }
  assert.equal(after.run('eHp'),before.run('eHp'),'identical damage with identical random seed');
  damageComparisons++;
}
report.checks={cardFieldsExceptCostUnchanged:true,monsterFieldsExceptCostUnchanged:true,allInitialLoadouts:checked,level1ComboCost:8,saveReloadPreserved:true,noAutomaticSkillAddition:true,damageComparisons};
if(process.argv.includes('--report'))fs.writeFileSync(new URL('../docs/morglum-spore-cost-20261005.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({result:'PASS',...report.checks,changedLevels:report.changedDefaults.map(row=>row.level)}));
