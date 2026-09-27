// Owner-only review adapter. Never load this file from the production index.
// Uses the existing accepted volmoog only; candidates remain unregistered.
function qaMapMotion(id, limit=3){
  const map=MAPS.find(m=>m.id===id);
  if(!map||![1,3].includes(limit))return false;
  qaSetup('motion-ally');
  selectedMap=map;
  activeHuntRequest=createHuntRequest(map,enemy,'normal',[]);
  activeHuntRequest.battleMode='single';
  setupBattle();
  if(limit===3){
    ensureMultiBattleDom();
    multiBattle={active:true,finished:false,enemies:[createMultiEnemy(by('volmoog'),'enemy_a'),createMultiEnemy(by('volmoog'),'enemy_b')],pendingMoveIndex:null};
    setMultiBattleLayout(true);setupMultiBattle();
  }
  setBattleIdleLimit(limit);
  qaReport({mapReview:{id:map.id,limit,note:'Visual acceptance pending; one accepted species only'}});
  return true;
}
window.addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const action=e.data?.phase3aAction;
  if(typeof action==='string'&&action.startsWith('map:'))qaMapMotion(action.slice(4));
});
if(typeof qaParams!=='undefined'&&qaParams.has('map'))qaMapMotion(qaParams.get('map'),qaParams.get('limit')==='1'?1:3);
