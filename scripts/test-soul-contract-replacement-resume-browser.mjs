// Synthetic, isolated browser profiles only; never accesses a real player's save.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const out='artifacts/save-failure-ui/soul-contract-replacement-resume';fs.mkdirSync(out,{recursive:true});
const report={cases:[],limitations:['Chromium 390px mobile emulation, not physical Android']};
const publicUrl=process.env.GAME_TEST_URL;
const base=publicUrl||'http://127.0.0.1:4207/?legacy=1';
const origin=new URL(base).origin;
const server=publicUrl?null:spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4207'],{stdio:['ignore','pipe','inherit']});
let browser;
async function enter(page){
  const title=page.locator('#titleScreen');
  if(await title.count()){await title.click();await title.waitFor({state:'detached'});}
}
async function observations(page){return page.evaluate(()=>JSON.parse(sessionStorage.getItem('resume-test-lock-observations')||'[]'));}
try{
  if(server)await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error(`dev server exited: ${code}`)));});
  browser=await chromium.launch({headless:true});
  for(const kind of ['after','before','mismatch','malformed']){
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
    try{
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      const page=await context.newPage(),dialogs=[];
      page.on('dialog',async dialog=>{dialogs.push(dialog.message());await dialog.accept();});
      await page.addInitScript(()=>{
        sessionStorage.setItem('mb_profile_tab_v1','1');
        if(!navigator.locks)return;
        const request=navigator.locks.request.bind(navigator.locks);
        navigator.locks.request=(name,options,callback)=>request(name,options,async lock=>{
          try{return await callback(lock);}
          finally{
            const raw=sessionStorage.getItem('resume-test-keys');
            if(raw){
              const keys=JSON.parse(raw),rows=JSON.parse(sessionStorage.getItem('resume-test-lock-observations')||'[]');
              rows.push({name,mode:options.mode,primary:localStorage.getItem(keys.primary),
                recovery:localStorage.getItem(keys.recovery),backup:localStorage.getItem(keys.backup),archive:localStorage.getItem(keys.archive)});
              sessionStorage.setItem('resume-test-lock-observations',JSON.stringify(rows));
            }
          }
        });
      });
      await page.goto(base,{waitUntil:'networkidle'});await enter(page);
      const fixture=await page.evaluate(kind=>{
        clearTutorialUi();save=initSave();save.progress.tutorial=tutorialSaveDefaults({legacy:true});save.coins=2000;
        const hero=addInstance('aquaron',1);save.party=[hero.uid];migrateSkillSystem();ensureContractorState().pendingRankUps=[];
        save.customResumeBrowser={marker:'preserve-current'};saveGame();show('home');
        const keys={primary:MonsterProfiles.key(SAVE_KEY),backup:MonsterProfiles.key(SAVE_BACKUP_KEY),
          recovery:characterGachaRecoveryKey(),archive:characterGachaRecoveryArchiveKey()};
        const beforePrimary=localStorage.getItem(keys.primary),after=JSON.parse(beforePrimary);
        after.coins=1700;after.soulContractAppliedId='browser-resume-contract';after.soulContractReceipt=null;
        const afterPrimary=JSON.stringify(after),afterRecovery=JSON.stringify({version:1,id:after.soulContractAppliedId,
          status:'baseline',before:after,after,previous:null});
        const pending={beforePrimary,beforeRecovery:null,afterPrimary,afterRecovery};
        const primary=kind==='before'?beforePrimary:afterPrimary;
        const recovery=kind==='after'?afterRecovery:null;
        localStorage.setItem(keys.primary,primary);localStorage.setItem(keys.backup,beforePrimary);
        if(recovery===null)localStorage.removeItem(keys.recovery);else localStorage.setItem(keys.recovery,recovery);
        const archive=kind==='malformed'?'{broken browser archive':JSON.stringify({version:1,records:[],pending});
        localStorage.setItem(keys.archive,archive);
        sessionStorage.setItem('resume-test-keys',JSON.stringify(keys));sessionStorage.setItem('resume-test-lock-observations','[]');
        return {keys,primary,recovery,backup:beforePrimary,archive,coins:JSON.parse(primary).coins};
      },kind);
      dialogs.length=0;
      await page.reload({waitUntil:'networkidle'});await enter(page);
      if(kind==='before'||kind==='after'){
        await page.waitForFunction(()=>!soulContractReplacementBlocked);
        const rows=await observations(page),row=rows.find(x=>x.name===`monster-rpg:character-gacha:${fixture.keys.primary}`);
        assert(row,'automatic cleanup must execute through the profile Web Lock');assert.equal(row.mode,'exclusive');
        assert.equal(row.primary,fixture.primary,'automatic cleanup cannot rewrite the primary');
        assert.equal(row.recovery,fixture.recovery,'automatic cleanup cannot rewrite recovery');
        assert.equal(row.backup,fixture.backup,'automatic cleanup cannot rewrite backup');
        assert.equal(JSON.parse(row.archive).pending,undefined);
        assert.equal(await page.evaluate(()=>primaryReadFailed),false);
        assert.equal(await page.evaluate(()=>saveGame()),true);
        assert.equal(await page.evaluate(()=>save.coins),fixture.coins);
      }else{
        await page.waitForFunction(()=>soulContractReplacementBlocked);
        assert.equal(await page.evaluate(()=>primaryReadFailed),false);
        assert.equal(await page.evaluate(()=>saveGame()),false);
        await page.evaluate(()=>{clearTutorialUi();show('moreMenu');document.querySelector('.save-management').open=true;refreshReplacementRecoveryStatus();});
        const status=await page.locator('#replacementRecoveryStatus').textContent();
        assert.match(status,/セーブの置き換え処理が途中で止まっています/);
        assert.doesNotMatch(status,/セーブを読み取れなかったため/);
        assert(!dialogs.some(text=>text.includes('セーブを読み取れなかったため')));
        const resume=page.locator('#resumeSoulContractReplacement');await resume.scrollIntoViewIfNeeded();
        assert(await resume.isVisible());assert(await resume.isDisabled());
        const original=await page.evaluate(keys=>({primary:localStorage.getItem(keys.primary),backup:localStorage.getItem(keys.backup)}),fixture.keys);
        assert.equal(original.primary,fixture.primary);assert.equal(original.backup,fixture.backup);
        const downloadPending=page.waitForEvent('download');
        await page.locator('button[onclick="exportReplacementRecovery()"]').click();
        const download=await downloadPending,text=fs.readFileSync(await download.path(),'utf8');
        assert.doesNotThrow(()=>JSON.parse(text));
        if(kind==='malformed')assert(text.includes('broken browser archive'),'download must retain malformed evidence');
        await page.waitForFunction(()=>!document.getElementById('resumeSoulContractReplacement').disabled);
        await page.screenshot({path:`${out}/${kind}-resume-enabled.png`});
        await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),resume.click()]);
        await enter(page);await page.waitForFunction(()=>!soulContractReplacementBlocked);
        const rows=await observations(page),committed=rows.find(row=>{
          try{const archive=JSON.parse(row.archive);return !archive.pending&&row.recovery&&JSON.parse(row.recovery).status==='baseline';}
          catch(_error){return false;} // Earlier lock observations intentionally contain the malformed fixture.
        });
        assert(committed,'manual resume must complete under the same Web Lock');
        assert.equal(committed.name,`monster-rpg:character-gacha:${fixture.keys.primary}`);
        assert.equal(committed.primary,original.primary,'manual resume cannot replace current primary with a candidate');
        assert.equal(committed.backup,original.backup,'manual resume cannot roll backup backwards');
        assert.equal(JSON.parse(committed.recovery).id,'browser-resume-contract');
        assert.equal(await page.evaluate(()=>primaryReadFailed),false);
        assert.equal(await page.evaluate(()=>inspectCharacterGachaRecovery().blocked),false);
        assert.equal(await page.evaluate(()=>save.coins),fixture.coins);
        assert.equal(await page.evaluate(()=>save.customResumeBrowser.marker),'preserve-current');
        assert.equal(await page.evaluate(()=>saveGame()),true);
      }
      await page.screenshot({path:`${out}/${kind}-complete.png`});
      report.cases.push({kind,width:390,result:'PASS'});
      console.log(`SAVE-01 browser resume ${kind} PASS`);
    }finally{await context.close();}
  }
}catch(error){report.error=String(error?.stack||error);throw error;}
finally{fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(report,null,2));await browser?.close();server?.kill();}
