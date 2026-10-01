'use strict';
const catalogRows=MOTION_CATALOG.rows;
const $=id=>document.getElementById(id);
const labels={unreviewed:'未確認',ok:'見た目確認済み',issue:'気になる'};
const storageKey='monster-motion-review-v1';
let reviews={},selected=null,visibleRows=[],ally=false,playEpoch=0;
try{const raw=JSON.parse(localStorage.getItem(storageKey)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))reviews=raw;}catch{$('storageStatus').textContent='端末内の記録を読み込めませんでした。確認記録をまとめて保存してください。';}
function reviewOf(row){const r=reviews[row.id];return r&&r.fingerprint===row.fingerprint&&['ok','issue','unreviewed'].includes(r.mark)?r:{mark:'unreviewed',note:''};}
function saveReview(mark){if(!selected?.motion)return;reviews[selected.id]={fingerprint:selected.fingerprint,mark,note:$('note').value.slice(0,1000),updatedAt:new Date().toISOString()};try{localStorage.setItem(storageKey,JSON.stringify(reviews));}catch{$('storageStatus').textContent='この端末には保存できません。確認記録をまとめてコピーしてください。';}renderCards();updateMark();}
function updateMark(){const r=reviewOf(selected);$('markStatus').textContent=selected.motion?labels[r.mark]:'未登録のため、モーションの確認はまだできません。';document.querySelectorAll('[data-mark]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mark===r.mark)));}
function renderCards(){
 const query=$('search').value.trim().toLowerCase(),filter=$('filter').value;
 visibleRows=catalogRows.filter(r=>{const mark=reviewOf(r).mark;return (!query||(r.name+' '+r.no+' '+r.id).toLowerCase().includes(query))&&(filter==='all'||filter==='registered'&&r.motion||filter==='pending'&&!r.motion||filter==='unreviewed'&&r.motion&&mark==='unreviewed'||filter==='ok'&&r.motion&&mark==='ok'||filter==='issue'&&r.motion&&mark==='issue');});
 const frag=document.createDocumentFragment();
 for(const r of visibleRows){const b=document.createElement('button');b.className='card'+(r.motion?'':' pending');b.dataset.id=r.id;
 const img=document.createElement('img');img.src=r.motion?.poster||r.art;img.alt='';img.loading='lazy';img.decoding='async';
 const caption=document.createElement('span');caption.className='caption';const n=document.createElement('span');n.className='number';n.textContent='No.'+String(r.no).padStart(2,'0');const name=document.createElement('strong');name.textContent=r.name;const badge=document.createElement('span');badge.className='badge '+reviewOf(r).mark;badge.textContent=r.motion?labels[reviewOf(r).mark]:'登録待ち・静止画';caption.append(n,name,badge);b.append(img,caption);b.onclick=()=>inspect(r.id);frag.append(b);}
 $('cards').replaceChildren(frag);$('empty').hidden=!!visibleRows.length;
 const registered=catalogRows.filter(r=>r.motion);$('counts').textContent=`登録 ${registered.length} / 50体 · 見た目確認済み ${registered.filter(r=>reviewOf(r).mark==='ok').length} · 気になる ${registered.filter(r=>reviewOf(r).mark==='issue').length}`;
}
function releaseVideo(){playEpoch++;const v=$('motion');v.pause();v.removeAttribute('src');v.load();v.hidden=true;$('still').hidden=false;}
function setFacing(){const flip=selected?.motion&&(ally?selected.motion.allyFlip:selected.motion.enemyFlip);for(const e of [$('still'),$('motion')])e.style.transform=flip?'scaleX(-1)':'';$('side').textContent=ally?'敵の向き':'味方の向き';}
function inspect(id){const row=catalogRows.find(r=>r.id===id);if(!row)return;releaseVideo();selected=row;ally=false;
 $('detailName').textContent=`No.${row.no} ${row.name}`;$('detailState').textContent=row.motion?'登録済み · 最終受入は別途':'登録待ち · '+row.sourceState;
 $('still').src=row.motion?.poster||row.art;$('still').alt=row.name;$('note').value=reviewOf(row).note||'';$('reviewFields').disabled=!row.motion;$('play').disabled=!row.motion;$('side').disabled=!row.motion;
 $('battleLink').hidden=!row.motion;$('battleLink').href='tools/motion-review/gran-volmoog-review.generated.html?species='+encodeURIComponent(row.id);
 $('playStatus').textContent=row.motion?'再生ボタンで動きを確認できます。':'現在は本編の静止画を表示しています。';setFacing();updateMark();
 if(!$('inspector').open)$('inspector').showModal();
}
async function playSelected(){if(!selected?.motion||document.hidden)return;const token=++playEpoch,v=$('motion');if(!v.hasAttribute('src')){v.src=selected.motion.src;v.poster=selected.motion.poster;}v.hidden=false;$('still').hidden=false;$('playStatus').textContent='読み込み中…';try{await v.play();if(token!==playEpoch)return;$('still').hidden=true;$('playStatus').textContent='再生中。確認済みの印は自動では付きません。';}catch{if(token!==playEpoch)return;releaseVideo();$('playStatus').textContent='再生できませんでした。静止画を表示しています。再生ボタンで再試行できます。';}}
$('motion').addEventListener('error',()=>{releaseVideo();$('playStatus').textContent='動画を読み込めませんでした。静止画を表示しています。';});
$('play').onclick=playSelected;$('pause').onclick=()=>{playEpoch++;$('motion').pause();$('playStatus').textContent='停止中';};
$('close').onclick=()=>$('inspector').close();$('inspector').addEventListener('close',releaseVideo);$('inspector').addEventListener('cancel',releaseVideo);
$('side').onclick=()=>{ally=!ally;setFacing();};$('background').onchange=()=>$('stage').className='stage '+$('background').value;
$('note').onchange=()=>saveReview(reviewOf(selected).mark);document.querySelectorAll('[data-mark]').forEach(b=>b.onclick=()=>saveReview(b.dataset.mark));
function step(delta){const list=visibleRows.filter(r=>r.motion);if(!list.length)return;const i=list.findIndex(r=>r.id===selected?.id);inspect(list[(i+delta+list.length)%list.length].id);}
$('next').onclick=()=>step(1);$('previous').onclick=()=>step(-1);$('search').oninput=renderCards;$('filter').onchange=renderCards;
document.addEventListener('visibilitychange',()=>{if(document.hidden){playEpoch++;$('motion').pause();$('playStatus').textContent='画面を離れたため停止しました。再生ボタンで再開できます。';}});window.addEventListener('pagehide',releaseVideo);
function exportReport(){const lines=['モーション確認記録',new Date().toISOString(),'登録 '+catalogRows.filter(r=>r.motion).length+'/50体','※見た目の個人確認。性能・最終受入の合格ではありません。'];for(const r of catalogRows.filter(r=>r.motion)){const v=reviewOf(r);lines.push(`No.${r.no} ${r.name}：${labels[v.mark]}${v.note?' ／ '+v.note:''}`);}const text=lines.join('\n');$('report').value=text;$('reportPanel').open=true;return text;}
$('export').onclick=exportReport;$('copy').onclick=async()=>{const text=exportReport();try{await navigator.clipboard.writeText(text);$('copyStatus').textContent='コピーしました';}catch{$('report').focus();$('report').select();$('copyStatus').textContent='文章を長押ししてコピーしてください';}};
renderCards();
