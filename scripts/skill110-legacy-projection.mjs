// Historical feature tests keep checking their original data contracts even after
// the separately tested 110-skill migration replaces live move lists and aptitude tags.
export function legacyUnitProjection(unit){
 const {legacyMoves,legacyTags,skill110CandidateIds,...rest}=JSON.parse(JSON.stringify(unit));
 if(legacyMoves)rest.moves=legacyMoves;
 if(legacyTags)rest.tags=legacyTags;
 return rest;
}
export function legacyCardProjection(card){
 const {canonicalId,deprecated,...rest}=JSON.parse(JSON.stringify(card));
 return rest;
}
