import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','0'],{stdio:['ignore','pipe','inherit']});
const evidence=process.env.ICE_UI_EVIDENCE;
if(evidence)fs.mkdirSync(evidence,{recursive:true});
let browser;
try{
  const url=await new Promise((resolve,reject)=>{
    server.stdout.once('data',data=>{
      const host=String(data).match(/127\.0\.0\.1:\d+/)?.[0];
      if(host)resolve('http://'+host+'/?legacy=1');else reject(new Error(String(data)));
    });
    server.once('error',reject);server.once('exit',code=>reject(new Error('Dev server exited: '+code)));
  });
  browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  for(const width of [320,360,412]){
    const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
    await page.goto(url);
    await page.locator('#titleScreen').click();
    await page.locator('#titleScreen').waitFor({state:'detached'});
    const uid=await page.evaluate(()=>{
      clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});
      for(const k of Object.keys(save.progress.tutorial.guides))save.progress.tutorial.guides[k]=true;
      const golem=addInstance('icegolem',10);save.party=[golem.uid];save.contractor.pendingRankUps=[];
      clearTimeout(contractorRankUpTimer);document.getElementById('contractorRankUpOverlay').classList.add('hidden');
      showTypeChart();return golem.uid;
    });
    assert.match(await page.locator('#typeBasicChart h2').innerText(),/❄️.*基本6属性/);
    const rows=await page.locator('#typeBasicChart .tw-item').evaluateAll(items=>items.map(row=>[...row.querySelectorAll('.tw-type')].map(el=>el.textContent)));
    assert.deepEqual(rows,[['火','氷','水'],['氷','森','火'],['森','風','氷'],['風','雷','森'],['雷','水','風'],['水','火','雷']]);
    assert(await page.locator('#typeBasicChart').evaluate(el=>{
      const {left,right}=el.getBoundingClientRect();
      return document.documentElement.scrollWidth<=innerWidth&&left>=0&&right<=innerWidth&&
        [...el.querySelectorAll('.tw-item')].every((row,i,rows)=>{
          const bounds=row.getBoundingClientRect();
          return bounds.left>=left&&bounds.right<=right&&row.scrollWidth<=row.clientWidth+1&&
            (!i||rows[i-1].getBoundingClientRect().bottom<=bounds.top);
        });
    }),`${width}px six-row chart fits portrait width`);
    if(evidence)await page.screenshot({path:`${evidence}/chart-${width}.png`});
    await page.evaluate(()=>{show('dex');showDexDetail('icegolem');});
    assert.equal(await page.locator('#dexDetail .ice').first().textContent(),'氷');
    await page.evaluate(uid=>{show('party');openMonsterStatus(uid);},uid);
    assert.equal(await page.locator('#monsterStatus .status-chips .ice').textContent(),'氷');
    assert.match(await page.locator('#monsterStatus .status-skill:has(.status-dot.ice)').first().innerText(),/氷の拳/);
    await page.evaluate(uid=>{closeMonsterStatus(false);openSkillEdit(uid);},uid);
    assert.equal(await page.locator('#skillTypeFilter option[value=ice]').textContent(),'氷');
    await page.evaluate(()=>{show('skillDex');document.getElementById('skillDexType').value='ice';renderSkillDex();});
    assert.deepEqual(await page.locator('#skillDexList [data-skill-dex-id]').evaluateAll(cards=>cards.map(card=>card.dataset.skillDexId)),['s110_055','s110_057']);
    for(const [id,name] of [['s110_055','氷の拳'],['s110_057','氷塊拳']]){
      const card=page.locator(`#skillDexList [data-skill-dex-id=${id}]`);
      const label=await card.innerText();
      assert(label.includes(name)&&label.includes('氷属性'));
      assert.equal(await card.locator('.tcg-card').evaluate(el=>el.style.getPropertyValue('--art-color')),'#bfefff');
    }
    assert.deepEqual(await page.evaluate(()=>[SKILL_ART_KANJI.ice,TYPE_ICONS.ice,battleSkillEffectProfile(skillToMove('s110_055')).elements,battleSkillEffectProfile(skillToMove('s110_057')).elements,SKILL_DEX_TYPE_ORDER[SKILL_DEX_TYPE_ORDER.indexOf('water')+1]]),['氷','❄️',['ice'],['ice'],'ice']);
    await page.evaluate(()=>{
      endPartyRecovery();prepareBattleParty();selectedMap=MAPS[0];enemy=by('grassbeat');
      activeHuntRequest=createHuntRequest(selectedMap,enemy,'normal',[],{allowOvertier:false});
      activeHuntRequest.battleMode='single';beginChosenBattle(selectedMap.id,enemy.id,'normal',activeHuntRequest);show('battle');
      pFreezeTurns=1;update();
    });
    assert.equal(await page.locator('#pInfo .ice').textContent(),'氷');
    assert.match(await page.locator('#pBattleStatus .br-status.freeze').textContent(),/凍結 1T/);
    assert.match(await page.evaluate(()=>statusHtml(null,0,0,0,0,false,false,1)),/凍結\(1\)/);
    assert.deepEqual(errors,[]);
    await ctx.close();
    console.log(`Ice UI ${width}px: six matchup rows, portrait fit, Ice Golem dex/status/battle, skill filters/card/effect and freeze badge passed.`);
  }
}finally{await browser?.close();server.kill();}
