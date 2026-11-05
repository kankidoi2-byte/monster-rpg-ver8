/* Read-only individual status view. No fields or preferences are persisted. */
var monsterStatusUi=null;
var STATUS_LABELS={hp:'HP',attack:'攻撃',defense:'防御',speed:'速度'};
var STATUS_COLORS={hp:'#2f7a3c',attack:'#b8322c',defense:'#245b98',speed:'#9a7424'};
function monsterStatusValues(ins){
  const mon=by(ins.id);
  return {hp:instanceMaxHp(ins),attack:battleBaseAttack(mon,ins.level)*instanceStatModifier(ins,'attack'),defense:battleBaseDefense(mon,ins.level),speed:baseBattleSpeed(mon,ins,ins.level)};
}
function statusNumber(value){return Math.round(value).toLocaleString('ja-JP');}
function statusMiniStats(ins){
  const stats=monsterStatusValues(ins);
  return '<div class="status-mini">'+Object.keys(STATUS_LABELS).map(k=>`<div><small style="color:${STATUS_COLORS[k]}">${STATUS_LABELS[k]}</small><b>${statusNumber(stats[k])}</b></div>`).join('')+'</div>';
}
function monsterStatusScale(){
  const max={hp:1,attack:1,defense:1,speed:1};
  for(const mon of M){const values=monsterStatusValues({id:mon.id,level:MAX_LEVEL});for(const k of Object.keys(max))max[k]=Math.max(max[k],values[k]);}
  return max;
}
function openMonsterStatus(uid){
  ensureRosterState();
  if(rosterSheetCloseBlocked()||!getInstance(uid))return false;
  const list=document.getElementById('partyList');
  monsterStatusUi={uid,identity:rosterIdentity(),order:rosterVisibleInstances().map(i=>i.uid),scroll:list?.scrollTop||0,focus:rosterUi.returnFocus};
  rosterUi.detailUid=null;renderRosterSheet();
  renderMonsterStatus();
  document.getElementById('monsterStatusBack')?.focus({preventScroll:true});
  return true;
}
function closeMonsterStatus(restore=true){
  if(!monsterStatusUi)return;
  const prev=monsterStatusUi;monsterStatusUi=null;
  document.getElementById('monsterStatus')?.remove();
  const party=document.getElementById('party');if(party)party.inert=false;
  if(restore){
    const list=document.getElementById('partyList');if(list)list.scrollTop=prev.scroll;
    (findRosterButton(prev.uid)||prev.focus)?.focus?.({preventScroll:true});
  }
}
function moveMonsterStatus(delta){
  if(!monsterStatusUi)return;
  const order=monsterStatusUi.order.filter(uid=>getInstance(uid));
  if(!order.length){closeMonsterStatus();return;}
  monsterStatusUi.uid=order[(Math.max(0,order.indexOf(monsterStatusUi.uid))+delta+order.length)%order.length];
  renderMonsterStatus();
}
function editMonsterStatusSkills(){
  if(!monsterStatusUi)return;
  const uid=monsterStatusUi.uid;
  // Dispatch to the existing editor so its equipment rules remain authoritative.
  closeMonsterStatus(false);openSkillEdit(uid);
}
function statusKeydown(event){
  if(event.key==='Escape'){event.preventDefault();closeMonsterStatus();return;}
  if(event.key!=='Tab')return;
  const nodes=[...event.currentTarget.querySelectorAll('button:not(:disabled)')],first=nodes[0],last=nodes[nodes.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
function renderMonsterStatus(){
  if(!monsterStatusUi)return;
  const ins=getInstance(monsterStatusUi.uid);
  if(!ins||monsterStatusUi.identity!==rosterIdentity()){closeMonsterStatus();return;}
  const mon=by(ins.id),values=monsterStatusValues(ins),scale=monsterStatusScale(),maxed=isMaxLevel(ins.level);
  const skills=getEquippedSkillIds(ins).map(id=>SKILL_BY_ID[id]).filter(Boolean);
  const modifiers=[['hp','HP'],['attack','攻撃'],['speed','速度']].filter(([k])=>instanceStatModifier(ins,k)!==1).map(([k,label])=>`${label} ×${instanceStatModifier(ins,k)}`);
  let root=document.getElementById('monsterStatus');
  if(!root){root=document.createElement('section');root.id='monsterStatus';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','ステータス');root.onkeydown=statusKeydown;document.body.appendChild(root);}
  const focus=document.activeElement?.dataset?.statusNav;
  root.innerHTML=`<header><button id="monsterStatusBack" onclick="closeMonsterStatus()">‹ 一覧へ</button><h1>ステータス</h1><div class="status-nav"><button data-status-nav="prev" aria-label="前の仲間" onclick="moveMonsterStatus(-1)">‹</button><button data-status-nav="next" aria-label="次の仲間" onclick="moveMonsterStatus(1)">›</button></div></header>
  <div class="status-scroll"><section class="status-hero"><div class="status-image">${vis(mon)}<div class="status-stars">${rosterEscape(mon.rarity)}</div></div><div class="status-hero-body"><div class="status-name-row"><h2>${rosterEscape(mon.name)}</h2><div class="status-level">Lv.<b>${clampLevel(ins.level)}</b></div></div><div class="status-chips"><span class="status-kind">${isCharacterUnit(mon)?'キャラクター':'モンスター'}</span>${typesHtml(mon.types)}</div><div><div class="status-exp-head"><span>EXP</span><span data-status-exp>${maxed?'MAX':statusNumber(ins.exp||0)+' / '+statusNumber(needExp(ins.level))}</span></div><div class="status-exp-bar"><i style="width:${maxed?100:Math.max(0,Math.min(100,(ins.exp||0)/needExp(ins.level)*100))}%"></i></div></div></div></section>
  <section class="status-card"><h3>能力</h3>${Object.keys(STATUS_LABELS).map(k=>`<div class="status-stat" data-status-stat="${k}"><span>${STATUS_LABELS[k]}</span><div class="status-bar"><i style="width:${Math.max(2,Math.min(100,values[k]/scale[k]*100))}%;background:${STATUS_COLORS[k]}"></i></div><b>${statusNumber(values[k])}</b></div>`).join('')}${modifiers.length?`<div class="status-alchemy"><span>錬成の補正</span><b>${modifiers.join(' / ')}</b></div>`:''}</section>
  <section class="status-card"><div class="status-skill-heading"><h3>装備している技</h3><span>コスト ${equippedSkillCost(ins)} / ${skillCostLimitFor(mon,ins)}</span></div>${skills.map(sk=>`<div class="status-skill"><span class="status-dot ${rosterEscape(skillTypes(sk)[0]||'normal')}">●</span><span class="status-skill-name">${rosterEscape(sk.name)}</span><small>${sk.power>0?'威力 '+sk.power:'補助'}</small><em>C${sk.cost}</em></div>`).join('')||'<p>技が未装備です。</p>'}<button class="status-dark" onclick="editMonsterStatusSkills()">技を変更する</button></section></div>`;
  const party=document.getElementById('party');if(party)party.inert=true;
  if(focus)root.querySelector(`[data-status-nav="${focus}"]`)?.focus({preventScroll:true});
}
