// Test-only instrumentation: observe each subtraction before the next statement,
// plus real presentation/history callbacks and update's entry (before correction).
function installSingleHpProbe(strict=true) {
  const original={doAttack,battleHpResult:globalThis.battleHpResult,captureBattleLog:globalThis.captureBattleLog,update};
  const observations=[],events=[],actual=[];
  globalThis.singleHpProbe=(stage)=>{
    observations.push({stage,pHp,eHp});
    if(strict&&(pHp<0||eHp<0))throw Error(`${stage}: negative HP ${pHp}/${eHp}`);
  };
  const expression=/([pe]Hp)\s*(?:-=\s*(dmg|8|recoilDamage|secondDmg)|=\s*Math\.max\(0,\s*\1\s*-\s*(dmg|8|recoilDamage|secondDmg)\))\s*;/g;
  let count=0;
  doAttack=eval('('+doAttack.toString().replace(expression,statement=>{count++;return '{'+statement+'singleHpProbe("assignment");}';})+')');
  if(count!==8)throw Error(`Expected 8 observed subtractions, got ${count}`);
  globalThis.battleHpResult=(...args)=>{
    singleHpProbe('presentation');
    events.push([args[0],Math.max(0,args[1]),Math.max(0,args[2]),args[3]]);
    if(original.battleHpResult)original.battleHpResult(...args);
  };
  globalThis.captureBattleLog=(...args)=>{singleHpProbe('history');if(original.captureBattleLog)original.captureBattleLog(...args);};
  update=(...args)=>{singleHpProbe('update-entry');return original.update(...args);};
  const tacticalOriginal=resolveTacticalSkillEffects,linkOriginal=applyPlayerKokoroLinkLifeSteal;
  resolveTacticalSkillEffects=(move,isPlayer,a,b,damage)=>{actual.push(['tactical',damage]);return tacticalOriginal(move,isPlayer,a,b,damage);};
  applyPlayerKokoroLinkLifeSteal=damage=>{actual.push(['link',damage]);return linkOriginal(damage);};
  return {observations,events,actual,restore(){
    doAttack=original.doAttack;update=original.update;
    globalThis.battleHpResult=original.battleHpResult;globalThis.captureBattleLog=original.captureBattleLog;
    resolveTacticalSkillEffects=tacticalOriginal;applyPlayerKokoroLinkLifeSteal=linkOriginal;
    delete globalThis.singleHpProbe;
  }};
}
function singleHpCases(){
  const cases=[];
  for(const isPlayer of [true,false])for(const options of [
    {name:'normal-overkill',targetHp:3}, {name:'normal-exact',targetHp:40},
    {name:'normal-healthy',targetHp:500},
    {name:'fixed-overkill',effect:'recoil',actorHp:3},
    {name:'fixed-exact',effect:'recoil',actorHp:8},
    {name:'fixed-healthy',effect:'recoil',actorHp:100},
    {name:'alchemy-overkill',effect:'alchemy_recoil',actorHp:3,targetHp:100},
    {name:'alchemy-exact',effect:'alchemy_recoil',actorHp:10,targetHp:100},
    {name:'alchemy-healthy',effect:'alchemy_recoil',actorHp:100,targetHp:100},
    {name:'alchemy-minimum',effect:'alchemy_recoil',actorHp:1,targetHp:3},
    {name:'repeat-overkill',effect:'repeat_attack',targetHp:50},
    {name:'repeat-exact',effect:'repeat_attack',targetHp:80},
    {name:'repeat-healthy',effect:'repeat_attack',targetHp:500},
    {name:'repeat-first-ko',effect:'repeat_attack',targetHp:3},
    {name:'guard-shield',guard:true,shield:true,targetHp:3},
    {name:'repeat-guard-shield',guard:true,shield:true,effect:'repeat_attack',targetHp:20},
    {name:'barrier',barrier:true,targetHp:3},
    {name:'barrier-zero',barrierZero:true,effect:'alchemy_recoil',actorHp:1},
    {name:'recoil-immune',immune:true,effect:'recoil',actorHp:3},
    {name:'alchemy-immune',immune:true,effect:'alchemy_recoil',actorHp:3},
    {name:'legacy-drain',effect:'drain',actorHp:10,targetHp:3},
    {name:'actual-drain',skill:'skill_seralphia_03',actorHp:10,targetHp:7},
    {name:'link-drain',link:true,actorHp:10,targetHp:7},
    {name:'simultaneous-fixed',effect:'recoil',actorHp:3,targetHp:3},
    {name:'simultaneous-alchemy',effect:'alchemy_recoil',actorHp:1,targetHp:3}
  ])cases.push({isPlayer,...options});
  return cases;
}
async function singleHpScenario(options,strict=true){
  const {isPlayer,effect=null,targetHp=500,actorHp=100,guard=false,shield=false,skill,link=false}=options;
  if(typeof clearTutorialUi==='function')clearTutorialUi();
  save=initSave();save.instances=[];save.party=[];
  save.progress.tutorial=tutorialSaveDefaults({legacy:true});
  const ins=addInstance(isPlayer?'seralphia':'slime',10);save.party=[ins.uid];prepareBattleParty();
  beginChosenBattle('grassland',isPlayer?'slime':'seralphia','normal');
  const originals={random:Math.random,playerAttackInstanceMultiplier,enemyDifficultyAttackMultiplier,huntMapAttackMultiplier,resolvePlayerIncomingDamage,consumeKokoroLinkRecoilGuard};
  Math.random=()=>0;playerAttackInstanceMultiplier=()=>1;enemyDifficultyAttackMultiplier=()=>1;huntMapAttackMultiplier=()=>1;
  pAtk=eAtk=1;pFlareCharge=eFlareCharge=false;
  pGuard=!isPlayer&&guard;eGuard=isPlayer&&guard;pAquaShield=!isPlayer&&shield;eAquaShield=isPlayer&&shield;
  pHp=isPlayer?actorHp:targetHp;eHp=isPlayer?targetHp:actorHp;partyBattle[0].hp=pHp;
  consumeKokoroLinkRecoilGuard=()=>!!options.immune;
  if(options.barrier||options.barrierZero)resolvePlayerIncomingDamage=damage=>({hpDamage:options.barrierZero?0:Math.max(0,damage-10),absorbed:options.barrierZero?damage:Math.min(10,damage),barrierRemaining:0});
  if(link&&isPlayer)kokoroLinkBattleState.linksByTargetUid.set(activeInstance.uid,{targetUid:activeInstance.uid,effects:{attackMultiplier:1},powerAbility:{id:'life_steal',charges:1,damageRate:.2,maxHpRateCap:.1}});
  const probe=installSingleHpProbe(strict);
  try{
    const move=skill?skillToMove(skill):['HP検証',40,'normal',effect,1,null,null,null,'skill_slime_01'];
    await doAttack(isPlayer?player:enemy,isPlayer?enemy:player,move,isPlayer);
    singleHpProbe('after-attack');
    const result={name:options.name,isPlayer,pHp,eHp,events:probe.events,actual:probe.actual,log:document.getElementById('log').innerHTML,
      guards:[pGuard,eGuard,pAquaShield,eAquaShield],observations:probe.observations};
    if(effect==='repeat_attack'){
      const extra=probe.events.filter(e=>e[3].label==='追加攻撃');
      if(extra.length!==(options.name==='repeat-first-ko'?0:1))throw Error('repeat count');
    }
    if(!probe.observations.some(o=>o.stage==='assignment')||!probe.observations.some(o=>o.stage==='history'))throw Error('missing immediate/history observations');
    return result;
  }finally{
    probe.restore();for(const [name,fn] of Object.entries(originals))if(name==='random')Math.random=fn;else globalThis[name]=fn;
  }
}
