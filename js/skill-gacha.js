const SKILL_GACHA_SINGLE_COST = 100;
const SKILL_GACHA_TEN_COST = 900;
const SKILL_GACHA_RARITY_WEIGHTS = Object.freeze({1:50,2:27,3:13,4:7,5:2.5,6:0.5});
const SKILL_GACHA_KINDS = Object.freeze({
  monster:Object.freeze({label:'モンスター技', pool:MONSTER_MOVE_CARDS}),
  character:Object.freeze({label:'キャラクター技', pool:CHARACTER_MOVE_CARDS})
});

function skillGachaKind(kind){ return SKILL_GACHA_KINDS[kind] ? kind : null; }
function skillGachaPool(kind){ return SKILL_GACHA_KINDS[skillGachaKind(kind)]?.pool || []; }
function skillGachaCostEntries(kind,minCost=1){
  const pool=skillGachaPool(kind);
  return Object.entries(SKILL_GACHA_RARITY_WEIGHTS)
    .map(([cost,weight])=>({cost:Number(cost),weight,cards:pool.filter(card=>card.cost===Number(cost))}))
    .filter(entry=>entry.cost>=minCost && entry.cards.length);
}
function skillGachaRates(kind,minCost=1){
  const entries=skillGachaCostEntries(kind,minCost);
  const total=entries.reduce((sum,entry)=>sum+entry.weight,0);
  return entries.map(entry=>({...entry,rate:total ? entry.weight/total : 0}));
}
function pickSkillGachaCard(kind,minCost=1,randomFn=Math.random){
  const entries=skillGachaCostEntries(kind,minCost);
  const total=entries.reduce((sum,entry)=>sum+entry.weight,0);
  if(!total) return null;
  let rarityRoll=Math.max(0,Math.min(0.999999999999,Number(randomFn())||0))*total;
  let selected=entries[entries.length-1];
  for(const entry of entries){
    rarityRoll-=entry.weight;
    if(rarityRoll<0){selected=entry;break;}
  }
  const cardRoll=Math.max(0,Math.min(0.999999999999,Number(randomFn())||0));
  return selected.cards[Math.floor(cardRoll*selected.cards.length)] || selected.cards[0] || null;
}
function performSkillGacha(kind,count,randomFn=Math.random){
  const normalizedKind=skillGachaKind(kind);
  const drawCount=count===10 ? 10 : count===1 ? 1 : 0;
  const coinCost=drawCount===10 ? SKILL_GACHA_TEN_COST : drawCount===1 ? SKILL_GACHA_SINGLE_COST : 0;
  if(!normalizedKind || !drawCount) return {ok:false,error:'ガチャの種類または回数が正しくありません。',cards:[]};
  if((save.coins||0)<coinCost) return {ok:false,error:`コインが${coinCost-(save.coins||0)}枚足りません。`,cards:[]};
  const cards=Array.from({length:drawCount},()=>pickSkillGachaCard(normalizedKind,1,randomFn)).filter(Boolean);
  if(cards.length!==drawCount) return {ok:false,error:'排出できる技カードがありません。',cards:[]};
  if(drawCount===10 && !cards.some(card=>card.cost>=2)) cards[cards.length-1]=pickSkillGachaCard(normalizedKind,2,randomFn);
  if(!save.skillCards || typeof save.skillCards!=='object') save.skillCards={};
  save.coins-=coinCost;
  cards.forEach(card=>{save.skillCards[card.id]=Math.max(0,Math.floor(Number(save.skillCards[card.id])||0))+1;});
  return {ok:true,kind:normalizedKind,count:drawCount,coinCost,cards};
}
function showSkillGacha(){ show('skillGacha'); }
function skillGachaRarityLabel(cost){ return `COST ${cost}${cost>=5?'・最高級':cost>=3?'・希少':'・基本'}`; }
function renderSkillGacha(){
  const coin=document.getElementById('skillGachaCoinView');
  if(coin) coin.textContent=Number(save.coins||0).toLocaleString('ja-JP');
  const rates=document.getElementById('skillGachaRateList');
  if(!rates) return;
  rates.innerHTML=Object.entries(SKILL_GACHA_KINDS).map(([kind,config])=>{
    const rows=skillGachaRates(kind).map(entry=>`<li><b>COST ${entry.cost}</b><span>${(entry.rate*100).toFixed(1)}%</span><small>${entry.cards.length}種類・1枚あたり約${(entry.rate/entry.cards.length*100).toFixed(2)}%</small></li>`).join('');
    return `<article class="skill-gacha-pool"><h2>${kind==='monster'?'🐾':'⚔️'} ${config.label}ガチャ</h2><p>${config.pool.length}種類から抽選</p><div class="skill-gacha-actions"><button onclick="rollSkillGacha('${kind}',1)">1回<br><small>${SKILL_GACHA_SINGLE_COST}コイン</small></button><button onclick="rollSkillGacha('${kind}',10)">10回<br><small>${SKILL_GACHA_TEN_COST}コイン・COST 2以上1枚保証</small></button></div><ul>${rows}</ul></article>`;
  }).join('');
}
function renderSkillGachaResults(result){
  const el=document.getElementById('skillGachaResult');
  if(!el) return;
  el.innerHTML=`<h2>獲得した技カード</h2><div class="skill-gacha-results">${result.cards.map(card=>`<article class="card ${skillCardClass(skillTypes(card))}">${skillCardHeader(card)}<p class="skill-type-line ${skillTypes(card)[0]}">${skillTypeLabel(skillTypes(card))} / 威力${card.power}</p><p class="small">${moveEffectText(skillToMove(card.id))}</p></article>`).join('')}</div>`;
  if(typeof replayUiMotion==='function') replayUiMotion(el,'ui-reward-pop',850);
}
function rollSkillGacha(kind,count){
  const result=performSkillGacha(kind,count);
  if(!result.ok){alert(result.error);return;}
  saveGame();
  renderSkillGachaResults(result);
  renderSkillGacha();
  if(typeof updateAppResourceBar==='function') updateAppResourceBar();
  if(typeof showUiNotice==='function') showUiNotice(`技カードを${result.count}枚入手！`);
}
