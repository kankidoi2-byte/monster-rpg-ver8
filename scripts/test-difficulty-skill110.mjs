import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime(),run=r.run;
run(`function tierSkillSetup(primaryMultiplier){
 save=initSave();save.instances=[];save.party=[];const instance=addInstance('slime',10);save.party=[instance.uid];prepareBattleParty();
 player=structuredClone(by('slime'));enemy=structuredClone(by('slime'));player.types=enemy.types=['normal'];activeInstance=instance;
 activeHuntRequest={difficultyId:'d5',enemyId:'slime',enemyLevel:10,enemyHp:10000,attackMultiplier:primaryMultiplier,rewardMultiplier:7.2,conditions:[]};
 selectedMap=MAPS[0];pHp=playerMaxHp();eHp=10000;pAtk=eAtk=1;pGuard=eGuard=false;pAquaShield=eAquaShield=false;pFlareCharge=eFlareCharge=false;
 pStatus=eStatus=null;pPoisonTurns=ePoisonTurns=pParalysisTurns=eParalysisTurns=pConfusionTurns=eConfusionTurns=pSleepTurns=eSleepTurns=0;
 const entries=[createMultiEnemy(enemy,'enemy_a'),createMultiEnemy(enemy,'enemy_b')];
 entries.forEach(e=>{e.level=10;e.hp=e.maxHp=10000;e.mon.types=['normal'];});
 multiBattle={active:true,enemies:entries};Math.random=()=>0;
 enemyKokoroLinkMisses=()=>false;enemyKokoroLinkAttackMultiplier=()=>1;kokoroLinkEffectForInstance=()=>null;
}
var tierSkillMove=['難易度検査',50,'normal','tactical',null,1,'',null,'s110_tier_fixture',{}];`);
async function damage(multiplier,index,target='player',hits=1){
 run(`tierSkillSetup(${multiplier});tierSkillMove[9]={hits:${hits}}`);
 const before=run(target==='player'?'pHp':`multiBattle.enemies[${1-index}].hp`);
 await run(`performMultiAttack(multiBattle.enemies[${index}],${target==='player'?"{kind:'player'}":`multiBattle.enemies[${1-index}]`},tierSkillMove)`);
 return before-run(target==='player'?'pHp':`multiBattle.enemies[${1-index}].hp`);
}
for(const target of ['player','enemy'])for(const hits of [1,2,3]){
 const baseline=await damage(1,1,target,hits);
 assert.equal(await damage(1.8,1,target,hits),baseline,`ordinary secondary skill110 ${hits}-hit against ${target} must not inherit nushi multiplier`);
 const primary=await damage(1.8,0,target,hits);
 const expected=run('Math.max(1,Math.floor(50*1.8*battleStatDamageMultiplier(enemy,10,player,10)))');
 assert.equal(primary,expected,`primary nushi skill110 ${hits}-hit keeps its own multiplier against ${target}`);
 assert.ok(primary>baseline);
}
run('tierSkillSetup(1.8);multiBattle=null');
const before=run('pHp');await run('doAttack(enemy,player,tierSkillMove,false)');
assert.equal(before-run('pHp'),run('Math.floor(50*1.8*battleStatDamageMultiplier(enemy,10,player,10))'),'single enemy keeps global request multiplier');
console.log('PASS skill110 per-enemy difficulty: ordinary secondary isolated from nushi; primary/single retain multiplier; player/enemy targets and 1/2/3 hits.');
