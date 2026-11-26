/* Real combat engine, isolated saves; no items, links, evolution or extra grinding. */
import fs from 'node:fs';
import vm from 'node:vm';
import {battleRunner} from '../tools/balance-audit/battles.mjs';
const b=battleRunner(),r=b.r;
for(const f of ['map-story-data','map-story'])vm.runInContext(fs.readFileSync(new URL(`../js/${f}.js`,import.meta.url),'utf8'),r.context);
r.run(`renderBattleInputState=()=>{};showUiNotice=()=>{};
 var storyAuditSwitches=0,storyAuditLostHp=0,originalStoryOutcome=mapStoryOutcome;
 mapStoryOutcome=function(kind,request=activeHuntRequest){
  storyAuditLostHp=partyBattle.reduce((sum,p,i)=>sum+instanceMaxHp(p.inst)-(i===activePartyIdx?pHp:p.hp),0);
  return originalStoryOutcome(kind,request);
 };
 auditSetup=function(c){
  auditOutcome=null;mapStoryUi=null;mapStorySaveRetry=null;storyAuditSwitches=0;storyAuditLostHp=0;
  save=initSave();save.progress.tutorial.status='completed';
  c.party.forEach((id,i)=>{const ins=addInstance(id,c.level);ins.uid='story-audit-'+i;ins.exp=c.exp||0;save.party.push(ins.uid);});
  const episode=mapStoryEpisode(c.episodeId);
  for(const e of GRASSLAND_STORY.episodes){if(e.number<episode.number)mapStoryState().episodes[e.id]={completed:true,firstVictory:true,firstRewardClaimed:true,victoryCount:1};}
  const request=createMapStoryRequest(episode,'audit',save.party);
  mapStoryState().resume={episodeId:episode.id,phase:'battle',nodeId:null,attemptId:'audit',participantUids:save.party,rewardCommitted:false,postPending:false};
  endPartyRecovery();prepareBattleParty();beginChosenBattle('grassland',request.enemyId,'normal',request);
 };
 auditStep=async function(policy){
  const target=multiBattle?.active?aliveMultiEnemies().slice().sort((a,b)=>a.hp-b.hp)[0]:null,def=target?.mon||enemy;
  const score=p=>Math.max(24*typeEff('normal',def.types),...getEquippedMovesForInstance(p.inst).map(m=>m[1]*typeEff(m[2],def.types)));
  const currentScore=score(partyBattle[activePartyIdx]);
  const best=livingPartySwitchCandidates().sort((a,b)=>score(b.entry)-score(a.entry))[0];
  if(policy==='tactical'&&best&&(score(best.entry)>currentScore*1.3||pHp<playerMaxHp()*.2&&best.entry.hp>instanceMaxHp(best.entry.inst)*.5)){
   storyAuditSwitches++;performManualPartySwitch(best.index);return;
  }
  const i=policy==='basic'?-1:auditSelect('tactical');
  if(multiBattle?.active){multiBattle.pendingMoveIndex=i;startMultiBattleTurn(target.id);}else await turn(i);
 };`);
if(process.env.FINAL_ATTACK)r.run('GRASSLAND_STORY.episodes[10].enemies[0].attackMultiplier='+Number(process.env.FINAL_ATTACK));
const episodes=JSON.parse(r.run('JSON.stringify(GRASSLAND_STORY.episodes)'));
const n=100,seed=20261012,median=xs=>xs.slice().sort((a,b)=>a-b)[Math.floor(xs.length/2)];
const results=[];let cumulative=0;
for(const e of episodes){
 let level=1,exp=cumulative;while(exp>=level*60){exp-=level*60;level++;}
 if(process.env.FINAL_ATTACK&&e.number!==11){cumulative+=e.firstReward.exp;continue;}
 for(const baseline of ['A','B']){
  const rows=[];
  for(let trial=0;trial<n;trial++){
   const row=await b.battle({party:['galdra','freigal','aquaron'],level:baseline==='A'?level:8,exp:baseline==='A'?exp:0,episodeId:e.id,policy:e.number<=3?'basic':'tactical',cap:200},seed+trial);
   rows.push({...row,hpLost:r.run('storyAuditLostHp'),switches:r.run('storyAuditSwitches')});
  }
  results.push({episode:e.number,baseline,startLevel:baseline==='A'?level:8,trials:n,wins:rows.filter(x=>x.outcome==='victory').length,capped:rows.filter(x=>x.outcome==='capped').length,turnsMedian:median(rows.map(x=>x.turns)),hpLostMedian:median(rows.map(x=>x.hpLost)),switchesMedian:median(rows.map(x=>x.switches))});
 }
 cumulative+=e.firstReward.exp;
}
const report={seed,trialsPerEpisodeAndBaseline:n,totalBattles:n*results.length,party:['galdra','freigal','aquaron'],policy:'Episodes 1–3: basic attack. Later: choose strongest equipped attack or healing when low, switch for a stronger matchup or low HP. Fixed initial equipped cards; no items, links, evolution or extra training. A receives the preceding first rewards; B is reset to level 8 before each episode.',results};
fs.mkdirSync(new URL('../docs/map-story/',import.meta.url),{recursive:true});
fs.writeFileSync(process.env.FINAL_ATTACK?'/tmp/grassland-final-'+process.env.FINAL_ATTACK+'.json':new URL('../docs/map-story/grassland-balance-20261012.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
