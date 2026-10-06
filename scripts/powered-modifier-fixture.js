// Shared production-runtime fixture; never loaded by the game.
async function poweredModifierScenario({skillId,mode='single',direction='player',control=false,zero=false,cap=false,guard=false,shield=false,half=false,resist=false,miss=false,barrier=false,kill=false}) {
  if(typeof clearTutorialUi==='function')clearTutorialUi();
  save=initSave();save.instances=[];save.party=[];save.progress.tutorial=tutorialSaveDefaults({legacy:true});Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
  const move=skillToMove(skillId), owner=SKILL_BY_ID[skillId].sourceUnitId;
  const isPlayer=direction==='player', defenderPlayer=direction==='enemy-player';
  save.party=[addInstance(isPlayer?owner:'slime',10).uid];prepareBattleParty();
  const request=createHuntRequest(MAPS[0],by(isPlayer?'slime':owner),'normal',[]);
  request.battleMode=mode==='multi'?'three_way':'single';request.secondEnemyId='slime';
  beginChosenBattle('grassland',isPlayer?'slime':owner,'normal',request);
  if(mode==='invasion'){activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionEnemyId='slime';activeHuntRequest.invasionTurn=0;if(!triggerInvasionIfDue())throw Error('invasion did not trigger');}
  const originals={random:Math.random,playerAttackInstanceMultiplier,enemyDifficultyAttackMultiplier,huntMapAttackMultiplier,enemyKokoroLinkMisses,resolvePlayerIncomingDamage,appendMultiLog,battleHpResult:globalThis.battleHpResult};
  const hits=[],logs=[];
  appendMultiLog=message=>{logs.push(message);return originals.appendMultiLog(message);};
  Math.random=()=>0;playerAttackInstanceMultiplier=()=>1;enemyDifficultyAttackMultiplier=()=>1;huntMapAttackMultiplier=()=>1;enemyKokoroLinkMisses=()=>miss;
  if(barrier)resolvePlayerIncomingDamage=()=>({hpDamage:0,absorbed:999,barrierRemaining:0});
  globalThis.battleHpResult=(...args)=>{hits.push([args[0],args[1],args[2],args[3]]);if(originals.battleHpResult)originals.battleHpResult(...args);};
  const initial=cap?(move[3]==='buff'?1.55:.7):1;
  pHp=eHp=500;pAtk=eAtk=initial;pGuard=eGuard=guard;pAquaShield=eAquaShield=shield;pFlareCharge=eFlareCharge=false;
  if(half)activeHuntRequest.conditions=[{id:'healing_half'}];
  const multi=mode!=='single',entries=multi?multiBattle.enemies:[];
  for(const e of entries){e.hp=500;e.attack=initial;e.guard=guard;e.aquaShield=shield;e.flareCharge=false;e.sleepTurns=e.paralysisTurns=e.confusionTurns=0;}
  const actor=isPlayer?{kind:'player'}:entries[0],target=defenderPlayer?{kind:'player'}:entries[isPlayer?0:1];
  const attackTarget=isPlayer?enemy:player;
  const defender=multi?(defenderPlayer?player:target.mon):attackTarget;
  const oldTypes=defender.types;defender.types=resist?['dragon']:['normal'];
  if(kill){if(multi){if(defenderPlayer)pHp=1;else target.hp=1;}else if(isPlayer)eHp=1;else pHp=1;}
  if(zero)move[1]=0;if(control)move[3]=null;
  const before={pHp,eHp,enemyHp:entries.map(e=>e.hp),pAtk,eAtk,attacks:entries.map(e=>e.attack)};
  try{
    if(multi)await performMultiAttack(actor,target,move);else await doAttack(isPlayer?player:enemy,isPlayer?enemy:player,move,isPlayer);
    return {before,pHp,eHp,pAtk,eAtk,enemyHp:entries.map(e=>e.hp),attacks:entries.map(e=>e.attack),alive:entries.map(e=>e.alive),attribution:entries.map(e=>e.defeatedByPlayer),guards:[pGuard,eGuard,...entries.map(e=>e.guard)],shields:[pAquaShield,eAquaShield,...entries.map(e=>e.aquaShield)],hits,log:multi?logs.join('<br>'):document.getElementById('log').innerHTML,move,action:typeof battleFeedback==='undefined'?'':(battleFeedback.history.filter(entry=>entry.kind==='target').at(-1)?.text||'')};
  }finally{defender.types=oldTypes;for(const [n,f]of Object.entries(originals))if(n==='random')Math.random=f;else globalThis[n]=f;}
}
function poweredModifierCases(){const cases=[];for(const skillId of ['skill_shenhairon_02','skill_nightmare_02','skill_noxvelg_02'])for(const mode of ['single','multi','invasion'])for(const direction of mode==='single'?['player','enemy-player']:['player','enemy-player','enemy-enemy'])for(const option of [{},{cap:true},{guard:true,shield:true},{half:true},{resist:true},{kill:true},{zero:true},...(direction==='player'?[]:[{miss:true}]),...(direction==='enemy-player'?[{barrier:true}]:[])])cases.push({skillId,mode,direction,...option});return cases;}
