/* Read-only roadmap presentation adapted from the adopted prototype. */
(function(){
'use strict';
const $=s=>document.querySelector(s.startsWith('#sheet') || s==='#mask' || s==='#close' ? '#roadmapDialogRoot '+s : '#roadmap '+s);
const laneOf=id=>ROADMAP.lanes.find(l=>l.id===id);
let focus=null, showAllDone=false;
function cardHTML(it){
  const c=laneOf(it.lane).color, wip=it.wip?`<span class="wipb">${ROADMAP.ui.wip}</span>`:'';
  if(it.kind==='main'){
    const inner=it.mystery?`<div class="q">？？？</div>`:`<img class="bg" src="${it.art.bg}" alt=""><img class="chr" src="${it.art.chr}" alt="">`;
    return `<div class="node main ${it.wip?'wip':''} ${it.mystery?'mystery':''}" style="--c:${c}"><button class="card" data-id="${it.id}">${inner}${wip}
      <div class="tx"><div class="k">${ROADMAP.ui.main}</div><h4>${it.title}</h4><p>${it.sub}</p></div></button></div>`;
  }
  const ic=it.iconImg?`<img src="${it.iconImg}" alt="">`:(it.icon||'');
  if(it.kind==='side') return `<div class="side" style="--c:${c}"><button class="card" data-id="${it.id}"><div class="ic">${ic}</div>
      <div><span class="om">${ROADMAP.ui.side}</span><h4>${it.title}</h4><p>${it.sub}</p></div></button></div>`;
  return `<div class="node ${it.wip?'wip':''}" style="--c:${c}"><button class="card" data-id="${it.id}">${wip}<div class="ic">${ic}</div><h4>${it.title}</h4><p>${it.sub}</p></button></div>`;
}
function render(){
  const u=ROADMAP.ui;
  document.getElementById("roadmapBack").textContent=u.back;
  document.getElementById("roadmapHero").innerHTML=`<img src="${u.heroImage}" alt=""><div class="tx"><div class="en">${u.eyebrow}</div><h1>${u.title}</h1><p>${u.intro}<br>${u.description}</p></div>`;
  document.getElementById("roadmapDoneHeading").innerHTML=`<span class="tag">${u.done}</span><h2>${u.recent}</h2>`;
  document.getElementById("roadmapNote").textContent=u.notes.join("\n");
  $('#lanesH').innerHTML=ROADMAP.lanes.map(l=>`<button class="lh ${focus&&focus!==l.id?'dim':''}" aria-pressed="${focus===l.id}" data-lane="${l.id}" style="--c:${l.color}"><i>${l.icon}</i><span><b>${l.label}</b><small>${l.sub}</small></span></button>`).join('');
  let h='', row=1;
  ROADMAP.stages.forEach((s,si)=>{
    h+=`<div class="band b${si}" style="grid-row:${row}"><span class="tag">${s.label}</span><h2>${s.title}</h2>${s.hint?`<small>${s.hint}</small>`:''}</div>`;
    row++;
    ROADMAP.lanes.forEach((l,li)=>{
      const its=ROADMAP.items.filter(i=>i.lane===l.id&&i.stage===s.id);
      h+=`<div class="cell ${l.id} ${focus&&focus!==l.id?'dim':''}" style="grid-row:${row};grid-column:${li+1}">${its.map(cardHTML).join('')||'<div class="empty"></div>'}</div>`;
    });
    row++;
  });
  ROADMAP.lanes.forEach((l,li)=>{h+=`<div class="rail ${l.id} ${l.id!=='story'?'end':''}" style="grid-column:${li+1};grid-row:1 / ${row};--c:${l.color}"></div>`});
  $('#board').innerHTML=h;
  const d=showAllDone?ROADMAP.done:ROADMAP.done.slice(0,4);
  $('#doneList').innerHTML=d.map(x=>`<div><span class="ck">✓</span><span>${x.title}</span><em>${x.note}</em><i class="lt" style="background:${laneOf(x.lane).color}"></i></div>`).join('');
  $('#more').textContent=showAllDone?ROADMAP.ui.less:ROADMAP.ui.more;
}
let opener=null, previousOverflow='';
function open(id){
  opener=document.activeElement;previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
  const it=ROADMAP.items.find(i=>i.id===id); if(!it) return;
  const l=laneOf(it.lane), st=ROADMAP.stages.find(s=>s.id===it.stage);
  let art;
  if(it.mystery) art=`<div class="emo q">？？？</div>`;
  else if(it.art) art=`<img class="bg" src="${it.art.bg}" alt=""><img class="chr" src="${it.art.chr}" alt="">`;
  else if(it.iconImg) art=`<img class="bg" src="${ROADMAP.ui.sheetImage}" alt=""><img class="chr" src="${it.iconImg}" alt="">`;
  else art=`<img class="bg" src="${ROADMAP.ui.sheetEmojiImage}" alt="" style="opacity:.45"><div class="emo">${it.icon}</div>`;
  const kind=it.kind==='main'?`<span class="chip">${ROADMAP.ui.main}</span>`:it.kind==='side'?`<span class="chip om">${ROADMAP.ui.side}</span>`:'';
  $('#sheet').style.setProperty('--c',l.color);
  $('#sheet').innerHTML=`<div class="art">${art}</div><div class="body">
    <div class="chips"><span class="chip">${l.icon} ${l.label}</span>${kind}<span class="chip st">${it.wip?ROADMAP.ui.wip:st.label}</span></div>
    <h3 id="roadmapSheetTitle">${it.title}</h3><p class="lead">${it.lead}</p>${it.synopsis?`<div class="syn"><b>${it.synopsis.title}</b><p>${it.synopsis.text}</p></div>`:''}<ul>${it.points.map(p=>`<li>${p}</li>`).join('')}</ul>
    <button class="close" id="close">${ROADMAP.ui.close}</button></div>`;
  $('#mask').classList.add('open');$('#sheet').classList.add('open');$('#sheet').setAttribute('aria-hidden','false');$('#close').focus({preventScroll:true});
}
function close(){if(!$('#sheet').classList.contains('open'))return;$('#mask').classList.remove('open');$('#sheet').classList.remove('open');$('#sheet').setAttribute('aria-hidden','true');document.body.style.overflow=previousOverflow;if(opener?.isConnected)opener.focus({preventScroll:true});}
document.addEventListener('click',e=>{
  if(!e.target.closest('#roadmap,#roadmapDialogRoot'))return;
  const l=e.target.closest('[data-lane]'); if(l){focus=focus===l.dataset.lane?null:l.dataset.lane;document.querySelectorAll('#roadmap [data-lane],#roadmap .cell').forEach(n=>{const lane=n.dataset.lane||ROADMAP.lanes.find(x=>n.classList.contains(x.id))?.id;n.classList.toggle('dim',!!focus&&lane!==focus);if(n.dataset.lane)n.setAttribute('aria-pressed',String(lane===focus));});return}
  if(e.target.closest('#more')){showAllDone=!showAllDone;render();return}
  const c=e.target.closest('[data-id]'); if(c){open(c.dataset.id);return}
  if(e.target.closest('#close')||e.target===$('#mask')) close();
});
render();

document.addEventListener('keydown',e=>{
 if(!$('#sheet').classList.contains('open'))return;
 if(e.key==='Escape'){e.preventDefault();close();}
 if(e.key==='Tab'){e.preventDefault();$('#close').focus();}
});
window.renderRoadmap=()=>{close();focus=null;showAllDone=false;render();};
window.closeRoadmapSheet=close;

})();
