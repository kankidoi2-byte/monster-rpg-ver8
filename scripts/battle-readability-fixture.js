/* Only loaded by the opt-in QA page, never by the game entry point. */
if(window.parent!==window){
  saveGame=()=>true;startTutorialFeatureGuide=()=>false;
  function qaSetup(multi=false){
    save=initSave();save.tutorial=tutorialSaveDefaults({legacy:true});
    save.tutorial.guides=Object.fromEntries(TUTORIAL_GUIDE_IDS.map(id=>[id,true]));
    save.instances=[];save.party=[];
    for(const id of ['freigal','aquaron','grassbeat'])save.party.push(addInstance(id,10).uid);
    save.items.potion=5;tutorialUiState.active=false;tutorialBattleSession.active=false;
    document.getElementById('titleScreen').classList.add('hidden');
    document.body.classList.remove('title-mode');
    prepareBattleParty();const request=createHuntRequest(MAPS[0],by('slime'),'normal',[]);
    request.battleMode=multi?'three_way':'single';if(multi)request.secondEnemyId='goblin';
    beginChosenBattle(MAPS[0].id,'slime','normal',request);
    eHp=enemyMaxHp();update();window.scrollTo(0,0);
  }
  function qaBounds(){
    const ids=['pHpText',multiBattle?.active?'#enemy_aCard .battle-hp-line':'eHpText','battleSkillButton'];
    const pad=document.querySelector('.battle-command-pad'),dock=document.querySelector('.battle-command-dock');
    const buttons=[...pad.querySelectorAll('button')].map(e=>{const r=e.getBoundingClientRect();return `${e.innerText.replace(/\s+/g,' ')}: ${Math.round(r.width)}×${Math.round(r.height)}`;}).join(', ');
    const dr=dock.getBoundingClientRect(),hr=document.getElementById('pHpText').getBoundingClientRect();
    const summary=`コマンド下端 ${Math.round(pad.getBoundingClientRect().bottom)} / HP遮蔽 ${dr.left<hr.right&&dr.right>hr.left&&dr.top<hr.bottom&&dr.bottom>hr.top} / 横溢れ ${document.documentElement.scrollWidth>innerWidth}\n${buttons}\n`; 
    return summary+ids.map(id=>{const r=(id.startsWith('#')?document.querySelector(id):document.getElementById(id)).getBoundingClientRect();return `${id}: ${Math.round(r.top)}–${Math.round(r.bottom)} / 高さ${innerHeight}`;}).join('\n');
  }
  function qaReport(text){parent.postMessage({battleQAReport:text},parent.location.origin);}
  async function qaAction(effect){
    if(busy)return;
    busy=true;beginBattleAction(player,[effect],true);refreshBattleFeedback();
    await doAttack(player,enemy,[effect,effect==='heal'?0:12,'normal',effect,1],true);
    busy=false;refreshBattleFeedback();
  }
  async function qaSuite(){
    const checks=[];const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push('PASS '+label);};
    qaSetup();pHp=playerMaxHp()-3;update();await qaAction('heal');
    assert(pHp===playerMaxHp()&&battleFeedback.history.some(e=>/回復 \+3/.test(e.text)),'回復上限・実回復量');
    qaSetup();await qaAction('repeat_attack');
    assert(battleFeedback.history.some(e=>/追加攻撃/.test(e.text)),'2発目の独立表示');
    const hpEntries=battleFeedback.history.filter(e=>e.kind==='hp'&&e.text.startsWith(enemy.name));
    assert(hpEntries.length===2,'1発目・2発目のHP記録');
    qaSetup();pStatus='poison';pPoisonTurns=1;pHp=2;update();applyPoisonEndTurn();
    assert(pHp===0&&pStatus===null&&battleFeedback.history.some(e=>/毒 −2/.test(e.text)),'毒・実損失・解除');
    qaSetup();pHp=playerMaxHp()-50;update();await qaAction('drain');assert(battleFeedback.history.some(e=>/吸収 \+/.test(e.text)),'吸収');
    qaSetup();await qaAction('recoil');assert(battleFeedback.history.some(e=>/反動 −8/.test(e.text)),'反動');
    qaSetup();pSleepTurns=1;busy=true;await performAction(player,enemy,['通常攻撃',24,'normal'],true);assert(pSleepTurns===0&&battleFeedback.history.some(e=>/動けない/.test(e.text)),'行動不能・解除');busy=false;
    qaSetup(true);const visual=document.getElementById('enemy_aVis'),bar=document.querySelector('#enemy_aCard .hp');
    multiBattle.enemies[0].hp-=1;updateMultiBattleView();assert(document.getElementById('enemy_aVis')===visual&&document.querySelector('#enemy_aCard .hp')===bar,'複数陣営の画像・HPバー保持');
    busy=true;beginBattleAction(player,['回復'],true);pHp=playerMaxHp()-2;update();await performMultiAttack({kind:'player'},multiBattle.enemies[0],['回復',0,'normal','heal']);assert(pHp===playerMaxHp()&&battleFeedback.history.some(e=>/回復 \+2/.test(e.text)),'三つ巴の実回復量');busy=false;
    qaSetup();activateKokoroLinkFromBattle(save.party[1]);update();const before=pHp;busy=true;beginBattleAction(enemy,['障壁検証'],false);await doAttack(enemy,player,['障壁検証',12,'normal'],false);assert(battleFeedback.history.some(e=>e.kind==='hp'&&/障壁/.test(e.text))&&pHp<=before,'障壁吸収とHP変化');busy=false;
    qaSetup();const firstTurn=turn(-1);turn(-1);await firstTurn;assert(battleTurnCount===1&&battleFeedback.history.filter(e=>e.kind==='action'&&/味方/.test(e.text)).length===1,'連打でターン・味方行動が重複しない');
    qaSetup();eHp=0;update();win();const coins=save.coins;win();assert(save.coins===coins&&document.getElementById('battle').classList.contains('is-finished'),'撃破・終了表示・報酬重複防止');
    qaSetup();for(let i=0;i<300;i++)battleHistoryEntry('検証'+i);assert(battleFeedback.history.length===240&&document.getElementById('battleHistory').children.length===240,'履歴・DOM上限');
    qaSetup();assert(battleFeedback.history.length<10,'次戦で履歴初期化');
    toggleBattleSkillPanel();qaReport(checks.join('\n')+'\n'+qaBounds());
  }
  async function qaMultiSuite(){
    const checks=[];const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push('PASS '+label);};
    const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    qaSetup(true);await wait(950);
    const visual=document.getElementById('enemy_bVis'),image=visual.firstElementChild;
    const bar=document.querySelector('#enemy_bCard .hp'),trail=document.querySelector('#enemy_bCard .hp-trail');
    getComputedStyle(bar).width;
    void bar.offsetWidth;
    playBattleImpact('enemy_bVis',5);multiBattle.enemies[1].hp-=5;updateMultiBattleView();
    assert(visual.classList.contains('battle-hit-impact'),'被弾直後の更新でモーション保持');
    void bar.offsetWidth;void trail.offsetWidth;
    await wait(350);updateMultiBattleView();
    assert(visual.classList.contains('battle-hit-impact')&&visual.firstElementChild===image,'連続更新で画像・被弾クラス保持');
    assert(document.querySelector('#enemy_bCard .hp')===bar&&document.querySelector('#enemy_bCard .hp-trail')===trail,'HP・残像ノード保持');
    if(parseFloat(getComputedStyle(trail).width)>parseFloat(getComputedStyle(bar).width))checks.push('PASS HP減少中に残像が遅れて追従');else checks.push('未確認: このブラウザーではHP残像の中間フレームを観測できません。実機で確認してください。');
    await wait(950);assert(!visual.classList.contains('battle-hit-impact'),'モーションの自然終了');
    qaSetup(true);busy=true;await performMultiAttack(multiBattle.enemies[0],multiBattle.enemies[1],['連撃',12,'normal','repeat_attack',1]);busy=false;
    assert(battleFeedback.history.some(e=>e.kind==='target'&&/敵A.*→ 敵B/.test(e.text)),'敵同士の攻撃者・対象表示');
    assert(battleFeedback.history.filter(e=>e.kind==='hp'&&e.text.startsWith(multiBattle.enemies[1].mon.name)).length===2,'敵同士の追加攻撃2発を記録');
    qaSetup(true);const healer=multiBattle.enemies[0];healer.hp-=3;updateMultiBattleView();busy=true;await performMultiAttack(healer,healer,['回復',0,'normal','heal']);busy=false;
    assert(healer.hp===healer.maxHp&&battleFeedback.history.some(e=>/回復 \+3/.test(e.text)),'敵の上限回復');
    qaSetup(true);pGuard=true;pAquaShield=true;activateKokoroLinkFromBattle(save.party[1]);updateMultiBattleView();busy=true;await performMultiAttack(multiBattle.enemies[0],{kind:'player'},['攻撃',12,'normal']);busy=false;
    assert(battleFeedback.history.some(e=>e.kind==='hp'&&/防御.*水の盾.*障壁/.test(e.text))&&!pGuard&&!pAquaShield,'防御・盾・障壁の表示と消費');
    qaSetup(true);const poisoned=multiBattle.enemies[0];poisoned.status='poison';poisoned.poisonTurns=1;poisoned.poisonSourceIsPlayer=true;poisoned.hp=1;updateMultiBattleView();finishMultiBattleTurn();
    assert(!poisoned.alive&&poisoned.defeatedByPlayer&&battleFeedback.history.some(e=>/毒 −1/.test(e.text)),'毒撃破・実損失・契約帰属');
    chooseMultiBattleTarget(-1);assert(!document.getElementById('enemy_aCard').classList.contains('is-targetable')&&document.getElementById('enemy_bCard').classList.contains('is-targetable'),'撃破済みを対象から除外');
    assert(resolveLivingMultiTargetId(multiBattle.enemies,'enemy_a')==='enemy_b','行動前に対象が倒れた場合の再選択');cancelMultiBattleTarget();
    qaSetup();pHp-=7;eHp-=9;eStatus='poison';ePoisonTurns=2;eGuard=true;pSleepTurns=1;eAtk=.8;eAquaShield=true;battleTurnCount=2;update();
    const before=JSON.stringify([pHp,eHp,enemyMaxHp(),pSleepTurns,ePoisonTurns,eGuard,eAtk,eAquaShield,battleTurnCount]);
    const history=battleFeedback.history.map(e=>e.text);activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionEnemyId='goblin';activeHuntRequest.invasionTurn=2;
    assert(triggerInvasionIfDue(),'通常戦から乱入を再現');const existing=multiBattle.enemies[0];
    assert(before===JSON.stringify([pHp,existing.hp,existing.maxHp,pSleepTurns,existing.poisonTurns,existing.guard,existing.attack,existing.aquaShield,battleTurnCount]),'乱入時HP・状態・ターン保持');
    assert(history.every((text,i)=>battleFeedback.history[i].text===text)&&!battleFeedback.history.some(e=>e.kind==='hp'&&e.text.startsWith(multiBattle.enemies[1].mon.name)),'乱入前履歴保持・登場を回復と誤認しない');
    assert(!busy&&multiBattle.pendingMoveIndex===null,'乱入後の次ターン入力');
    qaReport(checks.join('\n')+'\n'+qaBounds());
  }
  let qaRunning=false;
  window.addEventListener('message',async e=>{
    if(e.source!==parent||e.origin!==parent.location.origin||!e.data.battleQA)return;
    if(qaRunning||busy)return;
    qaRunning=true;
    try{
      const test=e.data.battleQA;
      if(test==='multi-suite'){await qaMultiSuite();return;}
      if(test==='suite'){await qaSuite();return;}
      if(test==='bounds'){qaReport(qaBounds());return;}
      qaSetup(test==='multi'||test.startsWith('multi-')||test==='enemy-repeat');
      if(test==='enemy-repeat'){busy=true;await performMultiAttack(multiBattle.enemies[0],multiBattle.enemies[1],['連撃',12,'normal','repeat_attack',1]);busy=false;refreshBattleFeedback();}
      else if(test==='multi-heal'){const actor=multiBattle.enemies[0];actor.hp-=3;updateMultiBattleView();busy=true;await performMultiAttack(actor,actor,['回復',0,'normal','heal']);busy=false;refreshBattleFeedback();}
      else if(test==='multi-poison'){for(const actor of multiBattle.enemies){actor.status='poison';actor.poisonTurns=2;}updateMultiBattleView();finishMultiBattleTurn();}
      if(test==='status'){pStatus='poison';pPoisonTurns=3;pParalysisTurns=2;pGuard=true;pAquaShield=true;activateKokoroLinkFromBattle(save.party[1]);update();}
      else if(test==='poison'){pStatus='poison';pPoisonTurns=2;update();applyPoisonEndTurn();}
      else if(test==='sleep'){pSleepTurns=1;await performAction(player,enemy,['通常攻撃',24,'normal'],true);}
      else if(['repeat','heal','drain','recoil'].includes(test)){pHp=playerMaxHp()-3;update();await qaAction(test==='repeat'?'repeat_attack':test);}
      else {
        if(test==='invasion'){
          activeHuntRequest.battleMode='invasion_pending';activeHuntRequest.invasionEnemyId='goblin';activeHuntRequest.invasionTurn=0;
          if(!triggerInvasionIfDue())throw Error('乱入への移行失敗');
        }
        toggleBattleSkillPanel();
      }
      qaReport(qaBounds());
    }catch(error){qaReport('FAIL '+error.stack);}finally{qaRunning=false;}
  });
  qaSetup();toggleBattleSkillPanel();qaReport(qaBounds());
}
