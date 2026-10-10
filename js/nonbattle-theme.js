/* Presentation only. No save, progression, combat or economy writes. */
const NONBATTLE_THEME_PRESETS = Object.freeze({
  home: Object.freeze({white:70, black:30, shape:'polygon(0 0, 42% 0, 18% 100%, 0 100%)'}),
  party: Object.freeze({white:85, black:15, shape:'polygon(70% 0, 100% 0, 100% 100%)'}),
  growth: Object.freeze({white:85, black:15, shape:'polygon(100% 0, 100% 100%, 70% 100%)'}),
  dex: Object.freeze({white:90, black:10, shape:'polygon(0 0, 100% 0, 100% 20%)'}),
  detail: Object.freeze({white:65, black:35, shape:'polygon(30% 0, 100% 0, 100% 100%)'}),
  gacha: Object.freeze({white:75, black:25, shape:'polygon(0 100%, 100% 50%, 100% 100%)'}),
  story: Object.freeze({white:70, black:30, shape:'polygon(40% 0, 100% 0, 100% 100%)'}),
  menu: Object.freeze({white:95, black:5, shape:'polygon(100% 60%, 100% 100%, 75% 100%)'}),
  settings: Object.freeze({white:95, black:5, shape:'polygon(80% 0, 100% 0, 100% 50%)'})
});
const NONBATTLE_SCREEN_THEMES = Object.freeze({
  home:'home',homeFavoriteSelect:'home',party:'party',partySet:'party',
  growthHub:'growth',evolution:'growth',fusion:'growth',alchemy:'growth',alchemyConfirm:'growth',alchemyResult:'growth',skillEdit:'growth',skillSynthesis:'growth',
  dexHub:'dex',dex:'dex',characterDex:'dex',mapDex:'dex',itemDex:'dex',skillDex:'dex',typeChart:'dex',
  gachaHub:'gacha',itemGacha:'gacha',characterGacha:'gacha',skillGacha:'gacha',
  storyMode:'story',tutorialRequestReport:'story',tutorialStellaCard:'story',battleChoices:'story',
  expedition:'growth',shop:'menu',moreMenu:'menu',contractorRank:'menu',contractorRankRewards:'menu',contractorTitles:'menu',notices:'settings',diagnosticsScreen:'settings'
});
let nonbattlePreviousScreenId=null;
function applyNonbattleTheme(id){
  const changed=nonbattlePreviousScreenId!==id;
  nonbattlePreviousScreenId=id;
  const family=NONBATTLE_SCREEN_THEMES[id];
  if(!family){
    delete document.body.dataset.nonbattleTheme;
    document.body.style.removeProperty('--nonbattle-shape');
    return;
  }
  const screen=document.getElementById(id);
  if(!screen)return;
  if(changed&&typeof window!=='undefined'&&typeof window.scrollTo==='function')window.scrollTo({top:0,left:0,behavior:'instant'});
  screen.classList.add('nonbattle-screen');
  screen.dataset.themeFamily=family;
  document.body.dataset.nonbattleTheme=family;
  document.body.style.setProperty('--nonbattle-shape',NONBATTLE_THEME_PRESETS[family].shape);
  document.body.style.setProperty('--nonbattle-detail-shape',NONBATTLE_THEME_PRESETS.detail.shape);
  screen.querySelectorAll('button[onclick]').forEach(button=>{
    if(/^\s*show\(['"]home['"]\)\s*;?\s*$/.test(button.getAttribute('onclick')||'')){
      button.classList.add('nonbattle-home-button');
      button.textContent='‹　ホームへ';
    }
  });
}
function renderNonbattleHomeContext(){
  const label=document.getElementById('homeLocationLabel');
  if(!label)return;
  const finished=typeof storyProgressSnapshot==='function'&&storyProgressSnapshot().finished;
  label.textContent=finished?'世界の狭間':'冒険の拠点';
  label.dataset.prologue=finished?'finished':'ongoing';
}
Object.entries(NONBATTLE_SCREEN_THEMES).forEach(([id,family])=>{
  const screen=document.getElementById(id);
  if(screen){screen.classList.add('nonbattle-screen');screen.dataset.themeFamily=family;}
});
applyNonbattleTheme(document.querySelector('.screen.active')?.id);
