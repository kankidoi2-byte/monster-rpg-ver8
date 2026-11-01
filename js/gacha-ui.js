/* Adopted gacha view. Transaction owners remain character-gacha/skill-gacha/items. */
let gachaTab='character',gachaResultSession=null,gachaModalRestore=null,gachaCinema=null;
const GACHA_TABS=['character','skill','item'];
const GACHA_ROUTES={characterGacha:'character',skillGacha:'skill',itemGacha:'item'};
function gachaEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function gachaPresentationRandom(){const n=new Uint32Array(1);if(globalThis.crypto?.getRandomValues){crypto.getRandomValues(n);return n[0]/4294967296;}return (performance.now()%997)/997;}
function gachaPromotion(high,random=gachaPresentationRandom){return high&&random()<.3;}
function gachaAudioCue(cue,kind){/* Optional future sound adapter; silent by default. */try{globalThis.MonsterGachaAudio?.onCue?.({cue,kind});}catch(_error){}}
function gachaItemTier(id){return id==='rainbow_contract_scroll'?'rainbow':id==='gold_contract_scroll'?'gold':['silver_contract_scroll','contract_scroll','giga_data'].includes(id)?'silver':'normal';}
function gachaItemVisual(item){return ITEM_IMG[item.id]?`<img src="${ITEM_IMG[item.id]}" alt="${gachaEscape(item.name)}">`:`<span class="gacha-item-icon">${item.icon||'✦'}</span>`;}
function gachaOpenModal(el){
 const focus=document.activeElement,overflow=document.body.style.overflow;
 const inert=[...document.body.children].filter(x=>x!==el&&x.tagName!=='SCRIPT').map(x=>[x,x.inert]);
 inert.forEach(([x])=>x.inert=true);el.hidden=false;document.body.style.overflow='hidden';
 const key=e=>{if(e.key==='Tab'){const nodes=[...el.querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(x=>x.getClientRects().length);if(!nodes.length)return;e.preventDefault();const i=nodes.indexOf(document.activeElement);nodes[(i+(e.shiftKey?-1:1)+nodes.length)%nodes.length].focus();}if(e.key==='Escape'){e.preventDefault();el.querySelector('[data-modal-close]')?.click();}};
 el.addEventListener('keydown',key);el.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
 return ()=>{el.removeEventListener('keydown',key);el.hidden=true;inert.forEach(([x,v])=>x.inert=v);document.body.style.overflow=overflow;if(focus?.isConnected)focus.focus({preventScroll:true});};
}
function gachaRoute(id){return id==='gachaHub'||GACHA_ROUTES[id];}
function openGachaTab(tab=gachaTab,{guide=true}={}){
 gachaTab=GACHA_TABS.includes(tab)?tab:'character';
 document.querySelectorAll('[data-gacha-tab]').forEach(b=>{const active=b.dataset.gachaTab===gachaTab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});
 document.querySelectorAll('[data-gacha-panel]').forEach(p=>p.hidden=p.dataset.gachaPanel!==gachaTab);
 if(gachaTab==='character')renderCharacterGacha();else if(gachaTab==='skill')renderSkillGacha();else renderItemGacha();
 refreshGachaBanner();
 if(guide&&gachaTab==='skill'&&typeof handleTutorialScreenChange==='function')handleTutorialScreenChange('skillGacha');
}
function refreshGachaBanner(){
 const banner=document.getElementById('gachaBanner');if(!banner)return;
 banner.dataset.kind=gachaTab;
 const vera=by('character_vera_3');
 const art=gachaTab==='character'?`<img class="gacha-vera" src="${IMG[vera.imgKey]}" alt="${gachaEscape(vera.name)}">`:gachaTab==='skill'?'<div class="gacha-fan" aria-hidden="true"><i></i><i></i><i></i><b>✦</b></div>':`<div class="gacha-item-scatter" aria-hidden="true">${ITEM_GACHA_POOL.filter(e=>ITEM_IMG[e.id]).map(e=>gachaItemVisual(ITEM_BY_ID[e.id])).join('')}</div>`;
 const title={character:'キャラクター契約',skill:'技カード',item:'冒険の道具'}[gachaTab];
 const tag={character:'★3 人間兵器ヴェーラ',skill:`全${skillGachaPool('monster').length}種・10回で上級以上1枚`,item:'最高 虹の契約書'}[gachaTab];
 banner.innerHTML=`${art}<div class="gacha-banner-label"><span>${tag}</span><h1>${title}</h1></div>`;
 const blocked=gachaTab==='character'&&(inspectCharacterGachaRecovery().blocked||!!save.soulContractReceipt&&!characterGachaReceiptResult());
 const costs=gachaTab==='character'?[CHARACTER_GACHA_SINGLE_COST,CHARACTER_GACHA_TEN_COST]:gachaTab==='skill'?[SKILL_GACHA_SINGLE_COST,SKILL_GACHA_TEN_COST]:[ITEM_GACHA_COST,ITEM_GACHA_COST*10];
 document.querySelectorAll('[data-gacha-draw]').forEach((b,i)=>{b.innerHTML=`${i?(gachaTab==='character'?'10連':'10回'):'1回'}<small><span aria-label="コイン">◈</span> ${costs[i].toLocaleString('ja-JP')}</small>`;b.disabled=blocked||(save.coins||0)<costs[i]||isCharacterGachaPresenting()||!!gachaResultSession||!!gachaCinema;});
 updateAppResourceBar();
}
function drawGacha(count){if(gachaResultSession||gachaCinema||soulContractPresentation)return;if(gachaTab==='character')rollCharacterGacha(count);else if(gachaTab==='skill')rollSkillGacha('monster',count);else rollItemGacha(count);}
function openGachaRates(){
 const sheet=document.getElementById('gachaRatesSheet'),body=document.getElementById('gachaRatesBody');
 if(!sheet||gachaModalRestore)return;
 if(gachaTab==='character'){
 const groups=[1,2,3].map(n=>{const rows=characterGachaRates().filter(r=>soulContractRarity(r.unit)===n);return `<p>★${n}　${(rows.reduce((sum,r)=>sum+r.rate,0)*100).toFixed(1)}%</p>${rows.map(r=>`<li><span>${gachaEscape(r.unit.name)}</span><b>${(r.rate*100).toFixed(2)}%</b></li>`).join('')}`;}).join('');
 body.innerHTML=`<ul>${groups}</ul><p>10連も1回ごとに同じ確率で抽選します。★4・★5は排出されません。</p>`;
 }else if(gachaTab==='skill'){
 body.innerHTML=`<div id="gachaSkillRates"><ul>${skillGachaRates('monster').map(e=>`<li><span>COST ${e.cost}・${e.cards.length}種類</span><b>${(e.rate*100).toFixed(2)}%</b><small>1枚あたり約${(e.rate/e.cards.length*100).toFixed(3)}%</small></li>`).join('')}</ul><p>10枚とも低級の場合、最後の1枚を上級・超級から再抽選します。最強4技は合成限定です。育成の「技合成」から作成できます。</p></div>`;
 }else{const sum=ITEM_GACHA_POOL.reduce((s,e)=>s+e.weight,0);body.innerHTML=`<ul>${ITEM_GACHA_POOL.map(e=>`<li><span>${gachaEscape(ITEM_BY_ID[e.id].name)}</span><b>${(e.weight/sum*100).toFixed(1)}%</b></li>`).join('')}</ul><p>1回100コイン、10回1,000コイン。各回とも同じ提供割合です。</p>`;}
 gachaModalRestore=gachaOpenModal(sheet);
}
function closeGachaRates(){gachaModalRestore?.();gachaModalRestore=null;}
function showGachaResult(kind,result,entries){
 if(typeof document==='undefined')return;
 if(gachaResultSession?.kind==='character'&&gachaResultSession.result.receiptId===result.receiptId)return;
 if(gachaResultSession)dismissGachaResult(false);
 const overlay=document.getElementById('gachaResultOverlay');if(!overlay)return;
 gachaResultSession={kind,result,entries,owner:save};
 const cards=document.getElementById('gachaResultCards');cards.className='gacha-result-grid'+(entries.length===1?' is-single':'');
 cards.innerHTML=entries.map((e,i)=>{
 const tier=kind==='character'?(soulContractRarity(e.unit)===3?'gold':soulContractRarity(e.unit)===2?'silver':'normal'):kind==='skill'?(e.card.cost>10?'gold':e.card.cost>5?'silver':'normal'):gachaItemTier(e.item.id);
 const content=kind==='skill'?tcgSkillCardMarkup(e.card,{compact:entries.length>1}):kind==='character'?`${vis(e.unit)}<strong>${gachaEscape(e.unit.name)}</strong><small>${e.unit.rarity}</small>`:`${gachaItemVisual(e.item)}<strong>${gachaEscape(e.item.name)}</strong>`;
 return `<button class="gacha-result-card tier-${tier}" data-result-index="${i}" onclick="openGachaResultDetail(${i})" aria-label="${gachaEscape(kind==='skill'?e.card.name:kind==='character'?e.unit.name:e.item.name)}を拡大">${e.isNew?'<span class="gacha-new">NEW</span>':''}${content}</button>`;
 }).join('');
 document.getElementById('gachaResultTitle').textContent=kind==='character'?'契約成立':kind==='skill'?'技紋の刻印':'獲得した道具';
 document.getElementById('gachaResultRepeat').textContent=`もう一度（${entries.length}回）`;
 const cost=kind==='character'?(entries.length===10?CHARACTER_GACHA_TEN_COST:CHARACTER_GACHA_SINGLE_COST):kind==='skill'?(entries.length===10?SKILL_GACHA_TEN_COST:SKILL_GACHA_SINGLE_COST):ITEM_GACHA_COST*entries.length;
 document.getElementById('gachaResultRepeat').disabled=(save.coins||0)<cost;
 overlay._restore=gachaOpenModal(overlay);bindTcgTilt(overlay);
}
function openGachaResultDetail(index){
 const s=gachaResultSession,e=s?.entries[index];if(!e)return;
 const box=document.getElementById('gachaResultDetail');
 box.innerHTML=`<button type="button" onclick="closeGachaResultDetail()">閉じる</button>`+(s.kind==='skill'?tcgSkillCardMarkup(e.card):s.kind==='character'?`${vis(e.unit)}<h2>${gachaEscape(e.unit.name)}</h2><p>${e.unit.rarity}${e.instance?.locked?'・🔒 自動ロック':''}</p>`:`${gachaItemVisual(e.item)}<h2>${gachaEscape(e.item.name)}</h2><p>${gachaEscape(e.item.desc)}</p>`);
 box.hidden=false;box.querySelector('button').focus();bindTcgTilt(box);
}
function closeGachaResultDetail(){const el=document.getElementById('gachaResultDetail');el.hidden=true;el.innerHTML='';document.querySelector('#gachaResultCards button')?.focus();}
function dismissGachaResult(schedule=true){const overlay=document.getElementById('gachaResultOverlay');if(!overlay)return;closeGachaResultDetail();overlay._restore?.();overlay._restore=null;gachaResultSession=null;if(schedule)scheduleContractorRankUpPresentation();}
async function closeGachaResult(){
 const s=gachaResultSession;if(!s||s.closing)return false;
 if(s.owner!==save){dismissGachaResult();return false;}
 s.closing=true;
 if(s.kind==='character'&&!await acknowledgeCharacterGachaReceipt()){s.closing=false;return false;}
 if(gachaResultSession!==s)return false;
 dismissGachaResult();refreshGachaBanner();return true;
}
async function repeatGachaResult(){const s=gachaResultSession;if(!s||!await closeGachaResult())return;gachaTab=s.kind;drawGacha(s.entries.length);}
function gachaResultBlocksRank(){return !!gachaResultSession||!!gachaCinema||!!document.getElementById('soulContractPresentation');}
function initGachaUI(){
 const banner=document.getElementById('gachaBanner');let start=null;
 banner.addEventListener('pointerdown',e=>{if(e.isPrimary)start={x:e.clientX,y:e.clientY};});
 banner.addEventListener('pointerup',e=>{if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;start=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4)openGachaTab(GACHA_TABS[(GACHA_TABS.indexOf(gachaTab)+(dx<0?1:2))%3]);});
 banner.addEventListener('pointercancel',()=>start=null);
 document.getElementById('gachaTabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();let i=GACHA_TABS.indexOf(gachaTab);i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;openGachaTab(GACHA_TABS[i]);document.querySelector(`[data-gacha-tab="${gachaTab}"]`).focus();});
}
