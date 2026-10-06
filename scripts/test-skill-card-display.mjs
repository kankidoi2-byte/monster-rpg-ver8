import {applyStatusDataCopy,applyStatusCoreCopy} from './status-description-copy-baseline.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {runtime} from '../tools/balance-audit/runtime.mjs';
const base='2f9e81d2dbffc2b02f25648c5bdd5ee3ba9812a0';
const read=name=>fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8');
// Apply the separately tested taxonomy fix to the display baseline as well:
// Normalize the two intentional recoil copy edits; all other card data and descriptions remain compared.
const old=runtime({data:s=>applyStatusDataCopy(s).replace('極限の嵐を解放する代わりに反動を受ける。','極限の嵐を解放する。'),core:()=>applyStatusCoreCopy(execFileSync('git',['show',base+':js/core.js'],{encoding:'utf8'}))
 .replace("recoil:'強力だが反動ダメージあり'","recoil:'攻撃後、自分も8ダメージを受ける'")
 .replace('ダイブ|ラッシュ|ランページ','ダイブ|(?<!ク)ラッシュ|ランページ')
 .replace('  if (fx[effect]) txt +=',read('core').match(/  const poweredModifierText=[\s\S]*?\n  if\(poweredModifierText\[mv\[8\]\]\)fx\[effect\]=poweredModifierText\[mv\[8\]\];\n/)[0]+'  if (fx[effect]) txt +=')});
const r=runtime();
vm.runInContext(read('dex'),r.context);
const strip=html=>html.replace(/<[^>]+>/g,'');
const cards=r.run('MOVE_CARDS');
assert.equal(JSON.stringify(cards),JSON.stringify(old.run('MOVE_CARDS')),'card IDs, COST, stats, descriptions and equipment metadata are unchanged');
let checks=0;
for(const sk of cards){
 const arg=JSON.stringify(sk.id);
 const standard=r.run(`moveEffectText(skillToMove(${arg}))`);
 assert.equal(standard,old.run(`moveEffectText(skillToMove(${arg}))`),'default description compatibility: '+sk.id);
 const header=r.run(`skillCardHeader(SKILL_BY_ID[${arg}])`);
 assert.equal(strip(header),sk.name+'COST '+sk.cost);
 const stats=strip(r.run(`skillCardStats(SKILL_BY_ID[${arg}])`));
 assert.equal(stats,r.run(`skillTypeLabel(skillTypes(SKILL_BY_ID[${arg}]))`)+(sk.power===0?' / 補助技':' / 威力 '+sk.power));
 const effect=r.run(`moveEffectText(skillToMove(${arg}),{includeBase:false})`);
 assert(!/^[/。]|[/。]$/.test(effect.replace(/。$/,'')),'no leading/trailing separator: '+sk.id);
 assert(!effect.includes('属性 /')&&!effect.includes(' / 威力 '));
 const legacyBase=r.run(`moveTypes(skillToMove(${arg})).map(t=>TN[t]||t).join(' / ')+'属性 / '+(${sk.power}===0?'補助技':'威力 '+${sk.power})`);
 let expected=standard.slice(legacyBase.length).replace(/^ \/ |^。/,'');
 if(expected==='追加効果のない攻撃。')expected='';
 const intro=r.run(`skillTypes(SKILL_BY_ID[${arg}]).map(t=>TN[t]||t).join('と')+'の複合攻撃。'`);
 if(sk.types.length>1&&expected.startsWith(intro))expected=expected.slice(intro.length);
 assert.equal(effect,expected,'preserve effects, conditions, percentages and recoil: '+sk.id);
 assert.equal(r.run(`skillCardEffect(skillToMove(${arg}))`),effect?`<p class="small skill-effect-text">${effect}</p>`:'');
 const gacha=r.run(`skillGachaCardMarkup({card:SKILL_BY_ID[${arg}],tier:'common',isNew:true},0)`);
 assert(gacha.includes(header)&&gacha.includes('class="skill-type-line'));
 checks++;
}
r.run(`save=initSave();save.instances=[];save.party=[];var testIns=addInstance('freigal',1);save.party=[testIns.uid];save.skillCards=Object.fromEntries(MOVE_CARDS.map(s=>[s.id,10]));editingSkillUid=testIns.uid;`);
const before=r.run('JSON.stringify(save)');
r.run('renderSkillEdit()');
assert.equal(r.run('JSON.stringify(save)'),before,'rendering does not change inventory or save');
for(const id of ['skillEditCurrent','skillCardList']){
 const html=r.context.document.getElementById(id).innerHTML;
 assert(!html.includes('威力0')&&!html.includes('属性 /')&&!html.includes('<p class="small"></p>'));
 assert(html.includes('class="skill-type-line')&&html.includes('COST '));
}
for(const mon of r.run('M')){
 const html=r.run(`renderUnitSkillList(by(${JSON.stringify(mon.id)}))`);
 assert(!html.includes('威力0')&&!html.includes('属性 /'));
 assert.equal((html.match(/class="skill-type-line /g)||[]).length,mon.moves.length);
}
for(const file of ['skills','dex','skill-gacha','tutorial']){
 const source=read(file);
 assert(!/moveEffectText\(/.test(source),'all card callers use effects-only helper: '+file);
}
console.log(`PASS skill-card display: ${checks} cards, default compatibility, all unit dexes, equipment inventory preservation and caller coverage`);
