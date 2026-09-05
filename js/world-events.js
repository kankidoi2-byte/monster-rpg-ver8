/* World-map events are save-only, deterministic transitions. No UI, clock, or storage side effects.
 * Provisional balance: Elysia 8% after a Light Plain victory; crisis 3%, water 12%,
 * starsea 10% after non-Easy ordinary victories. Golden Land keeps its existing
 * 3/5/8% difficulty rates. Entry persists until victory or explicit skip, never a timer.
 * Callers exclude tutorial/event battles. Use world-victory:<lifetime wins> receipts.
 */
const WORLD_EVENT_KEYS = Object.freeze(['elysia','crisis','rift','water_secret','starsea','golden_land']);
const WORLD_FALSE_DRAGONS = Object.freeze(['false_dragon_alfa','false_dragon_beta','false_dragon_gamma']);
function worldEventObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function worldEventCount(value){const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:0;}
function normalizeWorldEventEntry(key,value){
  if(!worldEventObject(value))return null;
  const entry={...value};
  const maps={elysia:'light_plain',crisis:'starsea',rift:'world_between',water_secret:'water_secret',starsea:'starsea',golden_land:'golden_land'};
  const monsters={elysia:['hikari'],crisis:['doom_nemesion'],rift:WORLD_FALSE_DRAGONS,water_secret:['elna_water','suiren'],starsea:['nemesion'],golden_land:['slime_gold']};
  entry.mapId=maps[key];
  if(key==='rift'){
    // Retain pending opportunities and their current opponent; damaged references
    // cannot leave an unchallengeable entrance permanently occupying the event slot.
    const pending=[entry.monsterId,...(Array.isArray(entry.monsterIds)?entry.monsterIds:[])];
    entry.monsterIds=[...new Set(pending.filter(id=>WORLD_FALSE_DRAGONS.includes(id)))];
    if(!entry.monsterIds.length)entry.monsterIds=[...WORLD_FALSE_DRAGONS];
    entry.monsterId=entry.monsterIds[0];
  }else{
    if(['elysia','crisis','starsea'].includes(key))entry.monsterId=monsters[key][0];
    else if(!monsters[key].includes(entry.monsterId))delete entry.monsterId;
    if(Array.isArray(entry.monsterIds))entry.monsterIds=[...new Set(entry.monsterIds.filter(id=>monsters[key].includes(id)))];
  }
  return entry;
}
function normalizeWorldMapState(raw){
  const old=worldEventObject(raw)?raw:{};
  const active=worldEventObject(old.active)?{...old.active}:{};
  WORLD_EVENT_KEYS.forEach(key=>{
    active[key]=normalizeWorldEventEntry(key,active[key]);
  });
  return {...old,version:Math.max(1,worldEventCount(old.version)),
    normalVictories:worldEventCount(old.normalVictories),
    lastVictoryReceiptNumber:worldEventCount(old.lastVictoryReceiptNumber),
    processedReceiptIds:Array.isArray(old.processedReceiptIds)?[...new Set(old.processedReceiptIds.filter(v=>typeof v==='string'))]:[],
    riftCycle:worldEventCount(old.riftCycle),active,
    history:Array.isArray(old.history)?old.history.slice(-30).map(entry=>worldEventObject(entry)?{...entry}:entry):[]};
}
function rollWorldEventsAfterVictory(raw,details={},randomFn=Math.random){
  const next=normalizeWorldMapState(raw);
  const receipt=typeof details.receiptId==='string'?details.receiptId:'';
  if(!receipt)return next;
  const sequenceMatch=/^world-victory:([1-9]\d*)$/.exec(receipt);
  const sequence=sequenceMatch?Number(sequenceMatch[1]):null;
  if(sequenceMatch){
    if(!Number.isSafeInteger(sequence)||sequence<=next.lastVictoryReceiptNumber)return next;
    next.lastVictoryReceiptNumber=sequence;
  }else{
    if(next.processedReceiptIds.includes(receipt))return next;
    next.processedReceiptIds.push(receipt);
  }
  next.normalVictories++;
  const add=(key,rate,event)=>{
    if(next.active[key]||rate<=0)return;
    const roll=Number(randomFn());
    if(Number.isFinite(roll)&&roll>=0&&roll<rate)next.active[key]={...event,source:'ordinary_victory',discoveredAtVictory:next.normalVictories};
  };
  const difficulty=details.difficultyId;
  const eligible=['normal','hard','extreme'].includes(difficulty);
  if(!eligible)return next;
  if(details.mapId==='light_plain')add('elysia',.08,{mapId:'light_plain',monsterId:'hikari'});
  add('crisis',.03,{mapId:'starsea',monsterId:'doom_nemesion'});
  add('water_secret',.12,{mapId:'water_secret'});
  add('starsea',.10,{mapId:'starsea',monsterId:'nemesion'});
  add('golden_land',{normal:.03,hard:.05,extreme:.08}[difficulty],{mapId:'golden_land'});
  return next;
}
function resolveWorldEvent(raw,key,outcome='defeat'){
  const next=normalizeWorldMapState(raw);
  if(!WORLD_EVENT_KEYS.includes(key)||!next.active[key]||!['defeat','skip'].includes(outcome))return next;
  const entry=next.active[key];
  next.active[key]=null;
  next.history.push({key,outcome,monsterId:entry.monsterId||null,atVictory:next.normalVictories,
    ...(key==='crisis'?{handledBy:outcome==='skip'?'false_dragons':'player'}:{})});
  next.history=next.history.slice(-30);
  if(key==='crisis'){
    const offset=next.riftCycle%WORLD_FALSE_DRAGONS.length;
    const fresh=WORLD_FALSE_DRAGONS.slice(offset).concat(WORLD_FALSE_DRAGONS.slice(0,offset));
    const previous=next.active.rift;
    const pending=previous?([previous.monsterId,...(Array.isArray(previous.monsterIds)?previous.monsterIds:[])]).filter(id=>WORLD_FALSE_DRAGONS.includes(id)):[];
    const monsterIds=[...new Set([...pending,...fresh])];
    next.active.rift={...previous,mapId:'world_between',monsterId:monsterIds[0],monsterIds,
      source:'crisis_trace',discoveredAtVictory:previous?.discoveredAtVictory??next.normalVictories};
    next.riftCycle++;
  }else if(key==='rift'){
    const pending=Array.isArray(entry.monsterIds)?entry.monsterIds.filter(id=>WORLD_FALSE_DRAGONS.includes(id)&&id!==entry.monsterId):[];
    if(pending.length)next.active.rift={...entry,monsterId:pending[0],monsterIds:pending};
  }
  return next;
}
