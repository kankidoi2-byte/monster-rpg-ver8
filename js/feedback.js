/* Feedback outbox and receipts are profile-local and never part of the game save. */
(function(global){
 'use strict';
 const ENDPOINT='https://monster-battle-records.kanki-doi-2.chatgpt.site/api/feedback';
 const VERSION='Ver8.0-feedback-20261102';
 const KINDS={
  bug:{ic:'🐞',nm:'不具合',ds:'動かない・表示がおかしい',ph:'例：バトルで技を選んだあと画面が止まった。\n・何をしていた時に\n・どうなったか\n・何回起きたか'},
  idea:{ic:'💡',nm:'改善要望',ds:'使いにくい・こうしてほしい',ph:'例：世界地図で行きたい場所を探しにくいので、最後に行った場所を覚えておいてほしい。'},
  praise:{ic:'✉',nm:'感想',ds:'楽しかった・好きなところ',ph:'例：ナイトレイヴに進化した時の演出が格好よかった。'}
 };
 const SCREENS={home:'ホーム',battle:'バトル',battleChoices:'世界地図(行き先選択)',gachaHub:'ガチャ',contractConfirm:'魂の契約',party:'モンスター一覧',growthHub:'育成・錬成',skillEdit:'技の編集',dexHub:'図鑑',shop:'ショップ',expedition:'遠征',storyMode:'ストーリー',tutorial:'チュートリアル',other:'その他・特定の画面ではない'};
 const profile=()=>global.MonsterProfiles?.current();
 const key=id=>`mb_feedback_v1_${id}`;
 const day=(at=Date.now())=>new Date(at+9*3600000).toISOString().slice(0,10);
 const nextDay=()=>new Date(Date.parse(day()+'T00:00:00+09:00')+86400000).toISOString();
 const empty=()=>({history:[],queue:[],quota:{day:day(),count:0},blockedUntil:null});
 let lastScreen='home',contextScreen='home',draft={kind:null,screen:'home',body:''},sending=false,started=false,error='',completion=null;
 const root=()=>document.getElementById('feedbackBox');
 function read(id){const raw=localStorage.getItem(key(id));if(!raw)return empty();const s=JSON.parse(raw);if(!Array.isArray(s.history)||!Array.isArray(s.queue)||!s.quota)throw Error('控えを読み込めませんでした。');return s;}
 function write(id,s){localStorage.setItem(key(id),JSON.stringify(s));}
 function remaining(s){return s.blockedUntil&&Date.parse(s.blockedUntil)>Date.now()?0:Math.max(0,5-(s.quota.day===day()?s.quota.count:0));}
 function scopedLock(id,fn){return global.navigator?.locks?.request?global.navigator.locks.request(key(id),fn):fn();}
 function classify(id){
  if(Object.hasOwn(SCREENS,id))return id;
  if(['dex','characterDex','mapDex','itemDex','skillDex','typeChart'].includes(id))return 'dexHub';
  if(['evolution','fusion','alchemy','alchemyConfirm','alchemyResult','skillSynthesis'].includes(id))return 'growthHub';
  if(['characterGacha','skillGacha','itemGacha'].includes(id))return 'gachaHub';
  if(['mapStory','tutorialRequestReport','tutorialStellaCard'].includes(id))return id==='mapStory'?'storyMode':'tutorial';
  if(['partySet','monsterDetail','roster'].includes(id))return 'party';
  if(['contractAnimation','postBattleContract'].includes(id))return 'contractConfirm';
  return 'other';
 }
 function context(){
  const p=profile(),device=global.MonsterAnalytics?.feedbackDevice?.()||{};
  const progress=typeof save==='object'?save.progress?.tutorial:null;
  return {profileName:p?.name||'',version:VERSION,device,progress:progress?.completed?'序章 クリア済み':`序章 ${progress?.stepId||'開始前'}`};
 }
 function deviceLabel(d){const ua=global.navigator?.userAgent||'';const os=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/CrOS/.test(ua)?'ChromeOS':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':'端末不明';return os+(d.model?' ・ '+d.model:'');}
 const stamp=at=>new Date(at).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function button(label,fn,cls='ghost'){const b=el('button',cls,label);b.type='button';b.onclick=fn;return b;}
 function chip(kind){return el('span','chip '+kind,`${KINDS[kind]?.ic||''} ${KINDS[kind]?.nm||kind}`);}
 function badge(){try{const seen=localStorage.getItem('mb_feedback_seen_v1')==='1';const b=document.getElementById('feedbackMenuButton');b?.classList.toggle('feedback-new',!seen);const tag=document.getElementById('feedbackNew');if(tag)tag.hidden=seen;}catch(_){}}
 function refresh(){
  const host=root();if(!host)return;const len=draft.body.length,count=host.querySelector('#fb-count'),send=host.querySelector('#fb-send');
  if(count){count.textContent=`${len} / 1000`;count.classList.toggle('over',len>1000);}
  let left=0;try{left=remaining(read(profile().id));}catch(_){}
  if(send){send.disabled=sending||!draft.kind||draft.body.trim().length<2||len>1000||left===0;send.textContent=sending?'送信中…':left?'送る':'今日はもう送れません';}
  const quota=host.querySelector('.quota');if(quota)quota.textContent=`今日あと${left}件送れます`;
 }
 function render(){
  const host=root();if(!host)return;host.replaceChildren();
  host.append(button('‹ メニュー',()=>global.show('moreMenu'),'back'));
  const head=el('div','head');head.append(el('span','eyebrow','FEEDBACK'),el('h1','', '意見箱'),el('p','','届いた意見は開発者がすべて読みます。返信はできません。'));host.append(head);
  let s;try{if(!profile()||global.MonsterProfiles?.available?.()===false)throw Error('プロフィール情報を読み込めません。');s=read(profile().id);}catch(e){host.append(el('p','err',e.message));return;}
  if(completion){const panel=el('div','panel done');panel.setAttribute('role','status');panel.append(el('div','seal','受'),el('h2','',completion==='sent'?'届きました':'送信を予約しました'),el('p','',completion==='sent'?'ありがとうございます。今後の更新の参考にします。':'今は通信できません。次にゲームを開いた時に自動で送ります。'));const actions=el('div','done-actions');actions.append(button('続けて書く',()=>{completion=null;render();}),button('メニューへ戻る',()=>global.show('moreMenu')));panel.append(actions);host.append(panel);}
  else{
   const form=el('form','panel');form.id='fbform';form.noValidate=true;
   form.append(el('div','lbl','種類'));
   const kinds=el('div','kinds');kinds.setAttribute('role','group');kinds.setAttribute('aria-label','意見の種類');
   for(const [k,v] of Object.entries(KINDS)){const b=button('',()=>{draft.kind=k;for(const x of kinds.children)x.setAttribute('aria-pressed',x===b?'true':'false');form.querySelector('textarea').placeholder=v.ph;refresh();},'kind');b.dataset.k=k;b.setAttribute('aria-pressed',String(draft.kind===k));b.append(el('span','ki',v.ic),el('b','',v.nm),el('small','',v.ds));kinds.append(b);}form.append(kinds);
   const label=el('label','lbl','どの画面のこと？');label.htmlFor='fb-screen';const select=el('select');select.id='fb-screen';for(const [id,name] of Object.entries(SCREENS)){const option=el('option','',name);option.value=id;select.append(option);}select.value=draft.screen;select.onchange=()=>{draft.screen=select.value;};form.append(label,select);
   const bodyLabel=el('label','lbl','内容');bodyLabel.htmlFor='fb-body';const count=el('small','count');count.id='fb-count';bodyLabel.append(count);const body=el('textarea');body.id='fb-body';body.maxLength=1200;body.placeholder=KINDS[draft.kind]?.ph||'先に種類を選んでください';body.value=draft.body;body.oninput=()=>{draft.body=body.value;refresh();};form.append(bodyLabel,body,el('p','hint','名前・連絡先・SNSのIDなど、個人が分かることは書かないでください。'));
   const c=context(),attach=el('details','attach'),info=el('dl','info');attach.append(el('summary','','一緒に送られる情報'));
   for(const [label,value] of [['バージョン',c.version],['端末',deviceLabel(c.device)],['直前の画面',SCREENS[classify(contextScreen)]],['進み具合',c.progress],['プロフィール名',c.profileName]])info.append(el('dt','',label),el('dd','',value));attach.append(info,el('p','hint','セーブデータそのものは送りません。'));form.append(attach);
   if(error){const e=el('p','err',error);e.setAttribute('role','alert');form.append(e);}const send=el('button','send','送る');send.type='submit';send.id='fb-send';form.append(send,el('p','quota'));form.onsubmit=e=>{e.preventDefault();void submit();};host.append(form);
  }
  const hist=el('section','panel hist');hist.append(el('h2','','送った意見'));if(!s.history.length)hist.append(el('p','empty','まだ送った意見はありません。'));
  for(const h of s.history){const row=el('div','hist-item'),meta=el('div','meta');meta.append(chip(h.kind),el('span','',stamp(h.createdAt)),el('span','chip '+(h.state==='sent'?'sent':'wait'),h.state==='sent'?'届きました':'送信待ち'));row.append(meta,el('p','',h.body));hist.append(row);}host.append(hist);refresh();
 }
 async function transmit(p,item){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  try{const response=await fetch(ENDPOINT,{method:'POST',mode:'cors',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item.payload,token:p.token}),signal:controller.signal});
   if(response.ok){let result;try{result=await response.json();}catch(_){return {state:'wait'};}return result.accepted===1?{state:'sent',day:result.day,remaining:result.remaining}:{state:'wait'};}
   if(response.status===429){let result={};try{result=await response.json();}catch(_){}return {state:'wait',limited:true,notBefore:typeof result.retryAt==='string'&&Number.isFinite(Date.parse(result.retryAt))?result.retryAt:nextDay()};}
   if([400,401,403,413].includes(response.status))return {state:'rejected',error:response.status===401?'プロフィールの認証を確認できませんでした。':'送れませんでした。内容と通信先を確認してください。'};
   return {state:'wait'};
  }catch(_){return {state:'wait'};}finally{clearTimeout(timer);}
 }
 function applyResult(id,item,result){
  const s=read(id),h=s.history.find(x=>x.id===item.payload.id),q=s.queue.find(x=>x.payload.id===item.payload.id);
  if(result.state==='sent'){if(result.day===day()&&Number.isInteger(result.remaining)&&result.remaining>=0&&result.remaining<=5)s.quota={day:day(),count:Math.max(s.quota.day===day()?s.quota.count:0,5-result.remaining)};if(h)h.state='sent';s.queue=s.queue.filter(x=>x.payload.id!==item.payload.id);}
  else if(result.state==='rejected'){s.history=s.history.filter(x=>x.id!==item.payload.id);s.queue=s.queue.filter(x=>x.payload.id!==item.payload.id);if(s.quota.day===day(item.reservedAt))s.quota.count=Math.max(0,s.quota.count-1);}
  else if(result.notBefore){if(q)q.notBefore=result.notBefore;s.blockedUntil=result.notBefore;}
  write(id,s);
 }
 async function flush(){
  const p=profile();if(!p||global.MonsterProfiles?.available?.()===false)return;
  try{await scopedLock(p.id,async()=>{const s=read(p.id);for(const item of s.queue.slice(0,20)){if(item.notBefore&&Date.parse(item.notBefore)>Date.now())continue;const result=await transmit(p,item);if(result.state!=='rejected')applyResult(p.id,item,result);if(result.error){error=result.error;break;}if(result.state==='wait')break;}});if(root()?.classList.contains('active')&&!sending){render();}}catch(_){/* Storage/network failures never block game startup. */}
 }
 async function submit(){
  if(sending||!draft.kind||draft.body.trim().length<2||draft.body.length>1000)return;
  const p=profile();if(!p)return;let staged=false;sending=true;error='';refresh();
  try{await scopedLock(p.id,async()=>{
   const s=read(p.id);if(!remaining(s))throw Error('今日はもう送れません');if(s.queue.length>=20)throw Error('送信待ちがいっぱいです。通信を確認してから、もう一度お試しください。');
   const at=Date.now(),payload={id:crypto.randomUUID(),profileId:p.id,...context(),kind:draft.kind,screen:draft.screen,body:draft.body.trim(),createdAt:new Date(at).toISOString()};
   const item={payload,reservedAt:at};s.queue.push(item);s.history.unshift({...payload,state:'wait'});s.history=s.history.slice(0,20);s.quota={day:day(),count:(s.quota.day===day()?s.quota.count:0)+1};write(p.id,s);staged=true;
   const result=await transmit(p,item);
   if(result.limited){applyResult(p.id,item,{state:'rejected'});staged=false;const current=read(p.id);current.blockedUntil=result.notBefore;write(p.id,current);throw Error('今日はもう送れません');}
   applyResult(p.id,item,result);if(result.error){staged=false;throw Error(result.error);}
   completion=result.state;draft={kind:null,screen:classify(contextScreen),body:''};
  });}catch(e){if(staged){completion='wait';draft={kind:null,screen:classify(contextScreen),body:''};}else error=e.message||'控えを保存できませんでした。もう一度お試しください。';}finally{sending=false;render();}
 }
 global.MonsterFeedback={
  screenChanged(id,previous){if(id==='feedbackBox'){contextScreen=previous==='moreMenu'?lastScreen:previous||lastScreen;draft.screen=classify(contextScreen);completion=null;error='';try{localStorage.setItem('mb_feedback_seen_v1','1');}catch(_){}badge();render();void flush();}else if(id!=='moreMenu'){lastScreen=id;}},
  start(){if(started)return;started=true;badge();void flush();global.addEventListener('online',()=>void flush());global.addEventListener('storage',event=>{if(event.key===key(profile()?.id)&&root()?.classList.contains('active')&&!sending)render();});},
  flush
 };
})(globalThis);
