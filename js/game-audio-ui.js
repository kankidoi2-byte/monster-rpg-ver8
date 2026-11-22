/* Sound presentation only. Game state, turn timing and save data are untouched. */
let gameAudioBattleStarted=false;
let gameAudioBattleBlocked=null;
function gameAudioResetBattle(){gameAudioBattleStarted=false;gameAudioBattleBlocked=null;}
function gameAudioPlay(key,delay){if(typeof GameAudio!=='undefined')GameAudio.playSe(key,delay);}
function gameAudioBattleInput(processing,finished){
  if(!gameAudioBattleStarted)return;
  if(gameAudioBattleBlocked!==false&&!processing&&!finished)gameAudioPlay('turn');
  gameAudioBattleBlocked=processing;
}
function gameAudioScreenChanged(id){
  if(typeof GameAudio==='undefined')return;
  if(id==='battle'){
    if(gameAudioBattleStarted||(typeof battleFeedback!=='undefined'&&battleFeedback.finished))return;
    gameAudioBattleStarted=true;
    // Story/tutorial encounters intentionally keep their existing (silent) score.
    const ordinary=typeof activeHuntRequest!=='undefined'&&activeHuntRequest&&!['map_story','prologue_part2','tutorial'].includes(activeHuntRequest.source)&&!(typeof tutorialBattleSession!=='undefined'&&tutorialBattleSession.active);
    const tier=ordinary&&activeHuntRequest.overtier;
    const special=tier==='nushi'?'battle:nushi':tier==='stronger'?'battle:strong':null;
    const map=typeof selectedMap==='undefined'?null:selectedMap?.id;
    const track=ordinary?(special||(['grassland','volcano','lake'].includes(map)?'battle:'+map:'otherBattle')):'otherBattle';
    GameAudio.beginBattle(track);
    if(ordinary)gameAudioPlay(special?'encounterStrong':'encounter');
  }else if(id==='home'||id==='battleChoices')GameAudio.setScene(id==='home'?'home':'mapSelect');
  if(id==='audioSettings')renderGameAudioSettings();
}
function gameAudioMoveKeys(move){
  if(!(Number(move?.[1])>0))return [];
  const motion=typeof skillBattleMotionForMove==='function'?skillBattleMotionForMove(move):null;
  const form=motion?.form,name=String(move?.[0]||'');
  const keys=[];
  // Only adopted sword/claw families have action sounds. No generic hit fallback.
  if(form==='tail'||(form==='claw'&&name!=='フレイムクロー'))keys.push('swing');
  else if(['sword','blade','dagger','claw'].includes(form)){
    keys.push(form!=='claw'&&/大剣|重斬|重い斬|渾身斬り|呪鉄斬/.test(name)?'slashHeavy':'slashLight');
  }
  const types=motion?.types||(typeof moveTypes==='function'?moveTypes(move):[]);
  if(types.includes('fire'))keys.push('fire');
  return keys;
}
function gameAudioMoveImpact(move){
  if(typeof GameAudio==='undefined')return;
  const keys=gameAudioMoveKeys(move);
  keys.forEach((key,index)=>GameAudio.playSe(key,index*.1));
}
function gameAudioEnable(button){
  button.textContent='音を準備しています';
  GameAudio.unlock().then(ok=>{button.textContent=ok&&!GameAudio.debugState().lastError?'音を有効にしました':'音を読み込めませんでした。もう一度タップ';});
}
function renderGameAudioSettings(){
  if(typeof GameAudio==='undefined')return;
  const settings=GameAudio.getSettings();
  for(const kind of ['bgm','se']){
    const slider=document.getElementById(`audio-${kind}-volume`),value=document.getElementById(`audio-${kind}-value`),mute=document.getElementById(`audio-${kind}-mute`);
    if(slider)slider.value=Math.round(settings[`${kind}Volume`]*100);
    if(value)value.textContent=`${Math.round(settings[`${kind}Volume`]*100)}%`;
    if(mute)mute.checked=settings[`${kind}Muted`];
  }
}
function gameAudioVolume(kind,value){GameAudio.setVolume(kind,Number(value)/100);renderGameAudioSettings();}
function gameAudioMute(kind,value){GameAudio.setMuted(kind,value);renderGameAudioSettings();}
function gameAudioUiKey(element){
  if(!element)return null;
  if(element.disabled||element.getAttribute('aria-disabled')==='true')return element.matches('#battleSwitchButton,[data-item],[data-item-target],[data-reserve-index],[data-move-index]')?'error':null;
  if(element.dataset.sound)return element.dataset.sound==='none'?null:element.dataset.sound;
  const action=element.getAttribute('onclick')||'',text=(element.getAttribute('aria-label')||element.textContent||'').trim();
  if(element.matches('[role="tab"]')||/selectTab|openGachaTab/.test(action))return 'tab';
  if(/^(次へ|前へ|次のページ|前のページ|[◀▶])$/.test(text)||/(?:next|prev)Page/i.test(action))return 'page';
  if(/showNotices\(|performManualPartySwitch\(|renewalSwitch\(/.test(action))return null; // Dedicated successful action hook.
  if(/閉じる|close|Close/.test(text+' '+action))return 'menuClose';
  if(/戻る|やめる|キャンセル|あとで|‹|^×$/.test(text)||/Back\(|cancel|Cancel/.test(action))return 'cancel';
  if(/show\(['"]moreMenu|Open|open|Preview|showModal|toggle.*Panel|showTypeChart/.test(action)||/メニュー/.test(text))return 'menuOpen';
  if(element.matches('input,select,[role="tab"],[role="switch"]')||/Filter|filter|SelectTarget|selectTab|set.*Sort/.test(action))return 'tap';
  return 'confirm';
}
(function installGameAudioUi(){
  if(typeof document==='undefined'||typeof GameAudio==='undefined')return;
  let lastUiSoundAt=0;
  const playUi=key=>{if(key){lastUiSoundAt=Date.now();GameAudio.playSe(key);}};
  document.addEventListener('click',event=>{
    if(!event.isTrusted)return;
    GameAudio.unlock();
    const control=event.target.closest?.('button,a,[role="button"],[role="tab"],input,select,summary');
    if(control?.id==='titleScreen'||control?.tagName==='SUMMARY')return;
    // Native disabled buttons do not dispatch a trusted click on all browsers.
    if(control?.disabled)return;
    playUi(gameAudioUiKey(control));
  },true);
  document.addEventListener('pointerdown',event=>{
    if(!event.isTrusted)return;
    const control=event.target.closest?.('button[disabled]');
    if(gameAudioUiKey(control)==='error')playUi('error');
  },true);
  document.addEventListener('keydown',event=>{
    if(event.isTrusted&&(event.key==='Enter'||event.key===' '))GameAudio.unlock();
  },true);
  // Native dialog dismissal (Escape / Android back) also gets its adopted sound.
  document.addEventListener('close',event=>{if(event.target?.tagName==='DIALOG'&&Date.now()-lastUiSoundAt>50)playUi('menuClose');},true);
  document.addEventListener('toggle',event=>{if(event.target?.tagName==='DETAILS')playUi(event.target.open?'menuOpen':'menuClose');},true);
  GameAudio.setScene('title');
})();
