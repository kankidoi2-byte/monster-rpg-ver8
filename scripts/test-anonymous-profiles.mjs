import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync(new URL('../js/profiles.js',import.meta.url),'utf8');
function tab(storage,session=new Map(),fail=false){const alerts=[];let reloads=0;const ctx=vm.createContext({crypto:webcrypto,console,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('quota');storage.set(k,v);},removeItem:k=>storage.delete(k)},sessionStorage:{getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v)},alert:x=>alerts.push(x),location:{reload:()=>reloads++},document:{getElementById:()=>null},addEventListener:()=>{}});vm.runInContext(source,ctx);return {p:ctx.MonsterProfiles,ctx,alerts,reloads:()=>reloads,session};}
const storage=new Map([['mb_v95c','existing'],['mb_v95c_lastKnownGood','backup']]);
const one=tab(storage);assert.equal(one.p.slot(),1);assert.equal(one.p.key('mb_v95c'),'mb_v95c');assert.equal(storage.get('mb_v95c'),'existing');assert.equal(storage.get('mb_v95c_lastKnownGood'),'backup');assert.equal(one.p.current().consent,false);
assert(one.p.rename('本プレイ'));assert(one.p.switchTo(2));assert.equal(one.reloads(),1);
const two=tab(storage,one.session);assert.equal(two.p.slot(),2);assert.equal(two.p.key('mb_v95c'),'mb_v95c_profile2');assert.equal(two.p.key('mb_v95c_lastKnownGood'),'mb_v95c_profile2_lastKnownGood');assert.equal(storage.get(two.p.key('mb_v95c')),undefined);assert.notEqual(two.p.current().id,one.p.current().id);
assert(two.p.beforeSave());storage.set(two.p.key('mb_v95c'),'second-save');two.p.afterSave('second-save');assert(two.p.beforeSave());assert.equal(storage.get('mb_v95c'),'existing');
const same=tab(storage,two.session);storage.set(two.p.key('mb_v95c'),'newer');assert.equal(same.p.beforeSave(),false);assert(same.alerts.length);
const slot1session=new Map([['mb_profile_tab_v1','1']]);const separate=tab(storage,slot1session);assert(separate.p.beforeSave(),'writes in slot2 must not conflict with slot1');
const oldId=separate.p.current().id;const reload=tab(storage,slot1session);assert.equal(reload.p.current().id,oldId);assert.equal(reload.p.current().name,'本プレイ');assert(!reload.p.rename('   '));
vm.runInContext('busy=true',two.ctx);assert.equal(two.p.switchTo(1),false,'block switching during an active operation');
const broken=tab(new Map([['mb_profiles_v1','{bad'],['mb_v95c','valuable']]));assert.equal(broken.p.available(),false);assert.equal(broken.p.beforeSave(),false);
const quotaStorage=new Map([['mb_v95c','valuable']]);const quota=tab(quotaStorage,new Map(),true);assert.equal(quota.p.available(),false);assert.equal(quotaStorage.get('mb_v95c'),'valuable');
console.log('Anonymous profiles: preservation, separation, reload, conflicts, busy guard, corrupt metadata, quota PASS');
