import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {chromium} from 'playwright';

const server=spawn(process.execPath,['scripts/dev-server.mjs','--port','0'],{stdio:['ignore','pipe','inherit']});
let browser;
try {
  const [ready]=await Promise.race([once(server.stdout,'data'),once(server,'exit').then(([code])=>{throw Error(`preview exited (${code})`);})]);
  const address=String(ready).match(/127\.0\.0\.1:\d+/)?.[0];
  assert(address,'preview started');
  const origin='http://'+address;
  browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
  for(const viewport of [{width:360,height:800},{width:390,height:844}]){
    const context=await browser.newContext({viewport,isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});
    try {
      await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
      const page=await context.newPage(),errors=[],native=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('dialog',async dialog=>{native.push(dialog.type()+': '+dialog.message());await dialog.dismiss();});
      await page.goto(origin+'/?legacy=1');
      await page.locator('#titleScreen').tap();
      await page.locator('#titleScreen').waitFor({state:'detached'});
      const seed=await page.evaluate(()=>{
        clearTutorialUi();show('home');save=initSave();
        save.progress.tutorial=tutorialSaveDefaults({legacy:true});
        Object.keys(save.progress.tutorial.guides).forEach(key=>save.progress.tutorial.guides[key]=true);
        save.contractor.exp=CONTRACTOR_MAX_EXP;save.contractor.pendingRankUps=[];
        save.instances=[];save.party=[];
        const ins=addInstance('freigal',2);
        save.party=[ins.uid];
        Object.assign(save.items,{gold_dust:2,potion:0,kilo_data:30,mega_data:0,giga_data:0});
        save.coins=105;scheduleContractorRankUpPresentation();
        if(!saveGame())throw Error('seed save failed');
        window.bulkTestWrites=0;window.bulkTestFail=false;
        const real=saveGame;
        saveGame=(...args)=>{window.bulkTestWrites++;return !window.bulkTestFail&&real(...args);};
        show('shop');
        return {uid:ins.uid,unitPrice:ITEM_BY_ID.potion.price};
      });
      const qty=page.locator('#itemQuantityDialog');
      const act=key=>qty.locator(`[data-item-quantity-action="${key}"]`);
      const readQty=()=>qty.locator('[data-item-quantity-value]').evaluate(node=>Number(node.value??node.textContent.trim()));
      const buy=page.locator('[data-shop-buy="potion"]');
      const sale=page.getByRole('button',{name:'全部売る',exact:true});
      const confirm=page.locator('#gameConfirmDialog');
      const selectConfirm=key=>confirm.locator(`[data-game-confirm-action="${key}"]`);
      const inventory=()=>page.evaluate(()=>[save.coins,save.items.potion,save.items.gold_dust,window.bulkTestWrites]);

      await buy.tap();
      await page.evaluate(()=>show('home'));
      await qty.waitFor({state:'hidden'});
      assert.deepEqual(await inventory(),[105,0,2,0]);
      await page.evaluate(()=>show('shop'));
      await buy.tap();
      await act('max').tap();
      const max=Math.floor(105/seed.unitPrice);
      assert.equal(await readQty(),max);
      assert(await act('increase').isDisabled());
      await act('submit').tap();
      await qty.waitFor({state:'hidden'});
      assert.deepEqual(await inventory(),[105-seed.unitPrice*max,max,2,1]);
      assert.equal(Number((await page.locator('#coinView').innerText()).replaceAll(',','')),105-seed.unitPrice*max);

      const original=await inventory();
      await sale.tap();
      await selectConfirm('cancel').tap();
      await confirm.waitFor({state:'detached'});
      assert.deepEqual(await inventory(),original);

      await sale.tap();
      await page.keyboard.press('Escape');
      await confirm.waitFor({state:'detached'});
      assert.deepEqual(await inventory(),original);

      await sale.tap();
      // A real tap on the transparent portion of the open modal is cancellation.
      const top=await confirm.locator('.game-confirm-sheet').evaluate(el=>el.getBoundingClientRect().top);
      assert(top>6,'confirmation leaves a tappable backdrop');
      await page.touchscreen.tap(Math.floor(viewport.width/2),Math.floor(top/2));
      await confirm.waitFor({state:'detached'});
      assert.deepEqual(await inventory(),original);

      await sale.tap();
      await page.evaluate(()=>show('home'));
      await confirm.waitFor({state:'detached'});
      assert.deepEqual(await inventory(),original);

      await page.evaluate(()=>show('shop'));
      await sale.tap();
      // Simulate another in-game change while the confirmation is open.
      await page.evaluate(()=>{save.items.gold_dust=3;});
      await selectConfirm('ok').tap();
      await confirm.waitFor({state:'detached'});
      assert.deepEqual(await inventory(),[original[0],original[1],3,original[3]]);
      await page.evaluate(()=>{save.items.gold_dust=2;window.bulkTestFail=true;});
      await sale.tap();
      await selectConfirm('ok').tap();
      const notice=page.locator('#uiNotice.is-error.is-visible');
      await notice.waitFor();
      assert.match(await notice.innerText(),/保存できません/);
      assert(await notice.evaluate(el=>Number(getComputedStyle(el).opacity)>0),'save failure is visible, not covered by the closed dialog');
      assert.deepEqual(await inventory(),[...original.slice(0,3),original[3]+1]);
      await page.evaluate(()=>{window.bulkTestFail=false;});

      await sale.tap();
      await selectConfirm('ok').evaluate(button=>{button.click();button.click();});
      await confirm.waitFor({state:'detached'});
      await page.waitForFunction(()=>save.items.gold_dust===0);
      assert.deepEqual(await inventory(),[original[0]+200,original[1],0,original[3]+2]);

      const expCase=await page.evaluate(uid=>{
        show('party');
        if(!openRosterDetail(uid))throw Error('could not open owned unit');
        const unit=getInstance(uid),gain=traitExperienceReward(unit,ITEM_BY_ID.kilo_data.expAmount);
        return {stock:save.items.kilo_data,level:unit.level,exp:unit.exp,need:needExp(unit.level),gain};
      },seed.uid);
      await page.locator('.roster-data-items summary').tap();
      await page.locator('[data-roster-action="kilo_data"]').tap();
      assert(await qty.locator('[data-item-quantity-tab="mega_data"]').isDisabled());
      await act('next').tap();
      const n=Math.ceil((expCase.need-expCase.exp)/expCase.gain);
      assert.equal(await readQty(),n);
      const remaining=expCase.exp+n*expCase.gain-expCase.need;
      const prediction=(await qty.locator('.item-quantity-preview').innerText()).replaceAll(/\s/g,'');
      assert.match(prediction,new RegExp(`Lv\\.${expCase.level}→Lv\\.${expCase.level+1}`));
      assert.match(prediction,new RegExp(`EXP${remaining}/`));
      const previousWrites=(await inventory())[3];
      await act('submit').tap();
      await qty.waitFor({state:'hidden'});
      assert.deepEqual(await page.evaluate(uid=>{
        const unit=getInstance(uid);
        return [unit.level,unit.exp,save.items.kilo_data,window.bulkTestWrites];
      },seed.uid),[expCase.level+1,remaining,expCase.stock-n,previousWrites+1]);
      assert.deepEqual(native,[],'ordinary game flows do not open a browser dialog');
      assert.deepEqual(errors,[]);
      console.log(`PASS ${viewport.width}×${viewport.height}: bulk buy/EXP, cancellation/background/back/navigation, rollback notice, double OK once`);
    } finally {await context.close();}
  }
} finally {await browser?.close();server.kill();}
