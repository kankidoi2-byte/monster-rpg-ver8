import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';

const source=fs.readFileSync(new URL('../js/profiles.js',import.meta.url),'utf8');
const PICK='mb_profile_tab_v1';
function open(storage,session=new Map(),{failSession=false,failMeta=false}={}){
  const alerts=[];
  const context=vm.createContext({crypto:webcrypto,console:{error(){}},
    localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(failMeta&&k==='mb_profiles_v1')throw Error('metadata quota');storage.set(k,v);}},
    sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>{if(failSession)throw Error('session quota');session.set(k,v);}},
    alert:x=>alerts.push(x),location:{reload(){}},document:{getElementById:()=>null},addEventListener(){}});
  vm.runInContext(source,context);
  return {p:context.MonsterProfiles,session,context,alerts};
}
let cases=0;
for(const initial of [1,2]){
  const storage=new Map([['mb_v95c','slot-one-progress'],['mb_v95c_profile2','slot-two-progress']]);
  const seed=open(storage);
  if(initial===2)assert(seed.p.switchTo(2));
  const first=open(storage);
  assert.equal(first.p.slot(),initial);
  const firstId=first.p.current().id;
  const second=open(storage);
  assert(second.p.switchTo(initial===1?2:1));
  const reload=open(storage,first.session);
  assert.equal(reload.p.slot(),initial,'another tab must not select this tab’s profile on reload');
  assert.equal(reload.p.current().id,firstId);
  assert.equal(storage.get(reload.p.key('mb_v95c')),initial===1?'slot-one-progress':'slot-two-progress');
  assert(reload.p.beforeSave());
  assert.equal(open(storage).p.slot(),initial===1?2:1,'a genuinely new tab still follows the selected default');
  cases++;
}
{
  const storage=new Map();open(storage);
  const unavailable=open(storage,new Map(),{failSession:true});
  assert.equal(unavailable.p.available(),false,'do not allow saving when tab identity cannot be pinned');
  assert.equal(unavailable.p.beforeSave(),false);
  cases++;
}
for(const initial of [1,2]){
  const storage=new Map();const seed=open(storage);
  if(initial===2)assert(seed.p.switchTo(2));
  const tab=open(storage,new Map(),{failMeta:true});
  assert.equal(tab.p.switchTo(initial===1?2:1),false);
  assert.equal(open(storage,tab.session).p.slot(),initial,'failed metadata write must not switch the tab on reload');
  cases++;
}
for(const initial of [1,2]){
  const storage=new Map();const seed=open(storage);
  if(initial===2)assert(seed.p.switchTo(2));
  const tab=open(storage);const before=JSON.stringify([...storage]);
  tab.context.sessionStorage.setItem=()=>{throw Error('session quota');};
  assert.equal(tab.p.switchTo(initial===1?2:1),false);
  assert.equal(open(storage,tab.session).p.slot(),initial);
  assert.equal(JSON.stringify([...storage]),before,'failed session write restores the shared preference');
  cases++;
  const retry=open(storage,tab.session);
  retry.context.location.reload=()=>{throw Error('reload blocked');};
  assert.equal(retry.p.switchTo(initial===1?2:1),true);
  assert.equal(open(storage,retry.session).p.slot(),initial===1?2:1);
  assert(retry.alerts.some(x=>x.includes('保存済み')));
  cases++;
}
console.log(`Profile reload isolation: ${cases} cases PASS`);
