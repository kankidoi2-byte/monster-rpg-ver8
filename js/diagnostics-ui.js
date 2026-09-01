(function(root){
  'use strict';

  function element(tag,className,text){
    const node=root.document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=String(text);
    return node;
  }

  function count(value){
    const number=Number(value);
    return Number.isFinite(number)&&number>0?Math.floor(number):0;
  }

  function availability(value){return value===true?'取得済み':'未取得';}
  function yesNo(value){return value===true?'はい':'いいえ';}
  function fixedToken(value,fallback='不明'){
    const token=String(value||'');
    return /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(token)?token:fallback;
  }

  function addCard(grid,title,rows){
    const card=element('section','diagnostics-card');
    card.append(element('h2','',title));
    const list=element('dl','diagnostics-stats');
    rows.forEach(([label,value])=>{
      const row=element('div');
      row.append(element('dt','',label),element('dd','',value));
      list.append(row);
    });
    card.append(list);
    grid.append(card);
    return card;
  }

  function saveIssueCount(saveSummary){
    const monsters=saveSummary?.monsters||{};
    const party=saveSummary?.party||{};
    const quarantine=saveSummary?.quarantine||{};
    return [
      monsters.missingUidCount,monsters.duplicateUidCount,monsters.invalidInstanceCount,
      party.missingReferenceCount,quarantine.unknownInstanceCount,
      quarantine.unknownCaughtIdCount,quarantine.invalidExpeditionCount
    ].reduce((sum,value)=>sum+count(value),0);
  }

  function renderErrors(grid,errorSummary){
    const card=element('section','diagnostics-card diagnostics-error-card');
    card.append(element('h2','',`JavaScriptエラー（${count(errorSummary?.count)}件）`));
    const errors=Array.isArray(errorSummary?.items)?errorSummary.items.slice(-20):[];
    if(!errors.length){
      card.append(element('p','diagnostics-empty','記録されたエラーはありません。'));
    }else{
      const list=element('div','diagnostics-error-list');
      errors.forEach(error=>{
        const item=element('article','diagnostics-error-entry');
        const heading=element('strong','',String(error?.name||'Error'));
        const message=element('p','',String(error?.message||'Unknown error'));
        const source=String(error?.source||'');
        const location=source?`${source}${error?.line!==null&&error?.line!==undefined?`:${error.line}`:''}`:'発生場所なし';
        item.append(heading,message,element('small','',`${location}・${Math.max(1,count(error?.count))}回`));
        list.append(item);
      });
      card.append(list);
    }
    grid.append(card);
  }


  function setActionStatus(message,state){
    const status=root.document?.getElementById?.('diagnosticsActionStatus');
    if(!status)return;
    status.textContent=String(message||'');
    status.dataset.state=state||'info';
  }

  function getDiagnosticExport(){
    const api=root.GameDiagnostics;
    if(!api||typeof api.getDiagnosticReport!=='function'||typeof api.formatDiagnosticSummary!=='function'){
      throw new Error('diagnostics_unavailable');
    }
    const report=api.getDiagnosticReport();
    return {
      report,
      summary:api.formatDiagnosticSummary(report),
      json:`${JSON.stringify(report,null,2)}\n`
    };
  }

  function diagnosticFilename(report){
    const stamp=String(report?.generatedAt||new Date().toISOString()).replace(/\D/g,'').slice(0,14)||'latest';
    return `monster-rpg-diagnostics-${stamp}.json`;
  }

  async function copyDiagnosticSummary(){
    try{
      const clipboard=root.navigator?.clipboard;
      if(!clipboard||typeof clipboard.writeText!=='function')throw new Error('clipboard_unavailable');
      const payload=getDiagnosticExport();
      await clipboard.writeText(payload.summary);
      setActionStatus('診断要約をクリップボードへコピーしました。','success');
      return true;
    }catch(error){
      setActionStatus('コピーできませんでした。ブラウザの権限設定をご確認ください。','error');
      return false;
    }
  }

  function saveDiagnosticJson(){
    try{
      const payload=getDiagnosticExport();
      const blob=new root.Blob([payload.json],{type:'application/json;charset=utf-8'});
      const objectUrl=root.URL.createObjectURL(blob);
      const link=root.document.createElement('a');
      link.href=objectUrl;
      link.download=diagnosticFilename(payload.report);
      link.hidden=true;
      root.document.body.append(link);
      link.click();
      link.remove();
      root.setTimeout(()=>root.URL.revokeObjectURL(objectUrl),0);
      setActionStatus('診断JSONの保存を開始しました。','success');
      return true;
    }catch(error){
      setActionStatus('診断JSONを保存できませんでした。','error');
      return false;
    }
  }

  async function shareDiagnosticSummary(){
    try{
      const share=root.navigator?.share;
      if(typeof share!=='function')throw new Error('share_unavailable');
      const payload=getDiagnosticExport();
      await share.call(root.navigator,{
        title:'モンスターバトル 診断要約',
        text:payload.summary
      });
      setActionStatus('共有操作が完了しました。','success');
      return true;
    }catch(error){
      if(error?.name==='AbortError'){
        setActionStatus('共有をキャンセルしました。','info');
        return false;
      }
      setActionStatus('この端末では共有画面を開けませんでした。','error');
      return false;
    }
  }

  function updateExportAvailability(){
    const shareButton=root.document?.getElementById?.('diagnosticsShareButton');
    if(!shareButton)return;
    const available=typeof root.navigator?.share==='function';
    shareButton.disabled=!available;
    shareButton.title=available?'OSの共有画面を開きます':'このブラウザは共有に対応していません';
  }

  function renderDiagnosticsScreen(){
    const container=root.document?.getElementById?.('diagnosticsContent');
    if(!container)return false;
    container.replaceChildren();
    setActionStatus('','info');
    updateExportAvailability();
    const api=root.GameDiagnostics;
    if(!api||typeof api.getDiagnosticReport!=='function'||typeof api.formatDiagnosticSummary!=='function'){
      const unavailable=element('div','diagnostics-unavailable');
      unavailable.append(element('h2','','診断機能を読み込めませんでした'),element('p','','画面を再読み込みして、もう一度お試しください。'));
      container.append(unavailable);
      return false;
    }

    const report=api.getDiagnosticReport();
    const health=report?.health||{};
    const status=['ok','warning','error'].includes(health.status)?health.status:'warning';
    const statusLabel={ok:'正常',warning:'要確認',error:'エラーあり'}[status];
    const hero=element('section',`diagnostics-hero is-${status}`);
    const heroCopy=element('div');
    heroCopy.append(
      element('span','diagnostics-kicker','CURRENT STATUS'),
      element('h2','',statusLabel),
      element('p','',`検出事項 ${count(health.issueCount)}件・JavaScriptエラー ${count(health.errorCount)}件`)
    );
    hero.append(element('div','diagnostics-status-icon',status==='ok'?'✓':status==='warning'?'!':'×'),heroCopy);

    const summary=element('pre','diagnostics-summary');
    summary.textContent=api.formatDiagnosticSummary(report);
    const privacy=element('p','diagnostics-privacy','この画面の情報は端末内で生成され、外部へ自動送信されません。');
    const grid=element('div','diagnostics-grid');

    const environment=report?.environment||{};
    const runtime=environment.runtime||{};
    const viewport=environment.viewport||{};
    addCard(grid,'実行環境',[
      ['ブラウザ / OS',`${fixedToken(runtime.browser,'Other')} / ${fixedToken(runtime.os,'Other')}`],
      ['端末区分',fixedToken(runtime.deviceClass)],
      ['表示領域',`${viewport.width??'–'} × ${viewport.height??'–'}`],
      ['オンライン',runtime.online===null||runtime.online===undefined?'不明':yesNo(runtime.online)]
    ]);

    const save=report?.save||{};
    addCard(grid,'セーブ要約',[
      ['状態',availability(save.available)],
      ['所持 / パーティー',`${count(save.monsters?.instanceCount)}体 / ${count(save.party?.memberCount)}体`],
      ['コイン',count(save.economy?.coins).toLocaleString('ja-JP')],
      ['整合性の検出',`${saveIssueCount(save)}件`]
    ]);

    const tutorial=report?.tutorial||{};
    addCard(grid,'チュートリアル',[
      ['状態',tutorial.available===true?fixedToken(tutorial.state?.status):'未取得'],
      ['進行',tutorial.state?.stepIndex===null||tutorial.state?.stepIndex===undefined?'不明':`${count(tutorial.state.stepIndex)+1} / ${count(tutorial.state?.stepCount)}`],
      ['待機操作',fixedToken(tutorial.waiting?.mode,'なし')],
      ['検出事項',`${count(tutorial.issues?.length)}件`]
    ]);

    const alchemy=report?.alchemy||{};
    addCard(grid,'錬成',[
      ['段階',alchemy.available===true?fixedToken(alchemy.state?.stage):'未取得'],
      ['結果',fixedToken(alchemy.state?.resultKind,'なし')],
      ['実行可能',yesNo(alchemy.selection?.canExecute)],
      ['検出事項',`${count(alchemy.issues?.length)}件`]
    ]);

    const expedition=report?.expedition||{};
    addCard(grid,'遠征',[
      ['使用枠',`${count(expedition.state?.usedSlotCount)} / ${count(expedition.state?.unlockedSlotCount)}`],
      ['進行中 / 受取可能',`${count(expedition.state?.inProgressCount)} / ${count(expedition.state?.readyToClaimCount)}`],
      ['派遣可能',yesNo(expedition.selection?.canDispatch)],
      ['派遣不能理由 / 検出事項',`${count(expedition.selection?.blockingReasons?.length)} / ${count(expedition.issues?.length)}件`]
    ]);
    renderErrors(grid,report?.errors||{});

    container.append(hero,summary,privacy,grid);
    return true;
  }

  function showDiagnosticsScreen(){
    if(typeof root.show==='function')root.show('diagnosticsScreen');
    renderDiagnosticsScreen();
  }

  root.copyDiagnosticSummary=copyDiagnosticSummary;
  root.saveDiagnosticJson=saveDiagnosticJson;
  root.shareDiagnosticSummary=shareDiagnosticSummary;
  root.renderDiagnosticsScreen=renderDiagnosticsScreen;
  root.refreshDiagnosticsScreen=renderDiagnosticsScreen;
  root.showDiagnosticsScreen=showDiagnosticsScreen;
})(typeof window!=='undefined'?window:globalThis);
