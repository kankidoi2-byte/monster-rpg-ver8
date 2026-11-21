import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

// Test rendered line boxes as well as button boxes. Content reachable by ordinary
// scrolling is not clipped. Limit checks to the foreground layer at this checkpoint.
function inspectLayout() {
  const visible = el => el.checkVisibility({checkOpacity:true, checkVisibilityCSS:true}) && el.getClientRects().length;
  const modal = ['#titleScreen', 'dialog[open]', '#contractorRankUpOverlay', '#soulContractPresentation', '#prologuePart2Raid', '#tutorialOverlay']
    .map(s => document.querySelector(s)).find(el => el && visible(el));
  const roots = modal ? [modal] : [...document.querySelectorAll('.screen.active,.app-bottom-nav,#uiNotice.is-visible')];
  const target = document.querySelector('.tutorial-target-active');
  if (modal?.id === 'tutorialOverlay' && target) roots.push(target);
  const findings = new Set();
  function check(el, rect, label) {
    if (!rect.width || !rect.height) return;
    for (const [start,end,axis,limit] of [['left','right','X',innerWidth],['top','bottom','Y',innerHeight]]) {
      let scrollable = false;
      for (let p=el; p; p=p.parentElement) {
        const style=getComputedStyle(p);
        const overflow=style['overflow'+axis];
        const size=axis==='X'?'Width':'Height';
        if ((/auto|scroll|overlay/.test(overflow) || p===document.scrollingElement && overflow==='visible') &&
            p['scroll'+size] > p['client'+size]+1) scrollable=true;
        if (style.position==='fixed') break;
      }
      if (scrollable) continue;
      const excess=Math.ceil(Math.max(-rect[start],rect[end]-limit));
      if (excess>2) findings.add(axis+' '+excess+'px · '+label);
    }
  }
  for (const root of roots) {
    for (const button of [root,...root.querySelectorAll('button,[role="button"]')]) {
      if (!button.matches('button,[role="button"]') || !visible(button)) continue;
      check(button,button.getBoundingClientRect(),'ボタン '+(button.innerText || button.ariaLabel || button.id).trim().slice(0,48));
    }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    for (let node; (node=walker.nextNode()); ) {
      const el=node.parentElement, value=node.textContent.trim();
      if (!value || el.closest('script,style,[aria-hidden="true"]') || !visible(el)) continue;
      const range=document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) check(el,r,'文字 '+value.slice(0,48));
    }
  }
  return [...findings];
}

export async function evidence(page, dir) {
  await fs.mkdir(path.join(dir,'shots'),{recursive:true});
  const scenes=new Map(), errors=new Map(), overflow=[], episodes=new Map();
  let stage='起動', failure='', action='', totals='';
  const missingBackgrounds=new Map();
  let backgroundConsoleErrors=0;
  const legacyBackground=/\/css\/images\/maps\//;
  page.on('response',r=>{
    const url=new URL(r.url());
    if(r.status()===404&&legacyBackground.test(url.pathname))missingBackgrounds.set(url.pathname,(missingBackgrounds.get(url.pathname)||0)+1);
  });
  function error(kind,message) {
    const key=[stage,kind,message].join(' · ');
    errors.set(key,(errors.get(key)||0)+1);
  }
  page.on('console',msg=>{
    if(msg.type()==='error'&&legacyBackground.test(msg.location().url||''))backgroundConsoleErrors++;
    if(msg.type()==='error') error('console.error',msg.text()+' '+(msg.location().url||'').replace(page.url().split('/').slice(0,3).join('/'),''));
  });
  page.on('pageerror',err=>error('pageerror',err.message));
  async function shot(key,label=key) {
    if(scenes.has(key)) return scenes.get(key);
    stage=label;
    const file='shots/'+String(scenes.size+1).padStart(3,'0')+'-'+key.replace(/[^a-zA-Z0-9_-]/g,'_')+'.jpg';
    await page.screenshot({path:path.join(dir,file),type:'jpeg',quality:65,scale:'css',timeout:10000});
    scenes.set(key,file);
    for(const issue of await page.evaluate(inspectLayout)) overflow.push({label,file,issue});
    return file;
  }
  const link=(file,label)=>file?'['+label+']('+file+')':'未到達';
  return {shot,episodes, get stage(){return stage;},
    assertRegressions(){
      assert.equal(backgroundConsoleErrors,0,'no console errors from old CSS-relative battle paths');
      assert.equal(missingBackgrounds.size,0,JSON.stringify([...missingBackgrounds]));
      assert.equal(overflow.filter(f=>f.issue.includes('ボタン ▼')).length,0,'no clipped advance buttons at the existing 2px limit');
    },
    action(value){action=value;}, totals(value){totals=value;},
    async fail(err){
      failure=String(err.message || err);
      await shot('stopped',stage+'（停止）').catch(()=>{});
    },
    async report(version){
      const text=['# 序章のスマホ通しテスト','', 'Chromium '+version+' / Android エミュレーション / 412 × 915 CSS px / 新規ブラウザーコンテキスト。','## 実行結果','',
        failure?'**停止** '+failure:'**終幕完了**', totals, '',
        '## 進行停止','',failure?'直近の操作：'+action+'。 '+link(scenes.get('stopped'),'停止画面'):'なし',
        '', '## コンソールエラーと未処理例外','',
        ...(errors.size?[...errors].map(([k,n])=>'- '+k+'（'+n+'回）'):['なし']),
        '', '## 戦闘背景の旧URLと会話送り（回帰確認）','',
        '- /css/images/maps/ のコンソールエラー：'+backgroundConsoleErrors+'件（旧記録2,732件）。',
        '- 同パスのHTTP 404応答：'+[...missingBackgrounds.values()].reduce((a,b)=>a+b,0)+'件（旧記録のHTTP応答数は未計測）。',
        ...[...missingBackgrounds].map(([url,n])=>'- '+url+'：'+n+'件'),
        '- 撮影時に下端から出る「▼」：'+overflow.filter(f=>f.issue.includes('ボタン ▼')).length+'件（旧記録8件、閾値2 CSS px超は変更なし）。',
        '', '## 画面外にはみ出したボタン・文字','',
        '各画像の撮影時に、表示中の画面（ガイドやモーダル表示中はその前面）でボタンと文字の矩形を測定。上下左右の2 CSS px超を記録し、その方向にスクロールできる内容は除外。重なり・画面内クリッピング・撮影間のアニメーションは判定対象外。','',
        ...(overflow.length?overflow.map(f=>'- '+link(f.file,f.label)+' · '+f.issue.replaceAll('\n',' ')):['検出なし']),
        '', '## 各話の到達状況','','| 話 | 開始 | 終了確認 |','| --- | --- | --- |',
        ...Array.from({length:23},(_,i)=>{const ep=episodes.get(i+1)||{};return '| '+(i===22?'終幕':'第'+(i+1)+'話')+' | '+link(ep.start,'開始')+' | '+link(ep.end,'終了')+' |';}),
        '', '## 場面別スクリーンショット','',...[...scenes].map(([key,file])=>'- '+link(file,key))];
      await fs.writeFile(path.join(dir,'report.md'),text.join('\n')+'\n');
      console.log('画像',scenes.size,'枚 / エラー',errors.size,'種類 / 画面外',overflow.length,'件');
      console.log(text.slice(0,text.indexOf('## 各話の到達状況')).join('\n').slice(0,16000));
    }};
}
