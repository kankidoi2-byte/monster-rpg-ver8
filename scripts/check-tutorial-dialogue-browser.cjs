const path=require('node:path');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const assert=require('node:assert/strict');
(async()=>{
  const server=require('node:child_process').spawn(process.execPath,['scripts/dev-server.mjs'],{cwd:path.resolve(__dirname,'..'),stdio:['ignore','pipe','inherit']});
  let browser;
  try{
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Preview startup timed out')),10000);
      server.stdout.once('data',()=>{clearTimeout(timer);resolve();});
      server.once('error',error=>{clearTimeout(timer);reject(error);});
      server.once('exit',code=>{clearTimeout(timer);reject(new Error(`Preview exited: ${code}`));});
    });
    browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
    for(const [width,height,textScale=1] of [[320,568],[360,640],[390,844],[844,390],[1366,768],[360,640,2]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
      const page=await context.newPage();const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
      await page.waitForFunction(()=>typeof startTutorialFlow==='function');
      await page.locator('#titleScreen').click();
      await page.waitForFunction(()=>!document.body.classList.contains('title-mode'));
      if(textScale===2)await page.addStyleTag({content:'.tutorial-bubble p{font-size:26px!important} #tutorialTitle{font-size:36px!important} .tutorial-dialogue-choices button{font-size:32px!important}'});
      await page.evaluate(()=>{
        clearTutorialUi();show('home');
        currentTutorialState().playerName='<img src=x>名前';
        registerTutorialFlow('presentation_browser_test',[
          {id:'test_pages',screenId:'home',scene:'grassland',speaker:'テストA',
            dialogue:[{text:'長い会話の読みやすさを確認します。\n'+('文章と改行を省略せずに読み進められることを確認します。'.repeat(18))},
              {speaker:'テストA・テストB',text:'同時発言です。',portrait:null},
              {speaker:'{{playerName}}',scene:'workshop',text:'返答を選んでください。'}],
            choices:[{id:'yes',label:'はい'}, {id:'long',label:'長めの返答であってもボタンの外へはみ出さず選べることを確かめます。'}]},
          {id:'test_after',screenId:'home',text:'到着'},
          {id:'test_action',screenId:'home',target:'#homePartyEditButton',advanceOnTarget:true,text:'編成を開く'}]);
        startTutorialFlow('presentation_browser_test');
      });
      await page.waitForTimeout(350);
      let rect=await page.locator('#tutorialBubble').boundingBox();
      assert.ok(rect.x>=-1&&rect.x+rect.width<=width+1,JSON.stringify(rect));
      assert.ok(rect.y>=-1&&rect.y+rect.height<=height+1,JSON.stringify(rect));
      assert.equal(await page.locator('#tutorialText').evaluate(e=>getComputedStyle(e).whiteSpace),'pre-wrap');
      await page.locator('#tutorialNextButton').click();await page.waitForTimeout(300);
      assert.equal(await page.locator('#tutorialTitle').textContent(),'テストA・テストB');
      assert.equal(await page.locator('#tutorialStoryBackdrop').getAttribute('data-scene'),'grassland');
      await page.locator('#tutorialBackButton').click();await page.waitForTimeout(300);
      assert.equal(await page.locator('#tutorialTitle').textContent(),'テストA');
      await page.locator('#tutorialNextButton').click();await page.waitForTimeout(300);
      await page.locator('#tutorialNextButton').click();await page.waitForTimeout(300);
      assert.equal(await page.locator('#tutorialTitle').textContent(),'<img src=x>名前');
      assert.equal(await page.locator('#tutorialTitle img').count(),0);
      assert.equal(await page.locator('#tutorialNextButton').isVisible(),false);
      for(const button of await page.locator('#tutorialDialogueChoices button').all()){
        const b=await button.boundingBox();assert.ok(b.height>=48&&b.width<=width);
        assert.ok(await button.evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      }
      if(width===360&&textScale===1&&process.env.TUTORIAL_SCREENSHOT)await page.screenshot({path:process.env.TUTORIAL_SCREENSHOT});
      await page.locator('#tutorialDialogueChoices button').last().focus();
      await page.keyboard.press('Enter');await page.waitForTimeout(300);
      assert.equal(await page.locator('#tutorialText').textContent(),'到着');
      await page.locator('#tutorialNextButton').click();await page.waitForTimeout(300);
      assert.equal(await page.locator('#tutorialNextButton').isVisible(),false,'legacy target-action stays blocked');
      assert.equal(errors.length,0,errors.join('\n'));
      console.log(`PASS ${width}x${height} text x${textScale}: scrolling, Back, dialogue, choices, keyboard, literal names, action guard`);
      await context.close();
    }
  }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
