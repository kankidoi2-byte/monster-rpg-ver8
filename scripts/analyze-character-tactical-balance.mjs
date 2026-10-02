// Bounded diagnostic, not an optimal-play or complete game-balance proof.
// Run: node scripts/analyze-character-tactical-balance.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {battleRunner} from '../tools/balance-audit/battles.mjs';
import {files,root} from '../tools/balance-audit/runtime.mjs';

const baseRef=process.env.TACTICAL_BASE_REF||'21aedb6d7597295514ad4d76fcb02682b07269a4';
const trials=Number(process.env.TACTICAL_TRIALS||8),seed=20261002,cap=120;
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const baselineSources=Object.fromEntries(files.map(f=>[f,git('show',`${baseRef}:js/${f}.js`)]));
const currentSources=Object.fromEntries(files.map(f=>[f,fs.readFileSync(new URL(`js/${f}.js`,root),'utf8')]));
delete process.env.AUDIT_REF;
const plain=v=>JSON.parse(JSON.stringify(v));
const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
const rounded=n=>Math.round(n*10000)/10000;
const policy=`
var tacticalAuditPicks={},tacticalAuditSupportStreak=0;
auditSelect=function(){
 const moves=getEquippedMovesForInstance(activeInstance),missing=playerMaxHp()-pHp;
 const incoming=Math.max(1,enemy.moves.reduce((s,m)=>s+(m[1]>0?(m[1]*typeEff(m[2],player.types)+4)*eAtk*enemyDifficultyAttackMultiplier():0),0)/enemy.moves.length);
 const damage=m=>m[1]>0?((typeof tacticalSkillPower==='function'?tacticalSkillPower(m,true):m[1])*typeEff(m[2],enemy.types)*pAtk*playerAttackInstanceMultiplier()*(pFlareCharge?1.2:1)+4)*huntMapAttackMultiplier(moveTypes(m))*(eGuard?.55:1)*(eAquaShield?.5:1):0;
 const strongest=Math.max(1,...moves.map(damage)),remaining=Math.max(1,Math.min(5,eHp/strongest));
 const healWeight=pHp<playerMaxHp()*.4?1.35:pHp<playerMaxHp()*.65?.85:.3;
 let best=0,bestScore=-Infinity;
 moves.forEach((m,i)=>{
  const x=m[9]||{},effect=m[3],d=damage(m),actual=Math.min(d,eHp);let score=actual;
  if(d>=eHp&&d>0)score+=10000;
  const heal=x.heal?x.heal.flat+activeInstance.level*x.heal.perLevel:effect==='heal'?24+activeInstance.level*3:0;
  score+=Math.min(missing,adjustedBattleHealing(heal))*healWeight;
  const drain=x.drain||(effect==='drain'?.5:0);
  score+=Math.min(missing,adjustedBattleHealing(actual*drain))*healWeight;
  const buff=x.buff||(effect==='buff'?.25:0),debuff=x.debuff||(effect==='debuff'?.2:0);
  score+=Math.max(0,Math.min(buff,1.6-pAtk))*strongest/Math.max(.65,pAtk)*remaining*.65;
  score+=Math.max(0,Math.min(debuff,eAtk-.65))*incoming/Math.max(.65,eAtk)*remaining*.8;
  if((x.guard||effect==='guard')&&!pGuard)score+=incoming*.45;
  if(x.charge&&!pFlareCharge)score+=strongest*.2;
  if(x.dispel)score+=(eAtk>1?incoming*(1-1/eAtk)*remaining*.65:0)+(eGuard||eAquaShield?strongest*.25:0);
  const status=x.status||(effect==='poison'?{kind:'poison',chance:m[4]??.5}:effect==='paralysis'?{kind:'paralysis',chance:m[4]??.5}:null);
  if(status?.kind==='poison'&&!ePoisonTurns)score+=status.chance*enemyMaxHp()*BATTLE_STATUS_EFFECTS.poison.maxHpDamageRate*Math.min(2,remaining);
  if(status?.kind==='paralysis'&&!eParalysisTurns)score+=status.chance*incoming*.75;
  if(status?.kind==='confusion'&&!eConfusionTurns)score+=status.chance*incoming*.8;
  if(effect==='sleep'&&!eSleepTurns)score+=incoming*1.5*(m[4]??.5);
  if(x.cleanse?.includes('poison')&&pPoisonTurns)score+=playerMaxHp()*BATTLE_STATUS_EFFECTS.poison.maxHpDamageRate*Math.min(2,pPoisonTurns);
  if(x.cleanse?.includes('paralysis')&&pParalysisTurns)score+=incoming*.5;
  if(x.cleanse?.includes('confusion')&&pConfusionTurns)score+=incoming*.5;
  if(x.recoil)score-=playerMaxHp()*x.recoil*(pHp<playerMaxHp()*.3?2:1);
  if(effect==='recoil')score-=8;
  // Do not lock into guard/buff. Healing may repeat if it has actual value.
  if(m[1]===0&&tacticalAuditSupportStreak>=2&&heal===0)score=-1000;
  if(score>bestScore){best=i;bestScore=score;}
 });
 const m=moves[best];tacticalAuditSupportStreak=m[1]===0?tacticalAuditSupportStreak+1:0;
 tacticalAuditPicks[m[8]]=(tacticalAuditPicks[m[8]]||0)+1;return best;
};
`;
function makeRunner(sources){
 const b=battleRunner(Object.fromEntries(files.map(f=>[f,()=>sources[f]])));
 b.r.run(policy);return b;
}
const runners={baseline:makeRunner(baselineSources),current:makeRunner(currentSources)};
const r=runners.current.r;
const units=plain(r.run('M.filter(m=>/^character_.*_[234]$/.test(m.id))'));
const bases=units.filter(m=>!m.evolutionOnly);
assert.equal(bases.length,12);
const families=bases.map(a=>{const b=units.find(m=>m.id===a.evolution);return [a,b,units.find(m=>m.id===b.evolution)];});
const representative=['brigitte','selene','bordo','regus'];
const encounters=[{map:'grassland',difficulty:'normal',enemy:'slime_gold'},{map:'forest',difficulty:'normal',enemy:'thornbeat'},{map:'grassland',difficulty:'hard',enemy:'proto_icegolem'}];
const boss={map:'starsea',difficulty:'extreme',enemy:'doom_nemesion'};
const common=plain(r.run('CHARACTER_COMMON_MOVES.map(m=>m[8])'));
const cards=plain(r.run('SKILL_BY_ID'));
const staticFamilies=families.map(family=>{
 const moves=family.flatMap(m=>m.moves),types=new Set(family.flatMap(m=>m.types));
 const potentialDominance=[];
 // Conservative late-game dominance: same element, a plain strike has no unique
 // effect and a higher-power attack with no recoil is available. Ignores COST
 // only at Lv100, when all three chosen cards fit even at the maximum new cost.
 for(const low of moves.filter(m=>m[1]>0&&!m[3]))for(const high of moves){
  if(JSON.stringify(low[2])===JSON.stringify(high[2])&&high[1]>low[1]&&!high[9]?.recoil)
   potentialDominance.push({lowerId:low[8],higherId:high[8],lowerPower:low[1],higherPower:high[1]});
 }
 return {family:family[0].id.replace(/^character_|_2$/g,''),stages:family.map(m=>({id:m.id,defaultTotalCost:m.moves.reduce((s,m)=>s+m[5],0),meanAttackPower:rounded(mean(m.moves.filter(m=>m[1]>0).map(m=>m[1]))),maxAttackPower:Math.max(...m.moves.map(m=>m[1]))})),attackTypes:[...types],effects:[...new Set(moves.flatMap(m=>Object.keys(m[9]||{})))],heals:moves.filter(m=>m[9]?.heal).map(m=>({id:m[8],cost:m[5],level3:m[9].heal.flat+3*m[9].heal.perLevel,level30:m[9].heal.flat+30*m[9].heal.perLevel,level100:m[9].heal.flat+100*m[9].heal.perLevel})),potentialLateGameDominance:potentialDominance};
});
function buildFor(id,level,forced){
 const family=families.find(f=>f.some(m=>m.id===id)),unit=units.find(m=>m.id===id),stage=family.indexOf(unit);
 const own=family.slice(0,stage+1).flatMap(m=>m.moves).map(m=>cards[m[8]]);
 const limit=r.run(`skillCostLimitFor(by(${JSON.stringify(id)}),{level:${level}})`);
 const result=forced?[forced]:[];
 const remaining=()=>limit-result.reduce((s,id)=>s+cards[id].cost,0);
 // Enemy-independent, intentionally simple build. Start with the strongest
 // affordable dedicated attack, then a heal/utility; never optimize by matchup.
 const attacks=own.filter(c=>c.power>0).sort((a,b)=>b.power-a.power||a.cost-b.cost);
 const primary=attacks.find(c=>!result.includes(c.id)&&c.cost<=remaining());
 if(primary)result.push(primary.id);
 const supportCandidates=own.filter(c=>!result.includes(c.id)).sort((a,b)=>{
  const value=c=>(c.tactical?.heal?(c.tactical.heal.flat+level*c.tactical.heal.perLevel):0)+(c.tactical?.debuff?c.tactical.debuff*100:0)+(c.tactical?.guard?10:0)+(c.tactical?.buff?c.tactical.buff*40:0)+c.power*.05;
  return value(b)-value(a)||a.cost-b.cost;
 });
 const support=supportCandidates.find(c=>c.cost<=remaining());
 if(support)result.push(support.id);
 if(result.length<3){
  const existingEffects=new Set(result.flatMap(id=>Object.keys(cards[id].tactical||{})));
  const extra=supportCandidates.filter(c=>!result.includes(c.id)&&c.cost<=remaining()).sort((a,b)=>{
   const value=c=>Object.keys(c.tactical||{}).filter(k=>!existingEffects.has(k)).length*20+c.power*.1;
   return value(b)-value(a)||a.cost-b.cost;
  })[0];
  if(extra)result.push(extra.id);
 }
 assert(result.length<=3&&result.reduce((s,id)=>s+cards[id].cost,0)<=limit);
 assert(result.some(id=>cards[id].power>0));
 for(const sid of result)assert(r.run(`isSkillAllowedForMonster(${JSON.stringify(sid)},by(${JSON.stringify(id)}))`));
 return result;
}
const cases=[];
for(const version of ['baseline','current'])for(const family of families)for(const unit of [family[0],family[2]])for(const level of [3,30])for(const encounter of encounters)
 cases.push({version,build:'default',unit:unit.id,level,...encounter});
for(const name of representative){
 const id=`character_${name}_4`;
 assert(units.some(m=>m.id===id),`unknown representative ${id}`);
 for(const level of [3,30])for(const encounter of encounters)for(const forced of [null,...common])
  cases.push({version:'current',build:forced||'inherited',unit:id,level,equipped:buildFor(id,level,forced),...encounter});
 // Early-game check: common recoil can be superseded at stage 4 yet valuable
 // when stage 2 has only low-power attacks. The cost limit remains enforced.
 const early=`character_${name}_2`;
 for(const encounter of encounters)for(const forced of common)
  cases.push({version:'current',build:forced,unit:early,level:3,equipped:buildFor(early,3,forced),...encounter});
 for(const version of ['baseline','current'])cases.push({version,build:'default',unit:id,level:30,...boss});
 for(const forced of [null,...common])cases.push({version:'current',build:forced||'inherited',unit:id,level:30,equipped:buildFor(id,30,forced),...boss});
}
// Existing light-aligned characters can already acquire healing cards. Include
// all six legal users, not merely the three with healing in their default moves.
const oldHealers=plain(r.run(`M.filter(m=>m.entityKind==='character'&&!m.id.startsWith('character_')).map(m=>({id:m.id,own:m.moves.map(m=>canonicalSkillId(skillIdFromMove(m))),heals:MOVE_CARDS.filter(sk=>sk.effect==='heal'&&isSkillAllowedForMonster(sk.id,m)).map(sk=>sk.id)})).filter(x=>x.heals.length)`));
function oldHealerBuild(unit,forced){
 const own=[...new Set(unit.own)],attack=own.filter(id=>cards[id].power>0).sort((a,b)=>cards[b].power-cards[a].power)[0],heal=unit.heals[0];
 assert(attack);
 const equipped=[attack,heal],extra=forced||own.find(id=>!equipped.includes(id));if(extra)equipped.push(extra);
 assert(equipped.reduce((s,id)=>s+cards[id].cost,0)<=r.run(`skillCostLimitFor(by(${JSON.stringify(unit.id)}),{level:30})`));
 for(const sid of equipped)assert(r.run(`isSkillAllowedForMonster(${JSON.stringify(sid)},by(${JSON.stringify(unit.id)}))`));
 return equipped;
}
for(const unit of oldHealers){
 for(const version of ['baseline','current'])cases.push({version,unit:unit.id,build:'healer_reference',level:30,equipped:oldHealerBuild(unit,null),...boss});
 for(const forced of ['skill_character_common_poison','skill_character_common_debuff'])cases.push({version:'current',unit:unit.id,build:forced,level:30,equipped:oldHealerBuild(unit,forced),...boss});
}
const results=[];
function summarize(rows){const wins=rows.filter(x=>x.outcome==='victory').length;return {n:rows.length,wins,winRate:wins/rows.length,capped:rows.filter(x=>x.outcome==='capped').length,meanTurns:rounded(mean(rows.map(x=>x.turns))),maxTurns:Math.max(...rows.map(x=>x.turns))};}
// Explicit, source-preserving diagnostic for a proposed Bordo healing change.
// This mode prints results and does not replace the committed full-audit report.
async function healingProbe(){
 const pattern=/("skill_character_bordo_4_02",\{)"heal":\{"flat":\d+,"perLevel":[\d.]+\}/g;
 assert.equal([...currentSources.data.matchAll(pattern)].length,1,'candidate must match exactly one heal');
 const proposalSources={...currentSources,data:currentSources.data.replace(pattern,'$1"heal":{"flat":45,"perLevel":3}')};
 const candidateSources={...currentSources,data:currentSources.data.replace(pattern,'$1"heal":{"flat":40,"perLevel":1.5}')};
 const probeRunners={initial_proposal:makeRunner(proposalSources),final_heal:makeRunner(candidateSources)},probeResults=[];
 const probeCases=[];
 for(const version of ['initial_proposal','final_heal'])for(const forced of [null,'skill_character_common_poison','skill_character_common_debuff'])probeCases.push({version,unit:'character_bordo_4',build:forced||'default',equipped:forced?buildFor('character_bordo_4',30,forced):null});
 for(const c of probeCases){
  const b=probeRunners[c.version],rows=[];
  for(let i=0;i<trials;i++){
   b.r.run('tacticalAuditPicks={};tacticalAuditSupportStreak=0;');
   rows.push(await b.battle({party:[c.unit],level:30,...boss,mode:'single',policy:'tactical',cap,...(c.equipped?{equipped:[c.equipped]}:{})},seed+i));
  }
  probeResults.push({...c,...summarize(rows),outcomes:rows.map(x=>[x.outcome,x.turns])});
 }
 return {candidate:{from:{flat:45,perLevel:3},to:{flat:40,perLevel:1.5},proposalDataHash:sha(proposalSources.data),finalDataHash:sha(candidateSources.data),method:'Only Bordo stage-4 heal metadata is temporarily overridden; the current engine and other skills are identical.'},seed,trialsPerCase:trials,battleCount:probeCases.length*trials,results:probeResults};
}
if(process.argv.includes('--boss-probe')){console.log(JSON.stringify(await healingProbe(),null,2));process.exit(0);}
for(const [caseIndex,c] of cases.entries()){
 const b=runners[c.version],rows=[],selectionCounts={};
 for(let i=0;i<trials;i++){
  b.r.run('tacticalAuditPicks={};tacticalAuditSupportStreak=0;');
  const config={party:[c.unit],level:c.level,map:c.map,difficulty:c.difficulty,enemy:c.enemy,mode:'single',policy:'tactical',cap,...(c.equipped?{equipped:[c.equipped]}:{})};
  const row=await b.battle(config,seed+i);rows.push(row);
  for(const [id,count] of Object.entries(b.r.run('tacticalAuditPicks')))selectionCounts[id]=(selectionCounts[id]||0)+count;
 }
 results.push({...c,...summarize(rows),selectionCounts,trialOutcomes:rows.map(row=>[row.outcome,row.turns])});
 if((caseIndex+1)%60===0)console.log(`tactical balance ${caseIndex+1}/${cases.length} cases`);
}
const key=c=>[c.unit,c.level,c.enemy,c.difficulty].join('/');
const old=new Map(results.filter(c=>c.version==='baseline').map(c=>[key(c),c]));
const comparisons=results.filter(c=>c.version==='current'&&c.build==='default').map(c=>{const before=old.get(key(c));return {case:key(c),winRateBefore:before.winRate,winRateAfter:c.winRate,winRateDelta:rounded(c.winRate-before.winRate),turnsBefore:before.meanTurns,turnsAfter:c.meanTurns,cappedBefore:before.capped,cappedAfter:c.capped};});
const currentDefault=new Map(results.filter(c=>c.version==='current'&&['default','healer_reference'].includes(c.build)).map(c=>[key(c),c]));
const variants=results.filter(c=>c.version==='current'&&!['default','healer_reference'].includes(c.build)).map(c=>{const base=currentDefault.get(key(c));return {case:key(c),build:c.build,winRate:c.winRate,winRateDelta:rounded(c.winRate-base.winRate),meanTurns:c.meanTurns,turnsDelta:rounded(c.meanTurns-base.meanTurns),capped:c.capped,forcedCardSelections:c.build==='inherited'?null:c.selectionCounts[c.build]||0};});
const warnings=[];
const capped=results.filter(c=>c.capped);
if(capped.length)warnings.push({kind:'capped',message:'A battle reached the diagnostic cap; inspect healing/stall behavior. This is not counted as victory.',cases:capped.map(c=>({case:key(c),version:c.version,build:c.build,capped:c.capped}))});
const shifts=comparisons.filter(c=>Math.abs(c.winRateDelta)>=.375);
if(shifts.length)warnings.push({kind:'largeDefaultShift',message:'At least a 37.5 percentage point difference in a small seeded sample; directional diagnostic, not statistical proof.',cases:shifts});
const commonNeverPicked=common.filter(id=>variants.filter(v=>v.build===id).every(v=>v.forcedCardSelections===0));
if(commonNeverPicked.length)warnings.push({kind:'unselectedCommon',message:'The diagnostic policy never selected these equipped common skills. This suggests marginal utility or an AI blind spot; it does not prove human uselessness.',ids:commonNeverPicked});
const healingAdjustment=await healingProbe();
const sourceChanged=files.filter(f=>sha(fs.readFileSync(new URL(`js/${f}.js`,root),'utf8'))!==sha(currentSources[f]));
assert.equal(sourceChanged.length,0,`Source changed during audit: ${sourceChanged.join(', ')}; rerun on stable input.`);
const report={metadata:{baselineCommit:baseRef,currentGitHead:git('rev-parse','HEAD').trim(),seed,seeds:Array.from({length:trials},(_,i)=>seed+i),trialsPerCase:trials,caseCount:cases.length,battleCount:cases.length*trials,cap,node:process.version,sourceHashes:Object.fromEntries(Object.entries({baseline:baselineSources,current:currentSources}).map(([version,sources])=>[version,Object.fromEntries(Object.entries(sources).map(([file,text])=>[file,sha(text)]))])),sourceChangedDuringRun:false},limitations:['Single-character, single-enemy fights; no items, links, voluntary switching, healing-half or map-boost conditions.','Three fixed regular encounters; Lv3 and Lv30 are player levels, enemies use their actual Normal/Hard fixed level. Extreme boss is Lv100 and entered directly for combat testing; the world-event gate is not a progression test.','Default means that form\'s own initial loadout, not a naturally evolved save retaining an earlier loadout. Variant builds assume the corresponding cards have already been acquired.','Tactical heuristic models major effect values approximately and is shared by old/new versions; it is not optimal play. Two consecutive non-healing support selections are capped to avoid artificial guard/buff loops.','Eight paired seeds per case identify gross changes; report full outcomes, do not interpret percentages as precise population win rates.','Static dominance ignores COST only at Lv100 and reports conservative same-element plain attacks; it does not establish the best three-card build.'],staticFamilies,commonVariants:variants,defaultComparisons:comparisons,warnings,results};
report.healingAdjustment=healingAdjustment;
report.metadata.healingProbeBattleCount=healingAdjustment.battleCount;
report.metadata.totalBattleCount=report.metadata.battleCount+healingAdjustment.battleCount;
fs.writeFileSync(new URL('docs/character-tactical-balance.json',root),JSON.stringify(report)+'\n');
const aggregate=version=>summarize(results.filter(c=>c.version===version&&c.build==='default'&&c.difficulty!=='extreme').flatMap(c=>c.trialOutcomes.map(([outcome,turns])=>({outcome,turns}))));
const pct=n=>`${(n*100).toFixed(1)}%`;
const familyNames={brigitte:'ブリジット',tobia:'トビア',roden:'ローデン',selene:'セレネ',safira:'サフィラ',bordo:'ボルド',lize:'リゼ',regus:'レグス',remnes:'レムネス',nico:'ニコ',mireille:'ミレーユ',noam:'ノアム'};
const effectNames={debuff:'弱体',guard:'防御',cleanse:'状態治療',charge:'溜め',status:'状態付与',buff:'強化',bonus:'条件威力',dispel:'強化解除',heal:'回復',recoil:'反動',drain:'吸収'};
const buildNames={default:'初期装備',skill_character_common_poison:'毒針を装備',skill_character_common_debuff:'威圧を装備'};
const familyRows=staticFamilies.map(f=>{
 const summary=version=>{
  const cases=results.filter(c=>c.version===version&&c.build==='default'&&c.difficulty!=='extreme'&&c.unit.startsWith(`character_${f.family}_`));
  return cases.reduce((s,c)=>s+c.wins,0)/cases.reduce((s,c)=>s+c.n,0);
 };
 return `| ${familyNames[f.family]||f.family} | ${pct(summary('baseline'))} | ${pct(summary('current'))} | ${f.effects.map(x=>effectNames[x]||x).join('・')} |`;
});
const md=[
 '# キャラクター技調整・限定バランス比較',
 '',
 `旧 main \`${baseRef}\` と作業ソースを比較。${cases.length}条件 × ${trials}種の固定シード = **${cases.length*trials}戦**、ご馳走の変更理由を再現する追加${healingAdjustment.battleCount}戦を含め合計 **${report.metadata.totalBattleCount}戦**。全ソースのSHA-256、装備、各試行結果、技選択回数は [JSON](character-tactical-balance.json) に記録。`,
 '',
 '## 条件',
 '',
 '- 追加12系統の★2／★4をLv3・Lv30で比較。Normalのスライムゴールド、Normalのソーンビート、Hardのゴーレムが対象。敵はゲーム本来の固定レベルを使用。',
 '- ブリジット・セレネ・ボルド・レグスで、進化前の技を含む装備と共通6技の差し替えを検査。★2のLv3と★4のLv3／30を含む。3枠とCOST上限を遵守。',
 '- 同4系統の★4・Lv30で、Extremeの滅亡の星ネメシオン（Lv100）を追加比較。イベント出現・到達条件を通した攻略試験ではなく、ボス戦を直接開始する。',
 '- 既存14体のうち既存回復カードを装備できる6体（エリシア3形態、ステラ3形態）も、Lv30でボス戦を比較。専用攻撃＋既存回復を土台に、共通毒・威圧の有無を確認する。',
 '- 回復、吸収、毒・麻痺、強化、弱体、防御、条件威力を読む共通の簡易AIを使用。2回連続の回復以外の補助選択を抑制する。最適操作の証明ではない。',
 '- 1体戦のみ。アイテム・ココロリンク・任意交代・地形強化・回復半減条件は使用しない。初期装備はその形態の初期3技で、自然進化後に残る旧装備とは区別する。',
 '',
 '## 結果',
 '',
 `通常3遭遇・初期装備では旧 ${pct(aggregate('baseline').winRate)} → 新 ${pct(aggregate('current').winRate)}。新技全体で一律に強くなる結果ではない。一方で、固定の敵属性・少ないシード数に影響されるため、この平均だけでゲーム全体の公平さは断定できない。`,
 '',
 '| 系統 | 旧勝率 | 新勝率 | 新しい効果の種類 |',
 '|---|---:|---:|---|',
 ...familyRows,
 '',
 '## ご馳走の再調整',
 '',
 '当初の「45＋Lv×3」回復では、Lv30ボルドが共通毒・威圧との組合せでLv100ボスを突破した。この相互作用を抑えるため「40＋Lv×1.5」（Lv30で135→85回復）へ変更した。下表は本編ソースを変えず、回復の設定値だけを差し替えた同一シードの比較。',
 '',
 '| 回復候補 | 構成 | 勝利数 | 120T打切り |',
 '|---|---|---:|---:|',
 ...healingAdjustment.results.map(c=>`| ${c.version==='initial_proposal'?'45＋Lv×3':'40＋Lv×1.5'} | ${buildNames[c.build]||c.build} | ${c.wins}/${c.n} | ${c.capped}/${c.n} |`),
 '',
 '勝利の抑制は確認したが、威圧と回復を繰り返す膠着は残る。これは既存回復を装備できる旧キャラクターにも発生するため、永続弱体・回復・ボス側の圧力を含む今後の全体調整事項とする。今回、その全体ルールは変更していない。',
 '',
 '## 要監視項目',
 '',
 ...warnings.map(w=>`- **${({capped:'長期戦の打切り',largeDefaultShift:'初期装備の大きな変化',unselectedCommon:'選ばれなかった共通技'})[w.kind]}**：${w.cases?.length||w.ids?.length||0}条件。${({capped:'回復優先のAIによる膠着を含む。勝利とは数えない。',largeDefaultShift:'旧新の勝率差が37.5ポイント以上。8シードの粗い診断なので、個別の属性相性と編成を追加確認する余地がある。',unselectedCommon:'簡易AIが選択しなかった。人の操作でも無価値だと証明する結果ではない。'})[w.kind]}`),
 `- COSTが十分になるLv100では、ローデン・サフィラ・レムネスの一部の低威力基本技に同属性上位候補がある（保守的判定 ${staticFamilies.reduce((s,f)=>s+f.potentialLateGameDominance.length,0)}組）。低COSTの利点は序盤に寄る。全9技を全レベルで同価値にしたという意味ではない。`,
 '- 共通技は全ての★4専用技より優れる設計ではない。共通の捨て身打ちは低段階で選ばれ、今回の★4では選ばれない場合がある。',
 '- ボス戦の回復＋弱体／毒には特に注意。下表は今回の構成で勝利した条件をすべて列挙する。低Lvで勝てたことを適切とみなすかは、ボスの想定到達段階と併せて判断する。',
 '',
 '| ボス戦の構成 | 勝利数 | 平均ターン |',
 '|---|---:|---:|',
 ...(results.some(c=>c.difficulty==='extreme'&&c.wins>0)?results.filter(c=>c.difficulty==='extreme'&&c.wins>0).map(c=>`| ${c.unit}／${c.build} | ${c.wins}/${c.n} | ${c.meanTurns} |`):['| 該当なし | 0 | — |']),
 '',
 `120ターン打切りは勝利に数えない。AIが回復を優先して長期戦になる可能性を含むため、打切りをエンジンの無限ループと同一視しない。${trials}シードの勝率を精密な母集団勝率と解釈しない。`,
 '',
 '## 再現',
 '',
 '```sh',
 'node scripts/analyze-character-tactical-balance.mjs',
 '```',
 '',
 'このスクリプトは既存の tools/balance-audit と docs/balance-audit を変更せず、今回の2つのレポートだけを書き出す。',
 ''
].join('\n');
fs.writeFileSync(new URL('docs/character-tactical-balance.md',root),md);
console.log(JSON.stringify({battleCount:report.metadata.battleCount,totalBattleCount:report.metadata.totalBattleCount,baseline:aggregate('baseline'),current:aggregate('current'),warnings:warnings.map(w=>({kind:w.kind,count:w.cases?.length,ids:w.ids})),potentialLateGameDominance:staticFamilies.reduce((n,f)=>n+f.potentialLateGameDominance.length,0)},null,2));
