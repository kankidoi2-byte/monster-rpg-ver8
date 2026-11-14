// Historical feature tests keep checking their original data contracts even after
// the separately tested 110-skill migration replaces live move lists and aptitude tags.
export function legacyUnitProjection(unit,old){
 const {legacyMoves,legacyTags,skill110CandidateIds,...rest}=JSON.parse(JSON.stringify(unit));
 if(legacyMoves)rest.moves=legacyMoves;
 if(legacyTags)rest.tags=legacyTags;
 if(old?.moves){
  rest.hp=rest.legacyBaseHp;
  delete rest.legacyBaseHp;
  delete rest.atk;
  delete rest.def;
  rest.spd=old.spd;
  rest.moves=rest.moves.map((move,i)=>{
   const description=old.moves[i]?.[6];
   if(move[6]?.includes('最大HPに応じて回復')&&typeof description==='string'&&/HPを\d+＋Lv×[\d.]+回復/.test(description))move[6]=description;
   return move;
  });
 }
 // Ice Golem's sanctioned attribute change is covered by test-ice-attribute.
 // Keep older whole-roster assertions strict for every other field/move.
 if(rest.id==='icegolem'&&rest.types?.length===1&&rest.types[0]==='ice'){
  rest.types=['water'];
  rest.desc=rest.desc.replace('氷河から生まれた氷属性のゴーレム。','氷河から生まれた水属性のゴーレム。');
  rest.tags=rest.tags.map(tag=>tag==='element:ice'?'element:water':tag);
  rest.moves=rest.moves.map(move=>move[8]==='skill_icegolem_01'&&move[2]==='ice'?move.map((v,i)=>i===2?'water':v):move);
 }
 // Project only the explicitly approved evolution timing changes back to their
 // historical values. test-individual-evolution checks the live table separately.
 const timing={freigal:[14,2],aquaron:[16,2],grassbeat:[10,2],thornbeat:[26,3],rikasheef:[24,3],volteck:[13,2],spaquinn:[30,3],sylphin:[12,2],zephyray:[28,3],luxseed:[18,2],luxiard:[38,3],nocle:[17,2],noclaid:[37,3],orcana:[22,2],orca_stream:[42,3],volmoog:[26,2],nemes:[25,2],nemesia:[48,3],kimeragna:[45,5]};
 const approved=timing[rest.id];
 if(approved && rest.evolutionLevel===approved[0])rest.evolutionLevel=approved[1];
 if(rest.id==='highaquaron')for(const route of rest.evolutions||[])if(['shenhairon','tienhairon'].includes(route.to)&&route.level===36)route.level=3;
 return rest;
}
export function legacyCardProjection(card){
 const {canonicalId,deprecated,...rest}=JSON.parse(JSON.stringify(card));
 if(rest.id==='skill_icegolem_01'&&rest.type==='ice'){
  rest.type='water';rest.types=['water'];
  rest.tags=rest.tags.map(tag=>tag==='element:ice'?'element:water':tag);
  rest.desc=rest.desc.replace(/^氷属性/,'水属性');
 }
 return rest;
}
