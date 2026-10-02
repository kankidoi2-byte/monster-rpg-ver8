const SKILL_GACHA_SINGLE_COST = 100;
const SKILL_GACHA_TEN_COST = 900;
const SKILL_GACHA_RARITY_WEIGHTS = Object.freeze({1:50,2:27,3:13,4:7,5:2.5,6:0.5});
const SKILL_GACHA_PRESENTATION_DELAYS = Object.freeze({
  standard:Object.freeze({intro:620,card:135}),
  quick:Object.freeze({intro:120,card:0})
});
const SKILL_GACHA_KINDS = Object.freeze({
  monster:Object.freeze({label:'モンスター技', pool:MONSTER_MOVE_CARDS}),
  character:Object.freeze({label:'キャラクター技', pool:CHARACTER_MOVE_CARDS})
});
let skillGachaPresentationSpeed='standard';
let skillGachaPresentationToken=0;
let activeSkillGachaPresentation=null;

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
function skillGachaCommonGuaranteePool(inventory={}){
  const commonCards=skillGachaPool('character').filter(card=>card.commonCharacterSkill);
  if(!commonCards.length) return [];
  const countFor=card=>Math.max(0,Math.floor(Number(inventory[card.id])||0));
  const minimum=Math.min(...commonCards.map(countFor));
  return commonCards.filter(card=>countFor(card)===minimum);
}
function pickSkillGachaCommonGuarantee(inventory,randomFn=Math.random){
  const pool=skillGachaCommonGuaranteePool(inventory);
  const roll=Math.max(0,Math.min(0.999999999999,Number(randomFn())||0));
  return pool[Math.floor(roll*pool.length)] || null;
}
function performSkillGacha(kind,count,randomFn=Math.random){
  const normalizedKind=skillGachaKind(kind);
  const drawCount=count===10 ? 10 : count===1 ? 1 : 0;
  const coinCost=drawCount===10 ? SKILL_GACHA_TEN_COST : drawCount===1 ? SKILL_GACHA_SINGLE_COST : 0;
  if(!normalizedKind || !drawCount) return {ok:false,error:'ガチャの種類または回数が正しくありません。',cards:[]};
  if((save.coins||0)<coinCost) return {ok:false,error:`コインが${coinCost-(save.coins||0)}枚足りません。`,cards:[]};
  const commonGuarantee=normalizedKind==='character' && drawCount===10;
  const cards=Array.from({length:commonGuarantee ? 9 : drawCount},()=>pickSkillGachaCard(normalizedKind,1,randomFn));
  if(cards.some(card=>!card)) return {ok:false,error:'排出できる技カードがありません。',cards:[]};
  if(commonGuarantee){
    const provisionalInventory={...(save.skillCards||{})};
    cards.forEach(card=>{provisionalInventory[card.id]=Math.max(0,Math.floor(Number(provisionalInventory[card.id])||0))+1;});
    cards.push(pickSkillGachaCommonGuarantee(provisionalInventory,randomFn));
  }else if(drawCount===10 && !cards.some(card=>card.cost>=2)){
    cards[cards.length-1]=pickSkillGachaCard(normalizedKind,2,randomFn);
  }
  if(cards.length!==drawCount || cards.some(card=>!card)) return {ok:false,error:'排出できる技カードがありません。',cards:[]};
  if(!save.skillCards || typeof save.skillCards!=='object') save.skillCards={};
  save.coins-=coinCost;
  cards.forEach(card=>{save.skillCards[card.id]=Math.max(0,Math.floor(Number(save.skillCards[card.id])||0))+1;});
  return {ok:true,kind:normalizedKind,count:drawCount,coinCost,cards};
}
function showSkillGacha(){ show('skillGacha'); }
function skillGachaRarityLabel(cost){ return `COST ${cost}${cost>=5?'・最高級':cost>=3?'・希少':'・基本'}`; }
function skillGachaRarityTier(cost){ return cost>=6?'mythic':cost>=5?'legendary':cost>=3?'rare':'basic'; }
function skillGachaInventorySnapshots(cards,beforeInventory={}){
  const counts={...beforeInventory};
  return cards.map(card=>{
    const before=Math.max(0,Math.floor(Number(counts[card.id])||0));
    const after=before+1;
    counts[card.id]=after;
    return {card,before,after,isNew:before===0,tier:skillGachaRarityTier(card.cost)};
  });
}
function skillGachaPresentationMode(){
  const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduced?'quick':(SKILL_GACHA_PRESENTATION_DELAYS[skillGachaPresentationSpeed]?skillGachaPresentationSpeed:'standard');
}
function setSkillGachaPresentationSpeed(speed){
  skillGachaPresentationSpeed=SKILL_GACHA_PRESENTATION_DELAYS[speed]?speed:'standard';
  if(typeof document==='undefined') return skillGachaPresentationSpeed;
  document.querySelectorAll('[data-skill-gacha-speed]').forEach(button=>{
    button.setAttribute('aria-pressed',String(button.dataset.skillGachaSpeed===skillGachaPresentationSpeed));
  });
  return skillGachaPresentationSpeed;
}
function skillGachaCardMarkup(entry,index,faceDown=false){
  const card=entry.card;
  const acquisition=entry.isNew?'<span class="skill-gacha-new">NEW</span>':`<span class="skill-gacha-owned">所持 ×${entry.after}</span>`;
  return `<article class="skill-gacha-reveal-card skill-gacha-tier-${entry.tier}${faceDown?' is-facedown':''}" data-skill-gacha-card="${index}" data-cost="${card.cost}" role="button" tabindex="${faceDown?'-1':'0'}" aria-expanded="false" onclick="openSkillGachaCardDetail(${index})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openSkillGachaCardDetail(${index});}"><div class="skill-gacha-card-inner"><div class="skill-gacha-card-back"><span>✦</span><small>技紋</small></div><div class="skill-gacha-card-front card ${skillCardClass(skillTypes(card))}">${acquisition}${skillCardHeader(card)}<p class="skill-type-line ${skillTypes(card)[0]}">${skillTypeLabel(skillTypes(card))} / 威力${card.power}</p><p class="small">${moveEffectText(skillToMove(card.id))}</p></div></div></article>`;
}
function renderSkillGacha(){
  const coin=document.getElementById('skillGachaCoinView');
  if(coin) coin.textContent=Number(save.coins||0).toLocaleString('ja-JP');
  const rates=document.getElementById('skillGachaRateList');
  if(!rates) return;
  rates.innerHTML=Object.entries(SKILL_GACHA_KINDS).map(([kind,config])=>{
    const rows=skillGachaRates(kind).map(entry=>`<li><b>COST ${entry.cost}</b><span>${(entry.rate*100).toFixed(1)}%</span><small>${entry.cards.length}種類・1枚あたり約${(entry.rate/entry.cards.length*100).toFixed(2)}%</small></li>`).join('');
    const guarantee=kind==='character'?'共通技1枚保証・未所持優先':'COST 2以上1枚保証';
    const rateDescription=kind==='character'?'<p class="small">以下は1回抽選・10連の1〜9枚目の確率です。10枚目は共通技6種類のうち所持数が最も少ない種類から均等に抽選します（未所持優先）。1〜9枚目の獲得分も所持数に含めるため、保証枠の確率は抽選ごとに変わります。</p>':'';
    return `<article class="skill-gacha-pool"><h2>${kind==='monster'?'🐾':'⚔️'} ${config.label}ガチャ</h2><p>${config.pool.length}種類から抽選</p><div class="skill-gacha-actions"><button onclick="rollSkillGacha('${kind}',1)">1回<br><small>${SKILL_GACHA_SINGLE_COST}コイン</small></button><button onclick="rollSkillGacha('${kind}',10)">10回<br><small>${SKILL_GACHA_TEN_COST}コイン・${guarantee}</small></button></div>${rateDescription}<ul>${rows}</ul></article>`;
  }).join('');
}
function closeSkillGachaCardDetail(){
  if(typeof document==='undefined') return;
  const detail=document.getElementById('skillGachaCardDetail');
  if(detail){detail.hidden=true;detail.innerHTML='';}
  document.querySelectorAll('#skillGachaPresentationCards .is-selected').forEach(card=>{
    card.classList.remove('is-selected');
    card.setAttribute('aria-expanded','false');
  });
}
function openSkillGachaCardDetail(index){
  if(!activeSkillGachaPresentation||typeof document==='undefined') return;
  const overlay=document.getElementById('skillGachaPresentation');
  const cardElement=overlay?.querySelector(`[data-skill-gacha-card="${index}"]`);
  const detail=document.getElementById('skillGachaCardDetail');
  const entry=activeSkillGachaPresentation.entries[index];
  if(!overlay?.classList.contains('is-complete')||!cardElement||!detail||!entry) return;
  if(cardElement.classList.contains('is-selected')){closeSkillGachaCardDetail();return;}
  closeSkillGachaCardDetail();
  const card=entry.card;
  const acquisition=entry.isNew?'NEW・初獲得':`所持 ×${entry.after}`;
  detail.innerHTML=`<div>${skillCardHeader(card)}<b>${acquisition}</b></div><p class="skill-type-line ${skillTypes(card)[0]}">${skillTypeLabel(skillTypes(card))} / 威力${card.power}</p><p>${moveEffectText(skillToMove(card.id))}</p><button type="button" onclick="closeSkillGachaCardDetail()">詳細を閉じる</button>`;
  detail.hidden=false;
  cardElement.classList.add('is-selected');
  cardElement.setAttribute('aria-expanded','true');
}
function skillGachaProphecy(highestCost){
  if(highestCost>=6) return {label:'虹の技紋――最高位の力を感知',tier:'mythic'};
  if(highestCost>=5) return {label:'金の技紋――強大な力を感知',tier:'legendary'};
  if(highestCost>=3) return {label:'銀の技紋――希少な力を感知',tier:'rare'};
  return {label:'技紋が空のカードへ宿っていく',tier:'basic'};
}
function pulseSkillGachaCard(card){
  if(typeof navigator==='undefined'||typeof navigator.vibrate!=='function') return;
  if(card.cost>=6) navigator.vibrate([28,35,70]);
  else if(card.cost>=5) navigator.vibrate(45);
  else if(card.cost>=3) navigator.vibrate(18);
}
function finishSkillGachaPresentation(token=skillGachaPresentationToken){
  if(token!==skillGachaPresentationToken||!activeSkillGachaPresentation||typeof document==='undefined') return;
  const overlay=document.getElementById('skillGachaPresentation');
  if(!overlay) return;
  overlay.querySelectorAll('.skill-gacha-reveal-card.is-facedown').forEach(card=>card.classList.remove('is-facedown'));
  overlay.querySelectorAll('.skill-gacha-reveal-card').forEach(card=>card.tabIndex=0);
  overlay.classList.remove('is-summoning','is-revealing');
  overlay.classList.add('is-complete');
  const status=document.getElementById('skillGachaPresentationStatus');
  if(status) status.textContent=`${activeSkillGachaPresentation.result.count}枚獲得。最高はCOST ${activeSkillGachaPresentation.highestCost}です。`;
  const footer=document.getElementById('skillGachaPresentationActions');
  if(footer) footer.hidden=false;
  const repeat=document.getElementById('skillGachaRepeatButton');
  if(repeat){
    const {result}=activeSkillGachaPresentation;
    const needed=result.count===10?SKILL_GACHA_TEN_COST:SKILL_GACHA_SINGLE_COST;
    repeat.textContent=`もう${result.count===10?'10回':'1回'}（残り ${(save.coins||0).toLocaleString('ja-JP')}）`;
    repeat.disabled=(save.coins||0)<needed;
  }
  const skip=document.getElementById('skillGachaSkipButton');
  if(skip) skip.hidden=true;
}
function revealSkillGachaCards(token,index=0){
  if(token!==skillGachaPresentationToken||!activeSkillGachaPresentation||typeof document==='undefined') return;
  const {entries}=activeSkillGachaPresentation;
  if(index>=entries.length){finishSkillGachaPresentation(token);return;}
  const overlay=document.getElementById('skillGachaPresentation');
  const card=overlay?.querySelector(`[data-skill-gacha-card="${index}"]`);
  if(card){card.classList.remove('is-facedown');pulseSkillGachaCard(entries[index].card);}
  const mode=skillGachaPresentationMode();
  const delay=SKILL_GACHA_PRESENTATION_DELAYS[mode].card;
  if(!delay){finishSkillGachaPresentation(token);return;}
  setTimeout(()=>revealSkillGachaCards(token,index+1),delay+(entries[index].card.cost>=5?180:0));
}
function presentSkillGachaResult(result,entries){
  if(typeof document==='undefined') return;
  const overlay=document.getElementById('skillGachaPresentation');
  const cards=document.getElementById('skillGachaPresentationCards');
  if(!overlay||!cards){
    if(typeof showUiNotice==='function') showUiNotice(`${result.count}枚の技カードを獲得しました。`);
    return;
  }
  const highestCost=Math.max(...result.cards.map(card=>card.cost));
  const prophecy=skillGachaProphecy(highestCost);
  const token=++skillGachaPresentationToken;
  activeSkillGachaPresentation={result,entries,highestCost};
  closeSkillGachaCardDetail();
  document.body.classList.add('skill-gacha-presentation-open');
  overlay.hidden=false;
  overlay.setAttribute('aria-hidden','false');
  overlay.dataset.tier=prophecy.tier;
  overlay.className='skill-gacha-presentation is-summoning';
  document.getElementById('skillGachaPresentationKind').textContent=`${SKILL_GACHA_KINDS[result.kind].label}・${result.count}回召喚`;
  document.getElementById('skillGachaPresentationProphecy').textContent=prophecy.label;
  document.getElementById('skillGachaPresentationStatus').textContent='コインが技紋へ変わっています。';
  document.getElementById('skillGachaPresentationActions').hidden=true;
  const skip=document.getElementById('skillGachaSkipButton');
  skip.hidden=false;
  cards.innerHTML=entries.map((entry,index)=>skillGachaCardMarkup(entry,index,true)).join('');
  skip.focus({preventScroll:true});
  const mode=skillGachaPresentationMode();
  setTimeout(()=>{
    if(token!==skillGachaPresentationToken) return;
    overlay.classList.remove('is-summoning');
    overlay.classList.add('is-revealing');
    document.getElementById('skillGachaPresentationStatus').textContent='カードを公開しています。';
    revealSkillGachaCards(token,0);
  },SKILL_GACHA_PRESENTATION_DELAYS[mode].intro);
}
function skipSkillGachaPresentation(){
  const token=++skillGachaPresentationToken;
  finishSkillGachaPresentation(token);
}
function closeSkillGachaPresentation(){
  skillGachaPresentationToken++;
  if(typeof document==='undefined') return;
  const overlay=document.getElementById('skillGachaPresentation');
  if(overlay){overlay.hidden=true;overlay.setAttribute('aria-hidden','true');overlay.className='skill-gacha-presentation';}
  closeSkillGachaCardDetail();
  document.body.classList.remove('skill-gacha-presentation-open');
  activeSkillGachaPresentation=null;
}
function repeatSkillGachaPresentation(){
  if(!activeSkillGachaPresentation) return;
  const {kind,count}=activeSkillGachaPresentation.result;
  closeSkillGachaPresentation();
  rollSkillGacha(kind,count);
}
function openSkillInventoryFromGacha(){
  closeSkillGachaPresentation();
  show('party');
  if(typeof showUiNotice==='function') showUiNotice('仲間を選び「技変更」から装備できます。');
}
function rollSkillGacha(kind,count){
  const beforeCoins=save.coins;
  const hadInventory=Object.prototype.hasOwnProperty.call(save,'skillCards');
  const beforeInventory={...(save.skillCards||{})};
  const hadMeta=Object.prototype.hasOwnProperty.call(save,'saveMeta');
  const beforeMeta=save.saveMeta ? {...save.saveMeta} : save.saveMeta;
  const result=performSkillGacha(kind,count);
  if(!result.ok){alert(result.error);return;}
  const entries=skillGachaInventorySnapshots(result.cards,beforeInventory);
  if(saveGame()===false){
    save.coins=beforeCoins;
    if(hadInventory)save.skillCards=beforeInventory;else delete save.skillCards;
    if(hadMeta)save.saveMeta=beforeMeta;else delete save.saveMeta;
    renderSkillGacha();
    if(typeof updateAppResourceBar==='function') updateAppResourceBar();
    alert('技ガチャの結果を保存できなかったため、抽選を取り消しました。コインと技カードは抽選前の状態です。');
    return;
  }
  renderSkillGacha();
  if(typeof updateAppResourceBar==='function') updateAppResourceBar();
  presentSkillGachaResult(result,entries);
}
