import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','0'],{stdio:['ignore','pipe','inherit']});
const evidence=process.env.TYPE_STATUS_CHIP_EVIDENCE;
let browser;
try {
  const [ready]=await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`preview exited (${code})`);})]);
  const address=String(ready).match(/127\.0\.0\.1:\d+/)?.[0];
  assert(address,'loopback preview listening');
  const origin='http://'+address;
  if(evidence)await mkdir(evidence,{recursive:true});
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  for(const viewport of [{width:360,height:800},{width:390,height:844},{width:412,height:915}]){
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
    try {
      await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/?legacy=1');
      await page.locator('#titleScreen').tap();
      await page.locator('#titleScreen').waitFor({state:'detached'});
      const uid=await page.evaluate(()=>{
        clearTutorialUi();show('home');save=initSave();
        save.progress.tutorial=tutorialSaveDefaults({legacy:true});
        Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
        save.contractor.exp=CONTRACTOR_MAX_EXP;save.contractor.pendingRankUps=[];
        save.instances=[];save.party=[];
        for(const id of ['elna_kaen','aquaron','freigal'])save.party.push(addInstance(id,12).uid);
        scheduleContractorRankUpPresentation();
        if(!saveGame())throw Error('fixture save failed');
        return save.party[0];
      });

      for(const multi of [false,true]){
        const labels=await page.evaluate(multi=>{
          endPartyRecovery();prepareBattleParty();
          const map=MAPS.find(m=>m.id==='grassland'),mon=by('icegolem');
          const request=createHuntRequest(map,mon,'normal',[],{allowOvertier:false});
          request.battleMode=multi?'three_way':'single';
          if(multi)request.secondEnemyId='freigal';
          beginChosenBattle(map.id,mon.id,'normal',request);
          pStatus='poison';pPoisonTurns=3;pParalysisTurns=2;pAtk=1.25;
          if(multi){
            Object.assign(multiBattle.enemies[0],{sleepTurns:2,confusionTurns:3});
            Object.assign(multiBattle.enemies[1],{freezeTurns:2,aquaShield:true});
          }else {eSleepTurns=2;eFreezeTurns=2;eAquaShield=true;}
          update();
          return Object.fromEntries([
            ['#singlePlayerBox',player],
            ...(multi?multiBattle.enemies.map(e=>['#'+e.id+'Card .multi-enemy-copy',e.mon]):[['#singleEnemyBox',enemy]])
          ].map(([selector,unit])=>[selector,{name:unit.name,types:unit.types.map(type=>TN[type])}]));
        },multi);
        await page.locator('#battle.active').waitFor();
        for(const [selector,{name,types}] of Object.entries(labels)){
          const hud=page.locator(selector),nameplate=hud.locator('h2'),hp=hud.locator('.battle-hp-line'),typeTags=hud.locator('.br-plate-meta .type-chip'),statusTags=hud.locator('.battle-status .status-chip');
          assert.equal(await nameplate.innerText(),name);
          assert.match(await hp.innerText(),/\d+\s*\/\s*\d+/);
          assert.deepEqual(await typeTags.allTextContents(),types);
          const texts=(await statusTags.allTextContents()).join(' ');
          if(selector==='#singlePlayerBox'){
            assert.match(texts,/毒\s*3/);assert.match(texts,/麻痺\s*2/);assert.match(texts,/攻撃/);
          }else if(selector.includes('enemy_a')){
            assert.match(texts,/ねむり\s*2/);assert.match(texts,/こんらん\s*3/);
          }else if(selector.includes('enemy_b')){
            assert.match(texts,/凍結\s*2/);assert.match(texts,/水の盾/);
          }else{
            assert.match(texts,/ねむり\s*2/);assert.match(texts,/凍結\s*2/);assert.match(texts,/水の盾/);
          }
          const geometry=await hud.evaluate(hud=>{
            const owner=hud.getBoundingClientRect(),title=hud.querySelector('h2').getBoundingClientRect(),hp=hud.querySelector('.battle-hp-line').getBoundingClientRect();
            const intersects=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
            const fits=r=>r.width>0&&r.height>0&&r.left>=Math.max(-1,owner.left-1)&&r.right<=Math.min(innerWidth+1,owner.right+1);
            const tags=[...hud.querySelectorAll('.br-plate-meta .type-chip,.battle-status .status-chip')];
            return {title:fits(title),hp:fits(hp),overlap:intersects(title,hp),bad:tags.filter(tag=>{
              const r=tag.getBoundingClientRect();
              return !fits(r)||intersects(r,title)||intersects(r,hp)||tag.scrollWidth>tag.clientWidth+1;
            }).map(tag=>tag.textContent)};
          });
          assert.deepEqual(geometry,{title:true,hp:true,overlap:false,bad:[]},`${viewport.width}px ${multi?'three-way':'single'} ${name}`);
        }
        if(evidence)await page.screenshot({path:`${evidence}/${multi?'three-way':'single'}-${viewport.width}.png`,animations:'disabled'});
        if(multi){
          // Selecting the alternate live target should still work with its chips in the plate.
          await page.locator('#enemy_bCard .battle-stage-slot').tap();
          assert(await page.locator('#enemy_bCard .br-target').count());
        }else{
          await page.locator('#singleEnemyBox .br-info').tap();
          const detail=page.locator('#renewalSheet');
          await detail.waitFor();
          await detail.getByRole('button',{name:'閉じる',exact:true}).tap();
          await detail.waitFor({state:'hidden'});
        }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page-wide horizontal overflow');
      }

      // Use the battle action resolver so turn counts, notifications and history come from gameplay.
      if(viewport.width===412){
        for(const [kind,label,moveId] of [['sleep','ねむり','skill_grassbeat_05'],['confusion','こんらん','s110_036']]){
          const shown=page.locator('#renewalBanner.on.status').filter({hasText:label+' 2T'});
          const chip=page.locator('#pBattleStatus .status-chip--'+kind);
          const notification=shown.waitFor({state:'visible'}).then(async ()=>{
            assert.equal(await chip.innerText(),label+' 2');
            assert.equal(await shown.innerText(),label+' 2T');
          });
          await Promise.all([notification,page.evaluate(async moveId=>{
            endPartyRecovery();prepareBattleParty();
            const map=MAPS.find(m=>m.id==='grassland'),mon=by('grassbeat');
            const request=createHuntRequest(map,mon,'normal',[],{allowOvertier:false});
            request.battleMode='single';
            beginChosenBattle(map.id,mon.id,'normal',request);
            const random=combatRandom;
            try{
              combatRandom=()=>0.1;
              startBattleTurn();
              await performAction(enemy,player,skillToMove(moveId),false);
            }finally{combatRandom=random;}
          },moveId)]);
          assert.equal(await chip.innerText(),label+' 2');
          assert.equal(await page.locator('#renewalBanner').textContent(),label+' 2T');
          const turn=await page.locator('#renewalHeader .br-location small b').first().innerText();
          await page.getByRole('button',{name:'戦闘の履歴'}).tap();
          const history=page.locator('#renewalSheet .br-history p');
          const applied=history.filter({hasText:label+' 2T'}).first();
          assert(await applied.isVisible());
          assert.equal(await applied.locator('small').innerText(),'ターン '+turn);
          console.log(`PASS turn ${turn}: ${await chip.innerText()} / ${await page.locator('#renewalBanner').textContent()} / ${await applied.textContent()}`);
          await page.locator('#renewalSheet').getByRole('button',{name:'閉じる'}).tap();

          // A countdown is not another application. Drive both affected actions through natural expiry.
          await page.evaluate(async ()=>{
            const random=combatRandom;
            try{
              combatRandom=()=>0.8;
              for(let i=0;i<2;i++){
                completeBattleTurn();startBattleTurn();
                await performAction(player,enemy,skillToMove('s110_001'),true);
              }
            }finally{combatRandom=random;}
          });
          assert.equal(await chip.count(),0);
          assert.equal(await page.locator('#renewalBanner').textContent(),label+' 2T');
          await page.getByRole('button',{name:'戦闘の履歴'}).tap();
          const released=await history.allTextContents();
          assert(released.some(text=>text.includes(kind==='sleep'?'目を覚ました':'こんらんが治った')));
          assert(released.some(text=>text.includes('状態正常（効果解除）')));
          if(kind==='confusion')assert(released.some(text=>text.includes('こんらん −')));
          await page.locator('#renewalSheet').getByRole('button',{name:'閉じる'}).tap();
        }
      }

      await page.evaluate(()=>show('party'));
      await page.locator(`[data-instance-uid="${uid}"]`).tap();
      const roster=page.locator('.roster-sheet');
      assert(await roster.locator('.type-chip').count(),'owned detail renders type chips');
      await roster.locator('[data-roster-action="skills"]').tap();
      await page.locator('#skillEdit.active .type-chip').first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'skill card screen fits');
      await page.evaluate(()=>showExpedition());
      await page.locator('#expedition.active .type-chip').first().waitFor();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'expedition regions fit');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${viewport.width}×${viewport.height}: battle type/status/buff chips, two live three-way opponents, names and HP do not overlap, controls remain actionable, roster/skills/expedition chips`);
    } finally {await context.close();}
  }
} finally {
  await browser?.close();
  server.kill();
}
