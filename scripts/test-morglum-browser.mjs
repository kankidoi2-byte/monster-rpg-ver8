// Isolated fresh browser storage; never touches a player save.
import {chromium} from 'playwright';

import assert from 'node:assert/strict';

import {spawn} from 'node:child_process';

const server=spawn(process.execPath,['scripts/dev-server.mjs','--host','127.0.0.1','--port','4176'],{stdio:['ignore','pipe','inherit']});

await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);
server.once('error',reject);
});


(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',d=>d.dismiss());
await page.goto('http://127.0.0.1:4176/?legacy=1',{waitUntil:'networkidle'});
assert(await page.locator('#titleScreen').isVisible());
await page.locator('#titleScreen').click();
await page.evaluate(()=>{clearTutorialUi();
save=initSave();
save.tutorial=tutorialSaveDefaults({legacy:true});
save.instances=[];
save.party=[];
const ins=addInstance('false_dragon_gamma',1);
save.party=[ins.uid];
save.skillCards=Object.fromEntries(MOVE_CARDS.map(sk=>[sk.id,7]));
save.equippedSkills[ins.uid]=['skill_false_dragon_gamma_01'];
show('home');
});
assert(await page.locator('#home').isVisible());
await page.evaluate(()=>show('partySet'));
assert(await page.locator('#partySet').isVisible());
await page.evaluate(()=>openSkillEdit(save.instances[0].uid));
assert((await page.locator('[data-skill-card-id="skill_icegolem_02"]').textContent()).includes('COST 2'));
const result=await page.evaluate(()=>{const a=equipSkill('skill_icegolem_02'),b=equipSkill('skill_rikasheef_02');
return {a,b,total:equippedSkillCost(save.instances[0]),limit:skillCostLimitFor(by('false_dragon_gamma'),save.instances[0]),ids:save.equippedSkills[save.instances[0].uid]};
});
assert.equal(result.a,true);
assert.equal(result.b,true);
assert.deepEqual(result.ids,['skill_false_dragon_gamma_01','skill_icegolem_02','skill_rikasheef_02']);
assert.equal(result.total,8);
assert.equal(result.limit,8);
const saved=await page.evaluate(()=>{saveGame();
return JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills});
});
await page.reload({waitUntil:'networkidle'});
await page.locator('#titleScreen').click();
assert.equal(await page.evaluate(()=>JSON.stringify({instances:save.instances,party:save.party,skillCards:save.skillCards,equippedSkills:save.equippedSkills})),saved);
await page.evaluate(()=>startBattleFromParty());
assert(await page.locator('#battleChoices').isVisible());
await page.evaluate(()=>startChosenBattle('grassland','slime','easy'));
assert(await page.locator('#battle').isVisible());
assert((await page.locator('#commands').textContent()).includes('胞子弾'));
assert.equal(errors.length,0,errors.join('\n'));
console.log(JSON.stringify({result:'PASS',titleHomePartyHuntBattle:true,actualEquip:result,saveReloadPreserved:true,browserErrors:errors}));
}finally{await browser.close();
}})().finally(()=>server.kill()).catch(e=>{console.error(e);
process.exitCode=1;
});
