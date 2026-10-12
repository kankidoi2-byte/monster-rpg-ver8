import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const r=runtime();
for(const file of ['skill-synthesis','skill-synthesis-ui'])vm.runInContext(fs.readFileSync(new URL(`../js/${file}.js`,import.meta.url),'utf8'),r.context);
let confirmed=false,question='',notices=[],draws=0;
r.context.confirm=message=>{question=message;return confirmed;};
r.context.showUiNotice=(message,kind)=>notices.push({message,kind});
r.context.testDraw=()=>{draws++;return .99;};r.run('Math.random=testDraw;save=initSave();save.skillCards={};save.equippedSkills={};renderSkillSynthesis()');
const markup=()=>r.elements.get('skillSynthesisList').innerHTML;
assert.equal((markup().match(/data-synthesis-id=/g)||[]).length,4);assert(markup().includes('この級の技カードを持っていません'));assert.match(markup(),/id="skillSynthesisSubmit"[^>]*disabled/);
r.run("save.skillCards={s110_001:4,s110_002:2};renderSkillSynthesis();changeSkillSynthesisMaterial('s110_001',1);changeSkillSynthesisMaterial('s110_001',1);changeSkillSynthesisMaterial('s110_002',1);");
assert.equal(r.run('JSON.stringify(skillSynthesisUiSelection)'),'{"s110_001":2,"s110_002":1}');
r.run("changeSkillSynthesisMaterial('s110_002',1)");assert.equal(r.run('skillSynthesisUiSelection.s110_002'),1,'cannot exceed 3 selected');
assert.match(markup(),/素材選択 3 \/ 3枚/);assert(!/id="skillSynthesisSubmit"[^>]*disabled/.test(markup()));assert(markup().includes('上級 30％'));
const before=r.run('JSON.stringify(save)');r.run('confirmSkillSynthesis()');assert.equal(r.run('JSON.stringify(save)'),before);assert.equal(draws,0);assert(question.includes('×2'));assert(question.includes('上級 30％'));
confirmed=true;r.run('confirmSkillSynthesis()');assert.equal(draws,2);assert.equal(r.run('save.skillCards.s110_090'),1);assert.equal(r.run('save.skillCards.s110_001'),2);assert.equal(r.run('save.skillCards.s110_002'),1);assert(markup().includes('1枚獲得しました'));assert(notices.some(n=>n.kind==='success'));
assert.equal(r.run('skillSynthesisUiBusy'),false);assert.equal(r.run('skillSynthesisBusy'),false);
r.run("selectSkillSynthesisTier('synth_tier_super_v1')");assert.equal(r.run('JSON.stringify(skillSynthesisUiSelection)'),'{}');assert(markup().includes('最強 10％'));assert(!markup().includes('id="skillSynthesisResult"'));
// Confirmation names each equipped slot before consuming repeated material copies.
r.run("save=initSave();save.instances=[];save.party=[];var synthesisIns=addInstance('freigal',100);save.skillCards={s110_091:3};save.equippedSkills={[synthesisIns.uid]:['s110_091']};renderSkillSynthesis();changeSkillSynthesisMaterial('s110_091',1);changeSkillSynthesisMaterial('s110_091',1);changeSkillSynthesisMaterial('s110_091',1);");
confirmed=false;const equippedBefore=r.run('JSON.stringify(save)');r.run('confirmSkillSynthesis()');assert.equal(r.run('JSON.stringify(save)'),equippedBefore);assert(question.includes(r.run('synthesisIns.uid')));assert(question.includes('フレイガル'));assert(question.includes('装備が外れ'));
confirmed=true;r.run('confirmSkillSynthesis()');assert.equal(r.run('save.skillCards.s110_110'),1);assert(!r.run("save.equippedSkills[synthesisIns.uid].includes('s110_091')"));
// Failure shows no completed result, retains selection and locked draw for exact retry.
r.run("save=initSave();save.skillCards={s110_091:3};save.equippedSkills={};renderSkillSynthesis();changeSkillSynthesisMaterial('s110_091',1);changeSkillSynthesisMaterial('s110_091',1);changeSkillSynthesisMaterial('s110_091',1);saveGame=()=>false;");
const failBefore=r.run('JSON.stringify(save)');r.run('confirmSkillSynthesis()');assert.equal(r.run('JSON.stringify(save)'),failBefore);assert(!markup().includes('id="skillSynthesisResult"'));assert.equal(r.run('skillSynthesisUiSelection.s110_091'),3);
const rolled=draws;r.run('saveGame=()=>true;confirmSkillSynthesis()');assert.equal(draws,rolled);assert.equal(r.run('save.skillCards.s110_110'),1);
// Same-content profile replacement clears picker/result and cannot consume old UI selection.
r.run('save=JSON.parse(JSON.stringify(save));confirmSkillSynthesis()');assert.equal(r.run('JSON.stringify(skillSynthesisUiSelection)'),'{}');assert(!markup().includes('id="skillSynthesisResult"'));
console.log('PASS tier picker/UI: all grades, duplicate counts/cap, cancel before RNG, uniform result, equipment warning, failure/no reveal/stable retry, profile reset.');
