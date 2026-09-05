const CHARACTER_GACHA_SINGLE_COST = 100;
const CHARACTER_GACHA_TEN_COST = 900;
const CHARACTER_GACHA_IDS = Object.freeze(['elna_beginner','stella_apprentice','lumina_apprentice']);
function characterGachaPool(){ return CHARACTER_GACHA_IDS.map(id=>M.find(unit=>unit.id===id)).filter(isCharacterUnit); }
function performCharacterGacha(count,randomFn=Math.random){
  if(count!==1 && count!==10) return {ok:false,error:'回数が正しくありません。'};
  const pool=characterGachaPool();
  const cost=count===10?CHARACTER_GACHA_TEN_COST:CHARACTER_GACHA_SINGLE_COST;
  if(!pool.length) return {ok:false,error:'排出できるキャラクターがありません。'};
  if((save.coins||0)<cost) return {ok:false,error:`コインが${cost-(save.coins||0)}枚足りません。`};
  const units=Array.from({length:count},()=>pool[Math.floor(Math.max(0,Math.min(0.999999999999,Number(randomFn())||0))*pool.length)]);
  save.coins-=cost;
  const entries=units.map(unit=>{
    const isNew=!caughtHas(unit.id);
    const instance=addInstance(unit.id,1);
    return {unit,instance,isNew};
  });
  return {ok:true,count,cost,entries};
}
function showCharacterGacha(){ show('characterGacha'); }
function renderCharacterGacha(){
  const pool=characterGachaPool();
  document.getElementById('characterGachaCoinView').textContent=save.coins||0;
  document.getElementById('characterGachaPoolSummary').textContent=`全${pool.length}形態・各形態均等（1回あたり約${pool.length?(100/pool.length).toFixed(2):'0'}%）。10連も同じ確率で抽選します。`;
  document.getElementById('characterGachaRateList').innerHTML=pool.map(unit=>`<article class="character-gacha-card">${vis(unit,'loading="lazy" decoding="async"')}<strong>${unit.name}</strong><small>${unit.rarity}</small></article>`).join('');
  document.querySelectorAll('[data-character-gacha-count]').forEach(button=>{
    const cost=Number(button.dataset.characterGachaCount)===10?CHARACTER_GACHA_TEN_COST:CHARACTER_GACHA_SINGLE_COST;
    button.disabled=!pool.length||(save.coins||0)<cost;
  });
}
function rollCharacterGacha(count){
  const result=performCharacterGacha(count);
  if(!result.ok){alert(result.error);return;}
  const saved=saveGame();
  renderCharacterGacha();
  if(typeof updateAppResourceBar==='function') updateAppResourceBar();
  const target=document.getElementById('characterGachaResult');
  target.innerHTML=`<h2>${result.count}体が仲間になりました</h2>${saved?'':'<p>保存に失敗しました。セーブ管理からデータを書き出してください。</p>'}<div class="character-gacha-grid">${result.entries.map(({unit,isNew,instance})=>`<article class="character-gacha-card">${vis(unit)}<strong>${unit.name}</strong><small>${unit.rarity} / Lv.1</small><span>${isNew?'NEW・図鑑登録':'同じ形態の別個体を獲得'}${instance.locked?'・🔒 自動ロック':''}</span></article>`).join('')}</div><button onclick="show('party')">編成する</button>`;
  if(typeof replayUiMotion==='function') replayUiMotion(target,'ui-reward-pop',850);
  target.scrollIntoView({block:'start'});
}
