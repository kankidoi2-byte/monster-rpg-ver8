import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const root=new URL('../../',import.meta.url);
export const files=['data','core','save','state','kokoro-link','skills','items','contract-animation','party','progression','character-gacha','skill-gacha','alchemy','battle-view','battle-rules','battle-flow','multi-battle','expedition','world-events','world-map-flow'];
export function runtime(patches={}){
 const elements=new Map(), storage=new Map(), timers=[];
 const node=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},dataset:{},classList:{add(){},remove(){},contains(){return false},toggle(){}},setAttribute(){},querySelectorAll(){return []},scrollIntoView(){}});return elements.get(id)};
 const context=vm.createContext({console,structuredClone,JSON,Date,Math:Object.create(Math),localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document:{getElementById:node,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>node('created'),body:node('body')},vis:m=>m.name,alert(){},confirm:()=>true,setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){}});
 const hashes={};
 for(const file of files){let source=process.env.AUDIT_REF?execFileSync('git',['show',`${process.env.AUDIT_REF}:js/${file}.js`],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}):fs.readFileSync(new URL(`js/${file}.js`,root),'utf8');hashes[file]=crypto.createHash('sha256').update(source).digest('hex');if(patches[file])source=patches[file](source);vm.runInContext(source,context,{filename:`js/${file}.js`});}
 const run=s=>vm.runInContext(s,context);
 run(`saveGame=()=>true;show=()=>{};renderParty=()=>{};renderDex=()=>{};renderSkillButtons=()=>{};renderKokoroLinkPanel=()=>{};renderBattleSwitchButton=()=>{};setupBattle=()=>{};setupMultiBattle=()=>{};setMultiBattleLayout=()=>{};update=()=>{};updateMultiBattleView=()=>{};hideBattleOutcome=()=>{};renderSingleBattleContractPanel=()=>{};renderMultiContractPanel=()=>{};processNextEvolution=()=>{};playBattleSkillMotion=async()=>false;playBattleImpact=()=>{};battleMotionDelay=async()=>{};recordWorldMapVictory=()=>{};recordWorldMapBattleResult=()=>{};showBattleOutcome=x=>{auditOutcome={...x,turns:battleTurnCount};};var auditOutcome=null;`);
 return {context,run,hashes,elements,async flush(){for(let i=0;i<100;i++){while(timers.length)await timers.shift()();await Promise.resolve();if(run('auditOutcome!==null||!busy'))return;}throw Error('Unsettled battle action');}};
}
export function seeded(seed){let state=seed>>>0;return ()=>{state=(state+0x6d2b79f5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
