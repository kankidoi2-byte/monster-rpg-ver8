/* Two device-local anonymous profiles. Slot 1 retains the published save key. */
(function(global){
  'use strict';
  const META='mb_profiles_v1', PICK='mb_profile_tab_v1', BASE='mb_v95c';
  let state=null, slot=1, baseline=null, conflict=false, available=true;
  const uuid=()=>crypto.randomUUID();
  try{
    const raw=localStorage.getItem(META);
    if(raw){state=JSON.parse(raw);if(state.version!==1||!Array.isArray(state.profiles)||state.profiles.length!==2||state.profiles.some((x,i)=>x.slot!==i+1||typeof x.id!=='string'||typeof x.token!=='string'))throw Error('プロフィール情報を読み込めません。');}
    else{state={version:1,selected:1,profiles:[1,2].map(n=>({slot:n,id:uuid(),token:uuid()+uuid(),name:n===1?'プレイヤー1':'プレイヤー2',consent:false}))};localStorage.setItem(META,JSON.stringify(state));}
    const requested=Number(sessionStorage.getItem(PICK)||state.selected);slot=requested===2?2:1;
    baseline=localStorage.getItem(key(BASE));
  }catch(error){available=false;console.error('Profile storage unavailable',error);}
  function key(k){return slot===1?k:(k.startsWith(BASE)?`${BASE}_profile2${k.slice(BASE.length)}`:k);}
  function current(){return state?.profiles.find(p=>p.slot===slot)||null;}
  function persist(){const fresh=JSON.parse(localStorage.getItem(META)||JSON.stringify(state));fresh.profiles=fresh.profiles.map(p=>p.slot===slot?current():p);fresh.selected=state.selected;localStorage.setItem(META,JSON.stringify(fresh));state=fresh;}
  function notify(text){if(typeof alert==='function')alert(text);}
  function canSwitch(){return typeof busy==='undefined'||!busy||document.getElementById('battle')?.classList.contains('is-finished');}
  global.MonsterProfiles={
    key,current,slot:()=>slot,available:()=>available,
    beforeSave(){if(!available)return false;let actual;try{actual=localStorage.getItem(key(BASE));}catch(_){notify('セーブを読み取れないため保存を停止しました。');return false;}if(conflict||actual!==baseline){conflict=true;notify('同じプロフィールが別の画面で更新されました。この画面からの保存を止めました。再読み込みしてください。');return false;}return true;},
    afterSave(raw){baseline=raw;},
    rename(name){if(!current())return false;const cleaned=String(name||'').trim().slice(0,20);if(!cleaned)return false;const old=current().name;current().name=cleaned;try{persist();return true;}catch(e){current().name=old;notify('名前を保存できませんでした。');return false;}},
    consent(value){if(!current())return false;const old=current().consent;current().consent=value===true;try{persist();return true;}catch(e){current().consent=old;notify('設定を保存できませんでした。');return false;}},
    switchTo(n){if(!available||![1,2].includes(n)||n===slot)return false;if(!canSwitch()){notify('戦闘や演出が終わってから切り替えてください。');return false;}if(typeof saveGame==='function'&&!saveGame())return false;try{sessionStorage.setItem(PICK,String(n));state.selected=n;persist();location.reload();return true;}catch(e){notify('プロフィールを切り替えられませんでした。');return false;}},
    mount(){const host=document.getElementById('moreMenu');if(!host||host.querySelector('.profile-panel'))return;const panel=document.createElement('section');panel.className='panel profile-panel';const heading=document.createElement('h2');heading.textContent='プロフィール';panel.append(heading);if(!available){const msg=document.createElement('p');msg.textContent='プロフィール情報を読み込めないため保存を停止しています。セーブを書き出してからブラウザ設定を確認してください。';panel.append(msg);host.prepend(panel);return;}const profile=current();const info=document.createElement('p');info.textContent=`使用中：${profile.name}（枠${slot}）`;panel.append(info);const id=document.createElement('p');id.className='profile-id';id.textContent=`管理用ID：${profile.id}`;panel.append(id);const input=document.createElement('input');input.type='text';input.maxLength=20;input.value=profile.name;input.setAttribute('aria-label','プロフィール名');panel.append(input);const rename=document.createElement('button');rename.type='button';rename.textContent='名前を保存';rename.onclick=()=>{if(this.rename(input.value))info.textContent=`使用中：${profile.name}（枠${slot}）`;};panel.append(rename);const change=document.createElement('button');change.type='button';const other=state.profiles.find(p=>p.slot!==slot);change.textContent=`${other.name}（枠${other.slot}）に切替`;change.onclick=()=>this.switchTo(other.slot);panel.append(change);const note=document.createElement('p');note.textContent='セーブは枠ごとに独立し、このブラウザに保存されます。ブラウザデータを削除する前に、各枠でセーブを書き出してください。';panel.append(note);const label=document.createElement('label');label.className='profile-consent';const check=document.createElement('input');check.type='checkbox';check.checked=profile.consent;check.onchange=()=>{if(!this.consent(check.checked)){check.checked=profile.consent;return;}if(global.MonsterAnalytics)global.MonsterAnalytics.consentChanged();};label.append(check,document.createTextNode('ゲーム改善のため匿名プレイ記録の送信に協力する'));panel.append(label);const privacy=document.createElement('p');privacy.textContent='送信する内容：管理用ID、プロフィール名、操作中の時間、進行、編成・技、戦闘結果、利用した画面。実名・メール・セーブ全文は送りません。開発者だけが閲覧します。解除すると送信を停止します。';panel.append(privacy);const status=document.createElement('p');status.id='profileTelemetryStatus';status.textContent=profile.consent?'記録送信：有効':'記録送信：無効';panel.append(status);host.prepend(panel);}
  };
  if(global.addEventListener)global.addEventListener('storage',event=>{if(event.key===key(BASE)&&event.newValue!==baseline)conflict=true;});
})(globalThis);
