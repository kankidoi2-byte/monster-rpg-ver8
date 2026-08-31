/* Expedition prototype: battle-win progression, saved completion rewards, and instance locks. */
const EXPEDITION_DISTANCES=Object.freeze({
  short:Object.freeze({id:'short',label:'短距離',wins:1,rewardMultiplier:1,rareMultiplier:1}),
  medium:Object.freeze({id:'medium',label:'中距離',wins:3,rewardMultiplier:2,rareMultiplier:1.5}),
  long:Object.freeze({id:'long',label:'長距離',wins:5,rewardMultiplier:3,rareMultiplier:2})
});
const EXPEDITION_GREAT_RATES=Object.freeze({S:.30,A:.20,B:.10,C:.05,D:0});
const EXPEDITION_GOLDEN_MAP_RATES=Object.freeze({short:.01,medium:.03,long:.05});
const EXPEDITION_MAP_REWARDS=Object.freeze({
  grassland:['monster_bone','raptor_feather'], volcano:['unstable_alchemy_matter','fire_orb'],
  lake:['magic_crystal','water_mirror'], seikai_irie:['magic_crystal','water_mirror'],
  kaiyu_kaiiki:['magic_crystal','water_mirror'], deep_sea_end:['fine_magic_crystal','water_mirror'],
  snow_mountain:['magic_crystal','monster_bone'], forest:['monster_bone','venom_carapace'],
  light_plain:['magic_crystal','contract_scroll'], starry_plain:['magic_crystal','unstable_alchemy_matter'],
  highland_ruins:['metal_ore','fine_metal_ore'], arena:['metal_ore','monster_bone'],
  magic_academy:['magic_crystal','unstable_alchemy_matter'], ruined_village:['monster_bone','venom_carapace'],
  water_secret:['fine_magic_crystal','water_mirror'], kaen_village:['unstable_alchemy_matter','fire_orb']
});
const EXPEDITION_FINE_ITEM=Object.freeze({monster_bone:'fine_monster_bone',magic_crystal:'fine_magic_crystal',metal_ore:'fine_metal_ore',unstable_alchemy_matter:'fine_unstable_alchemy_matter',raptor_feather:'fine_raptor_feather',venom_carapace:'fine_venom_carapace'});
let expeditionSelectedMapId=null,expeditionSelectedDistanceId='short',expeditionSelectedUids=[];

function expeditionDiagnosticsSnapshot(){
  const expeditionSave=save?.expeditions&&typeof save.expeditions==='object'?save.expeditions:null;
  const completedCount=Math.max(0,Math.floor(Number(expeditionSave?.completedCount)||0));
  const expeditions=Array.isArray(expeditionSave?.active)?expeditionSave.active.filter(Boolean):[];
  const unlockedSlotCount=completedCount>=15?3:completedCount>=5?2:1;
  const usedSlotCount=expeditions.length;
  let visible=false;
  try{visible=document.querySelector('.screen.active')?.id==='expedition';}catch(_error){visible=false;}
  let destinations=[];
  try{destinations=expeditionDestinations();}catch(_error){destinations=[];}
  const destinationSelected=typeof expeditionSelectedMapId==='string'&&expeditionSelectedMapId.length>0;
  const destinationValid=destinationSelected&&destinations.some(map=>map?.id===expeditionSelectedMapId);
  const distanceValid=Boolean(EXPEDITION_DISTANCES[expeditionSelectedDistanceId]);
  let availableInstances=[];
  try{availableInstances=expeditionAvailableInstances();}catch(_error){availableInstances=[];}
  const availableUids=new Set(availableInstances.map(instance=>instance?.uid).filter(Boolean));
  const selectedUids=Array.isArray(expeditionSelectedUids)?expeditionSelectedUids:[];
  const blockingReasons=[];
  if(usedSlotCount>=unlockedSlotCount)blockingReasons.push('slots_full');
  if(!destinationSelected)blockingReasons.push('destination_missing');
  else if(!destinationValid)blockingReasons.push('destination_unavailable');
  if(!distanceValid)blockingReasons.push('distance_invalid');
  if(!selectedUids.length)blockingReasons.push('no_members_selected');
  if(selectedUids.length>3)blockingReasons.push('member_count_exceeded');
  if(selectedUids.some(uid=>!availableUids.has(uid)))blockingReasons.push('member_unavailable');
  return {
    state:{
      visible,
      unlockedSlotCount,
      usedSlotCount,
      availableSlotCount:Math.max(0,unlockedSlotCount-usedSlotCount),
      completedCount,
      inProgressCount:expeditions.filter(entry=>entry?.status==='active').length,
      readyToClaimCount:expeditions.filter(entry=>entry?.status==='complete'&&Boolean(entry?.reward)).length
    },
    selection:{
      destinationSelected,
      destinationValid,
      distanceValid,
      selectedMemberCount:selectedUids.length,
      availableMemberCount:availableInstances.length,
      canDispatch:blockingReasons.length===0,
      blockingReasons
    },
    expeditions:expeditions.slice(0,3).map(entry=>({
      status:entry?.status==='active'||entry?.status==='complete'?entry.status:'unknown',
      progress:Math.max(0,Math.floor(Number(entry?.progress)||0)),
      requiredWins:Math.max(0,Math.floor(Number(entry?.requiredWins)||0)),
      memberCount:Array.isArray(entry?.memberUids)?entry.memberUids.length:0,
      rewardReady:Boolean(entry?.reward),
      tutorialPrologue:entry?.tutorialPrologue===true
    }))
  };
}

function normalizeExpeditionSave(){
  if(!save.expeditions||typeof save.expeditions!=='object')save.expeditions={completedCount:0,active:[]};
  save.expeditions.completedCount=Math.max(0,Math.floor(Number(save.expeditions.completedCount)||0));
  if(!Array.isArray(save.expeditions.active))save.expeditions.active=[];
  save.expeditions.active=save.expeditions.active.filter(entry=>entry&&Array.isArray(entry.memberUids)&&entry.memberUids.length>=1&&entry.memberUids.length<=3);
  save.expeditions.active.forEach(entry=>{
    const map=MAPS.find(x=>x.id===entry.mapId),distance=EXPEDITION_DISTANCES[entry.distanceId];
    if(!map||!distance)return;
    entry.requiredWins=distance.wins;
    entry.progress=Math.min(entry.requiredWins,Math.max(0,Math.floor(Number(entry.progress)||0)));
    entry.status=entry.status==='complete'?'complete':'active';
    if(!isValidExpeditionSuitability(entry.suitability))entry.suitability=expeditionSuitability(entry.memberUids,map);
  });
}
function expeditionUnlockedSlots(){const n=save.expeditions?.completedCount||0;return n>=15?3:n>=5?2:1;}
function isInstanceOnExpedition(uidValue){return !!save.expeditions?.active?.some(entry=>entry.memberUids.includes(uidValue));}
function expeditionDestinations(){return MAPS.filter(map=>!map.expeditionExcluded&&!(map.enemyIds||[]).some(id=>by(id)?.bossClass==='超ボス級'));}
function expeditionPreferredType(map){return HUNT_MAP_BOOST_TYPES[map?.id]||'normal';}
function expeditionRegionLabel(map){const type=expeditionPreferredType(map);return `${TYPE_ICONS[type]||'⚪'} ${TN[type]||'無'}地域`;}
function expeditionMemberScore(ins,map){
  const mon=by(ins?.id),type=expeditionPreferredType(map),level=Math.max(1,Number(ins?.level)||1);
  if(!mon)return {total:0,reasons:['データなし']};
  const attribute=(mon.types||[]).includes(type)?25:type==='normal'?(mon.types||[]).includes('normal')?25:12:5;
  const levelScore=Math.min(25,level*4);
  const attackPower=Math.max(10,...(mon.moves||[]).map(move=>Number(move[1])||0))*instanceStatModifier(ins,'attack');
  const attack=Math.min(18,Math.round(attackPower/5));
  const durability=Math.min(18,Math.round(instanceMaxHp(ins)/14));
  const speed=Math.min(14,Math.round(monSpd(mon,ins)/8));
  const strongest=Math.max(attack,durability,speed),strength=strongest===attack?'攻撃':strongest===durability?'耐久':'速度';
  return {total:attribute+levelScore+attack+durability+speed,reasons:[`${(mon.types||[]).includes(type)?'推奨属性一致':'属性補正なし'} ${attribute}点`,`Lv.${level} ${levelScore}点`,`${strength}適性が高い`]};
}
function expeditionSuitability(memberUids,map){
  const members=memberUids.map(getInstance).filter(Boolean),scores=members.map(ins=>expeditionMemberScore(ins,map));
  const shortage=(3-members.length)*45,total=Math.max(0,scores.reduce((sum,x)=>sum+x.total,0)-shortage);
  const grade=total>=235?'S':total>=180?'A':total>=125?'B':total>=70?'C':'D';
  const reasons=scores.flatMap((score,index)=>[`${by(members[index].id)?.name||'不明'}：${score.reasons.join('・')}`]);
  if(shortage)reasons.push(`人数不足：-${shortage}点`);
  return {grade,total,greatRate:EXPEDITION_GREAT_RATES[grade],reasons};
}
function isValidExpeditionSuitability(value){
  return !!value&&Object.hasOwn(EXPEDITION_GREAT_RATES,value.grade)&&Number.isFinite(Number(value.total))&&Number.isFinite(Number(value.greatRate))&&Array.isArray(value.reasons);
}
function expeditionRewardPlan(map,distance,suitability,randomFn=Math.random,completionFactor=1){
  const safeSuitability=isValidExpeditionSuitability(suitability)?suitability:{grade:'D',total:0,greatRate:0,reasons:[]};
  const great=randomFn()<safeSuitability.greatRate,boost=great?1.5:1,multiplier=distance.rewardMultiplier*boost*completionFactor;
  const coins=Math.max(0,Math.floor(24*multiplier));
  const exp=Math.max(0,Math.floor(18*multiplier));
  const pool=EXPEDITION_MAP_REWARDS[map.id]||['monster_bone','magic_crystal'];
  const primary=pool[0],secondary=pool[1];
  const rareChance=Math.min(.65,(great?.18:.08)*distance.rareMultiplier+(safeSuitability.grade==='S'?.08:safeSuitability.grade==='A'?.04:0));
  const itemId=randomFn()<rareChance?(EXPEDITION_FINE_ITEM[primary]||secondary):primary;
  const itemCount=Math.max(0,Math.floor(distance.rewardMultiplier*boost*completionFactor));
  const items=itemCount?{[itemId]:itemCount}:{};
  if(secondary&&randomFn()<rareChance*.65)items[secondary]=(items[secondary]||0)+1;
  if(completionFactor>=1&&randomFn()<(EXPEDITION_GOLDEN_MAP_RATES[distance.id]||0))items.golden_land_map=(items.golden_land_map||0)+1;
  return {great,coins,exp,items,rareFound:Object.keys(items).some(id=>id.startsWith('fine_')||id===secondary)};
}
function ensureExpeditionDom(){
  if(!document.getElementById('expeditionNav')){
    const shopButton=[...document.querySelectorAll('.menu button')].find(button=>button.textContent.includes('ショップ'));
    const button=document.createElement('button');button.id='expeditionNav';button.textContent='🧭遠征';button.onclick=showExpedition;
    (shopButton?.parentElement||document.querySelector('.menu'))?.insertBefore(button,shopButton||null);
  }
  if(!document.getElementById('expedition')){
    const section=document.createElement('section');section.id='expedition';section.className='screen';section.innerHTML='<h1>🧭 遠征</h1><div id="expeditionContent"></div>';
    document.querySelector('main')?.appendChild(section)||document.body.appendChild(section);
  }
}
function showExpedition(){ensureExpeditionDom();show('expedition');renderExpedition();}
function expeditionAvailableInstances(){return (save.instances||[]).filter(ins=>!(save.party||[]).includes(ins.uid)&&!isInstanceOnExpedition(ins.uid)&&by(ins.id));}
function selectExpeditionDestination(mapId){
  expeditionSelectedMapId=mapId;renderExpedition();
  if(typeof handleTutorialExpeditionDestinationSelected==='function')handleTutorialExpeditionDestinationSelected(mapId);
}
function selectExpeditionDistance(id){
  if(!EXPEDITION_DISTANCES[id])return;
  expeditionSelectedDistanceId=id;renderExpedition();
  if(typeof handleTutorialExpeditionDistanceSelected==='function')handleTutorialExpeditionDistanceSelected(id);
}
function toggleExpeditionMember(uidValue){
  const index=expeditionSelectedUids.indexOf(uidValue);
  if(index>=0)expeditionSelectedUids.splice(index,1);else if(expeditionSelectedUids.length<3&&expeditionAvailableInstances().some(ins=>ins.uid===uidValue))expeditionSelectedUids.push(uidValue);
  renderExpedition();
  if(typeof handleTutorialExpeditionMemberSelected==='function')handleTutorialExpeditionMemberSelected(uidValue,expeditionSelectedUids.includes(uidValue));
}
function startExpedition(){
  normalizeExpeditionSave();const snapshot=JSON.stringify(save),selectedSnapshot=[...expeditionSelectedUids];
  const map=MAPS.find(x=>x.id===expeditionSelectedMapId),distance=EXPEDITION_DISTANCES[expeditionSelectedDistanceId];
  const members=expeditionSelectedUids.map(getInstance).filter(ins=>ins&&expeditionAvailableInstances().some(x=>x.uid===ins.uid));
  if(!map||!expeditionDestinations().some(x=>x.id===map.id)){alert('遠征先を選んでください。');return false;}
  if(!distance){alert('距離を選んでください。');return false;}if(!members.length){alert('派遣するモンスターを1～3体選んでください。');return false;}
  if(save.expeditions.active.length>=expeditionUnlockedSlots()){alert('使用できる遠征枠がありません。');return false;}
  try{
    const suitability=expeditionSuitability(members.map(x=>x.uid),map);
    if(typeof registerMapDex==='function')registerMapDex(map.id);
    const entry={id:`exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,mapId:map.id,distanceId:distance.id,memberUids:members.map(x=>x.uid),progress:0,requiredWins:distance.wins,status:'active',suitability,reward:null};
    save.expeditions.active.push(entry);
    if(typeof commitTutorialExpeditionDispatch==='function'&&!commitTutorialExpeditionDispatch(entry))throw new Error('tutorial_expedition_dispatch');
    expeditionSelectedUids=[];
    if(typeof saveGame==='function'&&!saveGame())throw new Error('expedition_save');
    renderExpedition();renderParty();if(typeof renderPartySetup==='function')renderPartySetup();
    if(typeof handleTutorialExpeditionStarted==='function')handleTutorialExpeditionStarted(entry);
    return true;
  }catch(error){
    save=JSON.parse(snapshot);expeditionSelectedUids=selectedSnapshot;
    console.error('遠征を保存できませんでした。',error);
    if(typeof showUiNotice==='function')showUiNotice('遠征を保存できませんでした。もう一度お試しください。','warning');
    renderExpedition();return false;
  }
}
function progressActiveExpeditions(randomFn=Math.random){
  normalizeExpeditionSave();let changed=false;
  save.expeditions.active.forEach(entry=>{if(entry.status!=='active')return;const map=MAPS.find(x=>x.id===entry.mapId),distance=EXPEDITION_DISTANCES[entry.distanceId];if(!map||!distance)return;entry.progress=Math.min(entry.requiredWins,entry.progress+1);changed=true;if(entry.progress>=entry.requiredWins){entry.status='complete';entry.reward=expeditionRewardPlan(map,distance,entry.suitability,randomFn,1);}});
  if(changed)saveGame();return changed;
}
function grantExpeditionReward(entry,reward){
  save.coins=(save.coins||0)+(reward.coins||0);Object.entries(reward.items||{}).forEach(([id,count])=>{save.items[id]=(save.items[id]||0)+count;if(typeof registerItemDex==='function')registerItemDex(id);});
  entry.memberUids.map(getInstance).filter(Boolean).forEach(ins=>{if(isMaxLevel(ins.level)){ins.level=MAX_LEVEL;ins.exp=0;return;}ins.exp=(ins.exp||0)+(reward.exp||0);while(!isMaxLevel(ins.level)&&ins.exp>=needExp(ins.level)){ins.exp-=needExp(ins.level);ins.level++;}if(isMaxLevel(ins.level))ins.exp=0;checkEvolution(ins);});
}
function claimExpedition(id){const index=save.expeditions.active.findIndex(x=>x.id===id),entry=save.expeditions.active[index];if(!entry||entry.status!=='complete'||!entry.reward)return;const notice=`遠征報酬：コイン${entry.reward.coins}・EXP ${entry.reward.exp}`;grantExpeditionReward(entry,entry.reward);if(typeof grantContractorExpeditionComplete==='function')grantContractorExpeditionComplete(entry);save.expeditions.active.splice(index,1);save.expeditions.completedCount++;saveGame();renderExpedition();renderParty();if(typeof renderPartySetup==='function')renderPartySetup();if(typeof showUiNotice==='function')showUiNotice(notice);setTimeout(processNextEvolution,250);}
function recallExpedition(id){
  const index=save.expeditions.active.findIndex(x=>x.id===id),entry=save.expeditions.active[index];if(!entry||entry.status!=='active')return;if(!confirm('途中帰還しますか？ 完了進捗分の50％だけ受け取ります。'))return;
  if(entry.progress>0){const map=MAPS.find(x=>x.id===entry.mapId),distance=EXPEDITION_DISTANCES[entry.distanceId],factor=(entry.progress/entry.requiredWins)*.5;const reward=expeditionRewardPlan(map,distance,{...entry.suitability,greatRate:0},Math.random,factor);grantExpeditionReward(entry,reward);}
  save.expeditions.active.splice(index,1);saveGame();renderExpedition();renderParty();if(typeof renderPartySetup==='function')renderPartySetup();setTimeout(processNextEvolution,250);
}
function expeditionRewardText(reward){if(!reward)return '完了時に確定';const items=Object.entries(reward.items||{}).map(([id,n])=>`${ITEM_BY_ID[id]?.icon||'📦'}${ITEM_BY_ID[id]?.name||id}×${n}`).join(' / ')||'アイテムなし';return `${reward.great?'🌟 大成功！ ':''}コイン${reward.coins}・各個体EXP ${reward.exp}・${items}`;}
function renderExpedition(){
  ensureExpeditionDom();normalizeExpeditionSave();const root=document.getElementById('expeditionContent');if(!root)return;
  const unlocked=expeditionUnlockedSlots(),active=save.expeditions.active||[],available=expeditionAvailableInstances();
  if(!expeditionSelectedMapId)expeditionSelectedMapId=expeditionDestinations()[0]?.id||null;
  const selectedMap=MAPS.find(x=>x.id===expeditionSelectedMapId),selectedDistance=EXPEDITION_DISTANCES[expeditionSelectedDistanceId],suitability=expeditionSuitability(expeditionSelectedUids,selectedMap);
  const groups=Object.groupBy?Object.groupBy(expeditionDestinations(),expeditionRegionLabel):expeditionDestinations().reduce((acc,map)=>{const key=expeditionRegionLabel(map);(acc[key]||=[]).push(map);return acc;},{});
  root.innerHTML=`<div class="expedition-status"><div><span>ACTIVE SLOTS</span><strong>${active.length}/${unlocked}</strong></div><p>完了 ${save.expeditions.completedCount}回・${unlocked<2?'2枠目まであと'+(5-save.expeditions.completedCount):unlocked<3?'3枠目まであと'+(15-save.expeditions.completedCount):'全枠解放済み'}</p></div>`+
    `<div class="expedition-active-grid">${Array.from({length:unlocked},(_,i)=>{const entry=active[i];if(!entry)return `<div class="expedition-slot is-empty"><h3>遠征枠${i+1}</h3><p>派遣可能</p></div>`;const map=MAPS.find(x=>x.id===entry.mapId),distance=EXPEDITION_DISTANCES[entry.distanceId],names=entry.memberUids.map(u=>by(getInstance(u)?.id)?.name||'不明').join('・');const pct=Math.round(entry.progress/entry.requiredWins*100);return `<div class="expedition-slot ${entry.status==='complete'?'is-complete':''}"${entry.tutorialPrologue?' data-tutorial-expedition-active="true"':''}><span>${entry.status==='complete'?'帰還済み':'探索中'}</span><h3>${map?.name||entry.mapId}・${distance?.label||''}</h3><p>${names}</p><div class="expedition-progress"><i style="width:${pct}%"></i></div><p>${entry.progress}/${entry.requiredWins}勝・適性${entry.suitability.grade}</p><p>${entry.status==='complete'?expeditionRewardText(entry.reward):'次のバトル勝利で進行'}</p>${entry.status==='complete'?`<button onclick="claimExpedition('${entry.id}')">報酬を受け取る</button>`:`<button class="secondary-button" onclick="recallExpedition('${entry.id}')">途中帰還</button>`}</div>`;}).join('')}</div>`+
    (active.length>=unlocked?'<div class="panel"><p>使用可能な遠征枠が埋まっています。</p></div>':`<div class="panel"><h2>1. 遠征先</h2>${Object.entries(groups).map(([label,maps])=>`<div class="expedition-region"><h3>${label}</h3><div class="expedition-map-grid">${maps.map(map=>`<button class="${map.id===expeditionSelectedMapId?'is-selected':''}" data-tutorial-expedition-map="${map.id}" onclick="selectExpeditionDestination('${map.id}')">${map.name}</button>`).join('')}</div></div>`).join('')}</div><div class="panel"><h2>2. 距離</h2><div class="expedition-distance-grid">${Object.values(EXPEDITION_DISTANCES).map(distance=>`<button class="${distance.id===expeditionSelectedDistanceId?'is-selected':''}" data-tutorial-expedition-distance="${distance.id}" onclick="selectExpeditionDistance('${distance.id}')">${distance.label}<small>${distance.wins}勝・報酬×${distance.rewardMultiplier}</small></button>`).join('')}</div></div><div class="panel"><h2>3. 派遣編成（1～3体）</h2><div class="expedition-member-grid">${available.length?available.map(ins=>{const mon=by(ins.id),selected=expeditionSelectedUids.includes(ins.uid),score=expeditionMemberScore(ins,selectedMap),tutorialTarget=typeof shouldMarkTutorialExpeditionMember==='function'&&shouldMarkTutorialExpeditionMember(ins.uid);return `<button class="expedition-member ${selected?'is-selected':''}"${tutorialTarget?' data-tutorial-expedition-member="true"':''} onclick="toggleExpeditionMember('${ins.uid}')">${mon.name}<small>Lv.${ins.level}・${score.total}点</small></button>`;}).join(''):'<p>派遣可能なモンスターがいません。パーティーから外してください。</p>'}</div><div id="expeditionSuitability" class="expedition-evaluation"><b>総合適性 ${suitability.grade}（${suitability.total}点）</b><span>大成功率 ${Math.round(suitability.greatRate*100)}％</span><ul>${suitability.reasons.map(x=>`<li>${x}</li>`).join('')}</ul></div><button id="expeditionStartButton" onclick="startExpedition()" ${expeditionSelectedUids.length?'':'disabled'}>${selectedMap?.name||'遠征先未選択'}へ${selectedDistance?.label||''}遠征</button></div>`);
}
ensureExpeditionDom();
globalThis.GameDiagnostics?.registerExpeditionProvider?.(expeditionDiagnosticsSnapshot);
