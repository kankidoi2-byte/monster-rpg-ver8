/* Presentation-only helpers. No progress, rewards or save state lives here. */
function createStoryTypewriter(element,text,onComplete){
  const characters=Array.from(String(text??''));
  let cursor=0,timer=null,complete=false,cancelled=false;
  element.textContent='';element.setAttribute('aria-label',characters.join(''));
  const finish=()=>{
    if(cancelled||complete)return;
    clearTimeout(timer);element.textContent=characters.join('');complete=true;
    if(onComplete)onComplete();
  };
  const tick=()=>{
    if(cancelled||!element.isConnected)return;
    element.textContent=characters.slice(0,++cursor).join('');
    if(cursor>=characters.length)finish();else timer=setTimeout(tick,30);
  };
  if(!characters.length)timer=setTimeout(finish,0);else timer=setTimeout(tick,30);
  return {finish,cancel(){cancelled=true;clearTimeout(timer);},isComplete:()=>complete};
}
