import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parse} from 'acorn';
const source=fs.readFileSync(new URL('../js/tutorial.js',import.meta.url),'utf8');
const names=new Set(['tutorialVisibleBounds','scrollTutorialTargetBy','ensureTutorialTargetVisible','tutorialTargetGuideClearance']);
const helpers=parse(source,{ecmaVersion:'latest'}).body.filter(n=>n.type==='FunctionDeclaration'&&names.has(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');
function scenario({height=640,top=550,targetHeight=60,navTarget=false,hidden=false,nested=false,sticky=false}={}){
 let y=top,scrolls=0;
 const rect=(top,height)=>({left:20,right:340,width:320,top,bottom:top+height,height});
 const body={},header={getBoundingClientRect:()=>rect(0,60)},battle={getBoundingClientRect:()=>rect(height-100,100)};
 const nav={getBoundingClientRect:()=>rect(height-78,78),contains:()=>navTarget,querySelector:()=>battle};
 const move=({top})=>{y-=top;scrolls++};
 const sheet={parentElement:body,scrollHeight:1000,clientHeight:400,scrollBy:move};
 const status={getBoundingClientRect:()=>rect(64,66),contains:()=>false};
 const target={parentElement:nested?sheet:body,getBoundingClientRect:()=>rect(y,targetHeight),closest:selector=>sticky&&selector==='#expedition'?{}:null,scrollIntoView(){y=height/2-targetHeight/2;scrolls++}};
 const c=vm.createContext({document:{body,querySelector:s=>s==='.app-topbar'?header:s==='.app-bottom-nav'?nav:s==='#expedition .expedition-status'?status:null},window:{innerHeight:height,innerWidth:360,scrollBy:move},getComputedStyle:el=>({visibility:hidden&&[nav,battle].includes(el)?'hidden':'visible',overflowY:el===sheet?'auto':'visible',position:el===status?'sticky':'static',top:'64px'}),tutorialCurrentStepId:()=>null});
 vm.runInContext(helpers,c);c.target=target;vm.runInContext('ensureTutorialTargetVisible(target)',c);
 return {rect:target.getBoundingClientRect(),scrolls,bounds:vm.runInContext('tutorialVisibleBounds(target)',c)};
}
for(const height of [640,780]){
 const r=scenario({height,top:height-110});
 assert(r.scrolls>0);assert(r.rect.top>=68);assert(r.rect.bottom<=height-108,'include protruding battle control');
 const already=scenario({height,top:150});assert.equal(already.scrolls,0);
 const header=scenario({height,top:10});assert(header.rect.top>=68);
 const nav=scenario({height,top:height-70,navTarget:true});assert.equal(nav.scrolls,0,'navigation itself stays tappable without scrolling');
 const sheet=scenario({height,top:height-20,nested:true});assert(sheet.rect.bottom<=height-108,'correct the nearest scroll container');
}
assert(scenario({top:80,sticky:true}).rect.top>=138,'sticky expedition status must not intercept target centers');
assert.equal(scenario({top:550,hidden:true}).scrolls,0,'hidden sheet chrome is not an occluder');
const party=fs.readFileSync(new URL('../js/party.js',import.meta.url),'utf8');
const guard=parse(party,{ecmaVersion:'latest'}).body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='rosterSheetCloseBlocked');
for(const step of ['growth_skill_open','growth_elna_details','expedition_member',null]){
 const c=vm.createContext({tutorialCurrentStepId:()=>step});vm.runInContext(party.slice(guard.start,guard.end),c);
 assert.equal(vm.runInContext('rosterSheetCloseBlocked()',c),step==='growth_skill_open');
}
console.log('PASS tutorial visibility: fixed header/nav/protruding battle button, hidden chrome, nested scroll, stable visible targets, navigation targets, scoped sheet guard.');

const geometry=vm.createContext({});vm.runInContext(helpers,geometry);
for(const guideHeight of [320,330,340,350]){
 const clearance=vm.runInContext(`tutorialTargetGuideClearance(206,391,${guideHeight})`,geometry);
 assert(391-clearance-16>=guideHeight,'CI 360px expedition card must fit the guide without alternating between edges');
}
