import assert from 'node:assert/strict';
import {runtime} from '../tools/balance-audit/runtime.mjs';

const {run}=runtime();
const cases={fire:'火',water:'水',ice:'氷',thunder:'雷',wind:'風',grass:'森',light:'光',dark:'闇',star:'星',dragon:'竜',normal:'無'};
assert.deepEqual(Object.keys(run('TN')),Object.keys(cases),'every supported type is covered');
const chip=(group,key,label)=>'<span class="'+group+'-chip '+group+'-chip--'+key+'">'+label+'</span>';
for(const [key,label] of Object.entries(cases))assert.equal(run('typeChip('+JSON.stringify(key)+')'),chip('type',key,label));
for(const input of ['"unexpected"','"__proto__"','null','"constructor"','"<img>"'])assert.equal(run('typeChip('+input+')'),chip('type','normal','無'));
assert.match(run('skillTypeChips(["fire","water"])'),/class="type-chip-group"/);
assert.equal(run('skillTypeLabel(["water","ice"])'),'水 / 氷');
const statuses={poison:'毒',sleep:'ねむり',paralysis:'麻痺',confusion:'こんらん',freeze:'凍結',burn:'火傷'};
assert.deepEqual(Object.keys(run('BATTLE_STATUS_CHIP_NAMES')).sort(),Object.keys(statuses).sort());
for(const [key,label] of Object.entries(statuses)){
  assert.equal(run('statusChip('+JSON.stringify(key)+',3)'),chip('status',key,label+' 3'));
  assert.equal(run('statusChip('+JSON.stringify(key)+')'),chip('status',key,label));
  assert.equal(run('statusChip('+JSON.stringify(key)+',0)'),chip('status',key,label));
}
assert.equal(run('statusChip("toString",2)'),'');
console.log('PASS type/status chips: all attributes and statuses, turn/no turn, safe fallbacks, and plain prose labels');
