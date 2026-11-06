// Reproduce the adopted mirror-match experiment against real trait hooks.
import fs from 'node:fs';
import {battleRunner} from '../tools/balance-audit/battles.mjs';
const b=battleRunner(),run=b.r.run;
for(const f of ['traits-data','traits-rewards','traits-battle'])run(fs.readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'));
run(`var auditEnemyLevel=null,auditTrait=null;
const originalSpeciesTraits=traitsForSpecies;
traitsForSpecies=function(ins){return auditTrait===undefined?originalSpeciesTraits(ins):(auditTrait?[auditTrait]:[]);};
const originalHuntLevel=huntLevelFor;huntLevelFor=function(m,d,r){return auditEnemyLevel||originalHuntLevel(m,d,r);};
huntOvertierChance=()=>0;
const originalRandomLevel=huntRandomLevel;huntRandomLevel=function(a,r){return auditEnemyLevel||originalRandomLevel(a,r);};`);
const units=['freiwolf','voltax','orca_abyss'],levels={freiwolf:46,voltax:41,orca_abyss:44},N=Number(process.env.N||150);
async function mirror(type,plus=false,status=null){let wins=0,turns=0,n=0;for(const unit of units){for(let i=0;i<N;i++){
run(`auditTrait=${type?`{type:${JSON.stringify(type)},id:'audit',name:'検証',value:TRAIT_TYPES[${JSON.stringify(type)}].values[${plus?1:0}],plus:${plus},status:${JSON.stringify(status)}}`:'null'};auditEnemyLevel=${levels[unit]};`);
const r=await b.battle({party:[unit],level:40,map:'grassland',difficulty:'d2',enemy:unit,mode:'single',conditions:[],policy:'damage'},7000+i);
n++;turns+=r.turns;if(r.outcome==='victory')wins++;
}}return {winRate:Math.round(wins/n*100),turns:Number((turns/n).toFixed(1))};}
const tests=[['なし',null],['逆境','adversity'],['先制','first_strike'],['属性の極み','stab'],['追い打ち','pursuit'],['連撃','combo'],['貫き','pierce'],['高揚','uplift'],['堅い守り','hard_guard'],['威圧','intimidate'],['再生','regen'],['頑丈','sturdy'],['反撃','counter'],['状態付与:麻痺','inflict','paralysis'],['状態付与:毒','inflict','poison']];
for(const [name,type,status] of tests){const normal=await mirror(type,false,status),plus=type?await mirror(type,true,status):null;console.log(JSON.stringify({name,normal,plus,battlesPerSpecies:N}));}
