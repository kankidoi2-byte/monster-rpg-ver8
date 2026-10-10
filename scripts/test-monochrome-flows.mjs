// Called only with the isolated, externally blocked 390px CI page.
import assert from 'node:assert/strict';
export async function runMonochromeFlows(page,out,record){
 const dialogHandler=dialog=>dialog.accept(dialog.type()==='prompt'?'1':undefined);
 page.removeAllListeners('dialog');page.on('dialog',dialogHandler);
 const click=async locator=>{
  const rankClose=page.locator('#contractorRankUpOverlay:not(.hidden) button[onclick="closeContractorRankUp()"]');
  if(await rankClose.isVisible())await rankClose.click();
  await locator.evaluate(el=>el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));
  await locator.click(); // Normal actionability checks; never force through overlays.
 };
 const pass=async (name,detail={})=>{
  await page.screenshot({path:`${out}/flow-${name}.jpg`,type:'jpeg',quality:75,fullPage:true,animations:'disabled'});
  record({name,result:'PASS',screenshot:`flow-${name}.jpg`,...detail});
 };
 await page.evaluate(()=>{
  clearTutorialUi();closeSkillGachaPresentation();busy=false;
  save.coins=100000;save.saveMeta.migrations.push(SKILL_CARD_INVENTORY_MIGRATION);
  save.items=Object.fromEntries(ITEM_DEX_ITEMS.map(item=>[item.id,99]));
  save.skillCards=Object.fromEntries(EQUIPPABLE_MOVE_CARDS.map(card=>[card.id,9]));
  ensureContractorState().pendingRankUps=[];clearTimeout(contractorRankUpTimer);
  document.querySelector('#contractorRankUpOverlay').classList.add('hidden');
  save.party=save.instances.slice(0,2).map(ins=>ins.uid);show('partySet');
 });
 const partyBefore=await page.evaluate(()=>[...save.party]);
 await click(page.locator(`#partySelectList [data-party-uid="${partyBefore[0]}"]`));
 await click(page.locator('#partySetupSaveButton'));
 assert(await page.locator('#home').isVisible());
 assert.deepEqual(await page.evaluate(()=>save.party),partyBefore.slice(1));
 await pass('party-save');

 await page.evaluate(()=>show('dexHub'));
 await click(page.locator('#dexHub button[onclick="show(\'skillDex\')"]'));
 assert(await page.locator('#skillDex').isVisible());
 await page.locator('#skillDexCost').selectOption('25');
 assert.equal(await page.locator('#skillDexList [data-skill-dex-id]').count(),4);
 await click(page.locator('#skillDexList [data-skill-dex-id]').first());
 assert((await page.locator('#skillDexDetail').textContent()).includes('COST 25'));
 await click(page.locator('#skillDex .ui-back-link'));
 assert(await page.locator('#dexHub').isVisible());
 await pass('dex-category-filter-detail-back');

 await page.evaluate(()=>showSkillSynthesis());
 const recipe=await page.evaluate(()=>{const r=SKILL110_SYNTHESIS_RECIPES[0];return {id:r.id,resultId:r.resultId,materials:r.materials,before:{...save.skillCards}};});
 await click(page.locator(`[data-synthesis-id="${recipe.id}"]`));
 const inventory=await page.evaluate(()=>({...save.skillCards}));
 assert.equal(inventory[recipe.resultId],recipe.before[recipe.resultId]+1);
 for(const id of recipe.materials)assert.equal(inventory[id],recipe.before[id]-1);
 await pass('skill-synthesis',{recipeId:recipe.id});

 await page.evaluate(()=>{show('skillGacha');setSkillGachaPresentationSpeed('quick');});
 const drawBefore=await page.evaluate(()=>({coins:save.coins,count:Object.values(save.skillCards).reduce((sum,n)=>sum+n,0),cost:SKILL_GACHA_SINGLE_COST}));
 await click(page.locator('#skillGachaRateList .skill-gacha-actions button').first());
 await page.locator('#skillGachaPresentation').waitFor({state:'visible'});
 await page.locator('#skillGachaPresentation.is-complete').waitFor({timeout:15000});
 assert.equal(await page.locator('#skillGachaPresentation [data-skill-gacha-card]').count(),1);
 assert.equal(await page.evaluate(()=>save.coins),drawBefore.coins-drawBefore.cost);
 assert.equal(await page.evaluate(()=>Object.values(save.skillCards).reduce((sum,n)=>sum+n,0)),drawBefore.count+1);
 await pass('gacha-draw-result');
 await click(page.locator('#skillGachaPresentation button[onclick="closeSkillGachaPresentation()"]'));
 assert(await page.locator('#skillGachaPresentation').isHidden());

 await page.evaluate(()=>{
  selectedAlchemyMaterialIds=[];selectedAlchemyMaterialCounts=[];selectedAlchemyCatalystUid='';
  selectedAlchemyRecipeId=DEFAULT_ALCHEMY_RECIPE_ID;deactivateTutorialAlchemyLesson();showAlchemy();
 });
 const catalyst=await page.evaluate(()=>alchemyEligibleInstances()[0]?.uid);
 assert(catalyst,'alchemy fixture has an unlocked, non-party catalyst');
 await page.locator('#alchemyMonsterSelect').selectOption(catalyst);
 const plan=await page.evaluate(()=>{const p=alchemyPlan();return {errors:validateAlchemyPlan(p),coins:save.coins,cost:p.coinCost,materials:p.selection.materialIds,counts:p.selection.materialCounts,items:{...save.items}};});
 assert.deepEqual(plan.errors,[]);
 await click(page.locator('#alchemy .alchemy-start-button'));
 assert(await page.locator('#alchemyConfirm').isVisible());
 await pass('alchemy-confirmation');
 await click(page.locator('#alchemyExecuteButton'));
 await page.locator('#alchemyResult .alchemy-result-card').waitFor({timeout:15000});
 assert.equal(await page.evaluate(uid=>save.instances.some(ins=>ins.uid===uid),catalyst),false);
 assert.equal(await page.evaluate(()=>save.coins),plan.coins-plan.cost);
 const items=await page.evaluate(()=>save.items);
 plan.materials.forEach((id,index)=>assert.equal(items[id],plan.items[id]-plan.counts[index]));
 await pass('alchemy-result');

 await page.evaluate(()=>{showExpedition();selectExpeditionDistance('short');});
 await click(page.locator('[data-tutorial-expedition-map="grassland"]'));
 await click(page.locator('.expedition-member').first());
 await click(page.locator('#expeditionStartButton'));
 assert.equal(await page.evaluate(()=>save.expeditions.active.length),1);
 await pass('expedition-launch');
 // Exercise actual early-return confirmation, then actual reward-claim controls
 // after calling the same win-progress handler used by completed battles.
 await click(page.locator('.expedition-active-grid button[onclick^="recallExpedition"]'));
 assert.equal(await page.evaluate(()=>save.expeditions.active.length),0);
 await click(page.locator('.expedition-member').first());
 await click(page.locator('#expeditionStartButton'));
 await page.evaluate(()=>{progressActiveExpeditions(()=>0.5);renderExpedition();});
 assert.equal(await page.evaluate(()=>save.expeditions.active[0].status),'complete');
 await click(page.locator('.expedition-active-grid button[onclick^="claimExpedition"]'));
 assert.equal(await page.evaluate(()=>save.expeditions.active.length),0);
 assert.equal(await page.evaluate(()=>save.expeditions.completedCount),1);
 await page.waitForTimeout(350);
 if(await page.locator('#evolution').isVisible())await click(page.locator('#evoChoices button').filter({hasText:'進化しない'}));
 await pass('expedition-return-claim',{progression:'real win-progress handler invoked once; no simulated combat victory'});

 await page.evaluate(()=>show('moreMenu'));
 await page.locator('#moreMenu .save-management').evaluate(el=>el.open=true);
 const profile=page.locator('#moreMenu .profile-panel');
 assert(await profile.isVisible());
 await profile.locator('input[aria-label="プロフィール名"]').fill('Monochrome QA');
 await click(profile.getByRole('button',{name:'名前を保存',exact:true}));
 assert.equal(await page.evaluate(()=>MonsterProfiles.current().name),'Monochrome QA');
 const saved=await page.evaluate(()=>{
  if(!saveGame())throw Error('functional flow save failed');
  return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills,coins:save.coins,items:save.items,expeditions:save.expeditions});
 });
 await page.reload({waitUntil:'networkidle'});await page.locator('#titleScreen').click();await page.locator('#titleScreen').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills,coins:save.coins,items:save.items,expeditions:save.expeditions})),saved);
 assert.equal(await page.evaluate(()=>MonsterProfiles.current().name),'Monochrome QA');
 await page.evaluate(()=>{show('moreMenu');document.querySelector('#moreMenu .save-management').open=true;});
 assert(await page.locator('.profile-panel input[aria-label="プロフィール名"]').isVisible());
 await pass('save-reload-profile-name');
 page.removeAllListeners('dialog');page.on('dialog',dialog=>dialog.dismiss());
}
