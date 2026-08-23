/* ===== 初期化 ===== */
function initSaveManagementUi(){
  const resetButton=document.querySelector('#moreMenu .ui-danger-button');
  if(!resetButton||document.querySelector('#moreMenu .save-management'))return;
  const panel=document.createElement('details');
  panel.className='save-management';
  panel.innerHTML=`<summary>💾 セーブ管理</summary>
    <p>機種変更や破損に備えて、セーブデータを端末へ保存できます。</p>
    <div class="save-management-actions">
      <button type="button" onclick="exportSaveData()">セーブを書き出す</button>
      <button type="button" onclick="openSaveImport()">セーブを読み込む</button>
      <button type="button" onclick="restoreLastKnownGood()">直前のバックアップへ戻す</button>
      <button type="button" onclick="showSaveRecoveryReport()">修復・移行記録を見る</button>
      <button type="button" onclick="copySaveText('current')">現在の内容をコピー</button>
      <button type="button" onclick="copySaveText('corrupt')">破損内容をコピー</button>
    </div>
    <input id="saveImportInput" type="file" accept="application/json,.json" hidden onchange="importSaveData(this)">`;
  resetButton.before(panel);
}
initSaveManagementUi();
initStarters();
migrateSkillSystem();
saveGame();
renderParty();

function chooseDifferentTitleMap(){
  const candidates=MAPS.filter(map=>map && map.image);
  if(!candidates.length) return null;
  let last='';
  try{ last=localStorage.getItem(TITLE_LAST_MAP_KEY)||''; }catch(_e){}
  const pool=candidates.length>1 ? candidates.filter(map=>map.id!==last) : candidates;
  const selected=pool[Math.floor(Math.random()*pool.length)] || candidates[0];
  try{ localStorage.setItem(TITLE_LAST_MAP_KEY,selected.id); }catch(_e){}
  return selected;
}
function chooseTitleMonster(map){
  const ids=[...(map?.enemyIds||[])];
  const unique=[...new Set(ids)];
  const mapMonsters=unique.map(id=>M.find(mon=>mon.id===id)).filter(mon=>mon?.imgKey && IMG[mon.imgKey]);
  const all=M.filter(mon=>mon?.imgKey && IMG[mon.imgKey]);
  const pool=mapMonsters.length ? mapMonsters : all;
  return pool.length ? pool[Math.floor(Math.random()*pool.length)] : null;
}
function initTitleScreen(){
  try{
    const screen=document.getElementById('titleScreen');
    if(!screen) return;
    const map=chooseDifferentTitleMap();
    const monster=chooseTitleMonster(map);
    const bg=document.getElementById('titleBg');
    const mon=document.getElementById('titleMonster');
    const scene=document.getElementById('titleSceneName');
    if(bg && map?.image) bg.style.backgroundImage=`url("${map.image}")`;
    if(mon && monster){mon.src=IMG[monster.imgKey];mon.alt=monster.name;mon.hidden=false;}
    if(scene) scene.textContent=map ? `${map.name}${monster ? ' — '+monster.name : ''}` : '';
    const begin=()=>startFromTitle();
    screen.addEventListener('click',begin,{once:true});
    screen.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&!titleStarted){event.preventDefault();begin();}});
  }catch(err){
    // Ver7.6: 演出の組み立てに失敗しても、最低限タップで開始できる状態は保つ
    console.error('titleScreen init failed, falling back:', err);
    try{
      const screen=document.getElementById('titleScreen');
      if(screen) screen.addEventListener('click',()=>startFromTitle(),{once:true});
    }catch(_e){
      document.body.classList.remove('title-mode');
      const screen=document.getElementById('titleScreen');
      if(screen) screen.remove();
      if (typeof show === 'function') show('home');
    }
  }
}
function startFromTitle(){
  if(titleStarted) return;
  titleStarted=true;
  const screen=document.getElementById('titleScreen');
  if(screen) screen.classList.add('title-leaving');
  setTimeout(()=>{
    document.body.classList.remove('title-mode');
    if(screen) screen.remove();
    show('home');
  },620);
}
try{ initTitleScreen(); }catch(err){
  console.error('initTitleScreen threw synchronously, forcing home:', err);
  document.body.classList.remove('title-mode');
  const screen=document.getElementById('titleScreen');
  if(screen) screen.remove();
  if (typeof show === 'function') show('home');
}
