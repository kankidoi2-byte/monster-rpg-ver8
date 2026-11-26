function chooseDifferentTitleMap(){
  const candidates=MAPS.filter(map=>map && mapPortraitImage(map));
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
// Start the two visible images as soon as their map and monster data are ready.
function renderTitleArtwork(){
  const map=chooseDifferentTitleMap();
  const monster=chooseTitleMonster(map);
  const bg=document.getElementById('titleBg');
  const mon=document.getElementById('titleMonster');
  const scene=document.getElementById('titleSceneName');
  const mapImage=mapPortraitImage(map);
  if(bg && mapImage) bg.style.backgroundImage=`url("${mapImage}")`;
  if(mon && monster){mon.src=IMG[monster.imgKey];mon.alt=monster.name;mon.hidden=false;}
  if(scene) scene.textContent=map ? `${map.name}${monster ? ' — '+monster.name : ''}` : '';
}

try{renderTitleArtwork();}catch(error){
  console.warn('Title artwork could not be prepared:',error);
}
