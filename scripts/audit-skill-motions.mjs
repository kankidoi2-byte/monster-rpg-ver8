import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const base='282f774d00e240c599f8542843d7f27a65a49cec';
function load(before){const c=vm.createContext({console});for(const f of ['data','core','battle-view'])vm.runInContext(before?execFileSync('git',['show',`${base}:js/${f}.js`],{encoding:'utf8'}):fs.readFileSync(`js/${f}.js`,'utf8'),c);return c;}
const old=load(true),now=load(false);
const rows=vm.runInContext(`MOVE_CARDS.map(sk=>({id:sk.id,name:sk.name,move:skillToMove(sk.id),deprecated:!!sk.deprecated,form:sk.form,role:sk.power>0?'攻撃':'補助',users:M.filter(m=>m.moves.some(mv=>skillIdFromMove(mv)===sk.id)).map(m=>m.name)}))`,now);
rows.push({id:'(通常攻撃)',name:'通常攻撃',move:['通常攻撃',24,'normal'],role:'攻撃',users:['通常攻撃コマンド・技変換フォールバック']},{id:'(debuff)',name:'弱体化（既存処理の互換経路）',move:['弱体化',0,'dark','debuff'],role:'補助',users:[]});
for(const row of rows){old.mv=row.move;now.mv=row.move;const a=vm.runInContext('skillBattleMotionForMove(mv)',old),b=vm.runInContext('skillBattleMotionForMove(mv)',now),t=vm.runInContext('battleMotionTiming(skillBattleMotionForMove(mv))',now);row.before=a.animated?(row.form==='generic'||row.role==='補助'?'汎用演出':'演出あり（技種別）'):'未対応（被弾表示のみ）';row.beforeForm=a.form;row.afterForm=b.form;row.after=b.animated;row.beforeResultMs=a.animated?vm.runInContext(`BATTLE_MOTION_DURATIONS['${a.form}']`,old):0;row.contactMs=t.contact;row.durationMs=t.duration;delete row.move;}
fs.mkdirSync('docs/skill-impact',{recursive:true});fs.writeFileSync('docs/skill-impact/coverage.json',JSON.stringify({base,rows},null,2)+'\n');
let md=`# 技演出対応一覧\n\n基準 main: ${base}。登録200技（旧装備互換を含む）＋通常攻撃＋弱体化互換経路。モンスターの生技配列も全件照合済み。\n\n「演出あり」は技種別の既存CSS演出、「汎用演出」は名前による共通分類または効果別の補助演出。全技専用画像という意味ではありません。弱体化は登録200技・現在の敵技配列には存在せず、既存処理の互換経路として補完。通常攻撃は意図的に簡素な共通打撃（240ms）とします。\n\n| ID | 技名 | 使用元（原技） | 旧対応 | 演出形 | 旧結果→新命中 ms | 全長 ms |\n|---|---|---|---|---|---|---|\n`;
for(const r of rows)md+=`| ${r.id}${r.deprecated?'（旧装備互換）':''} | ${r.name} | ${r.users.join('、')||'互換処理'} | ${r.before} | ${r.beforeForm===r.afterForm?r.afterForm:r.beforeForm+'→'+r.afterForm} | ${r.beforeResultMs}→${r.contactMs} | ${r.durationMs} |\n`;
md+='\n追加攻撃は独立した登録IDではなく repeat_attack 効果の2撃目。同じ雷撃演出をもう一度再生し、各命中で結果を更新します。吸収・反動・毒・混乱自傷は既存の結果ラベルを保持し、攻撃成功を示す演出を勝手に追加しません。減動設定では移動・点滅を省略し、HP・結果ラベル・履歴を維持します。\n';fs.writeFileSync('docs/skill-impact/coverage.md',md);console.log('Wrote 202 coverage rows');
