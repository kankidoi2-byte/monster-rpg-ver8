/* Opt-in isolated QA entry; never loaded from the normal game entry. */
if(window.parent!==window){
  saveGame=()=>true;startTutorialFeatureGuide=()=>false;
  const originalNames=new Map(M.map(mon=>[mon.id,mon.name]));
  const frame=()=>new Promise(resolve=>setTimeout(resolve,400));
  const report=text=>parent.document.querySelector('#report').textContent=text;
  function setup(kind='normal'){
    clearTutorialUi();M.forEach(mon=>mon.name=originalNames.get(mon.id));
    save=initSave();save.tutorial=tutorialSaveDefaults({legacy:true});
    save.instances=[];save.party=[];
    const ins=addInstance(kind==='tutorial'?'elna_beginner':'freigal',1);save.party=[ins.uid];
    save.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,10]));
    const mon=by(ins.id),allowed=MOVE_CARDS.filter(sk=>isSkillAllowedForMonster(sk.id,mon));
    const cheap=allowed.find(sk=>sk.cost===1),limit=skillCostLimitFor(mon,ins);
    save.equippedSkills[ins.uid]=[cheap.id];
    if(kind==='full'||kind==='tutorial')save.equippedSkills[ins.uid]=[cheap.id,cheap.id,cheap.id];
    if(kind==='exact'||kind==='short'){
      const pair=allowed.flatMap(a=>allowed.map(b=>[a,b])).find(([a,b])=>a.cost+b.cost===limit-(kind==='short'?1:0));
      if(!pair)throw Error('境界条件のカード不足');save.equippedSkills[ins.uid]=pair.map(sk=>sk.id);
    }
    if(kind==='long')mon.name='天衣神龍 アメヴァルナ・天空を巡る白金の守護者';
    document.getElementById('titleScreen').classList.add('hidden');document.body.classList.remove('title-mode');
    editingSkillUid=ins.uid;resetSkillFilters();openSkillEdit(ins.uid);window.scrollTo(0,0);
    if(kind==='empty'){document.getElementById('skillSearchInput').value='存在しない技999';renderSkillEdit();}
    if(kind==='tutorial')startTutorialFlow(TUTORIAL_MAIN_FLOW_ID,{stepId:'stella_skill_unequip',persist:false});
    return {ins,mon,cheap,allowed,limit};
  }
  async function suite(){
    const results=[];const check=(ok,label)=>{if(!ok)throw Error(label);results.push('PASS '+label);report(results.join('\n'));};
    let state=setup('full');check(document.querySelector('.skill-edit-numbers').textContent.includes('3 / 3'),'技枠3/3');
    check(document.getElementById('skillCardList').textContent.includes('技枠満杯'),'満杯の理由');
    state=setup('exact');check(equippedSkillCost(state.ins)===state.limit,'コスト上限ちょうど');
    check(document.querySelector('.skill-edit-numbers>span:nth-child(2) strong').textContent==='0','残り0');
    state=setup('short');const costly=state.allowed.find(sk=>sk.cost>1);
    check(document.querySelector(`[data-skill-card-id="${costly.id}"]`).textContent.includes(`あと${costly.cost-1}必要`),'不足コストの正確な差額');
    state=setup();await frame();
    const filter=document.querySelector('.skill-filter-panel');filter.open=true;
    document.getElementById('skillTypeFilter').value='fire';renderSkillEdit();
    const card=document.querySelector(`[data-skill-card-id="${state.cheap.id}"]`);card.scrollIntoView({block:'start'});window.scrollBy(0,-180);await frame();
    const before=card.getBoundingClientRect().top;
    check(equipSkill(state.cheap.id)===true,'装備');await frame();
    check(Math.abs(document.querySelector(`[data-skill-card-id="${state.cheap.id}"]`).getBoundingClientRect().top-before)<2,'装備後の一覧位置保持');
    check(document.getElementById('skillTypeFilter').value==='fire'&&filter.open,'絞り込み・開閉維持');
    check(unequipSkill(1)===true,'解除');await frame();
    check(Math.abs(document.querySelector(`[data-skill-card-id="${state.cheap.id}"]`).getBoundingClientRect().top-before)<2,'解除後の一覧位置保持');
    check(document.querySelector('.skill-edit-numbers>span:nth-child(3) strong').textContent==='1 / 3','解除後即時更新');
    const summary=document.getElementById('skillEditTarget').getBoundingClientRect(),header=document.querySelector('.app-topbar').getBoundingClientRect();
    check(summary.top>=header.bottom-1&&summary.bottom<innerHeight-78,'追従表示・上下ナビ非重複');
    const old=[...save.equippedSkills[state.ins.uid]];saveGame=()=>false;check(equipSkill(state.cheap.id)===false&&JSON.stringify(old)===JSON.stringify(save.equippedSkills[state.ins.uid]),'保存失敗のロールバック');saveGame=()=>true;
    state=setup();
    save.skillCards[state.cheap.id]=1;renderSkillEdit();
    check(document.querySelector(`[data-skill-card-id="${state.cheap.id}"]`).textContent.includes('全て使用中'),'所持枚数不足の理由');
    const search=document.getElementById('skillSearchInput');search.value=state.cheap.name;
    document.getElementById('skillCostFilter').value='1';document.getElementById('skillEquipableOnly').checked=true;renderSkillEdit();
    check(!document.querySelector('#skillCardList [data-skill-card-id]'),'装備可能のみが使用中カードを除外');
    check(search.value===state.cheap.name&&document.getElementById('skillCostFilter').value==='1','検索とコスト条件保持');
    state=setup('empty');check(document.getElementById('skillCardList').textContent.includes('条件に合う技カードがありません'),'検索結果なし');
    state=setup('long');await frame();check(document.documentElement.scrollWidth<=innerWidth,'長名・横溢れなし');
    state=setup('tutorial');await frame();await frame();
    positionTutorialUi();
    const action=document.querySelector('[data-tutorial-stella-unequip]').getBoundingClientRect();
    const hud=document.getElementById('skillEditTarget').getBoundingClientRect(),bubble=document.getElementById('tutorialBubble').getBoundingClientRect(),nav=document.querySelector('.app-bottom-nav').getBoundingClientRect();
    check(bubble.top>=hud.bottom&&bubble.bottom<=nav.top+1,'チュートリアルと上下バー非重複');
    check(bubble.bottom<=action.top||bubble.top>=action.bottom||bubble.left>=action.right||bubble.right<=action.left,'案内が解除ボタンを隠さない');
    document.querySelector('[data-tutorial-stella-unequip]').click();await frame();await frame();
    check(tutorialCurrentStepId()==='stella_skill_equip','チュートリアル解除から装備へ');
    document.querySelector('[data-tutorial-stella-skill-equip]').click();await frame();await frame();
    check(tutorialCurrentStepId()==='stella_attribute_intro','チュートリアル装備から属性案内へ');
    report(results.join('\n'));return results;
  }
  window.runSkillQA=async kind=>{try{if(kind==='suite')await suite();else{setup(kind);report('確認中：'+kind);}}catch(error){report('FAIL '+error.message);}};
  setup();report('準備完了：装備・解除とスクロールをお試しください。');
}
