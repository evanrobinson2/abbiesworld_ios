// The toolbar's "Talk" button. Tiny on purpose: live mode's code, the microphone and the AI
// session load only when someone taps it.
export function mountLiveButton({ensureStage}){
 const spacer=document.querySelector('header .toolbar-spacer');if(!spacer||document.getElementById('live-toggle'))return;
 const button=document.createElement('button');button.id='live-toggle';button.title='Talk to the world';button.setAttribute('aria-label','Talk to the world');button.setAttribute('aria-pressed','false');
 button.innerHTML='<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 320a80 80 0 0 0 80-80V112a80 80 0 0 0-160 0v128a80 80 0 0 0 80 80m144-112a16 16 0 0 0-16 16v16a128 128 0 0 1-256 0v-16a16 16 0 0 0-32 0v16a160 160 0 0 0 144 159.2V448h-48a16 16 0 0 0 0 32h128a16 16 0 0 0 0-32h-48v-48.8A160 160 0 0 0 416 240v-16a16 16 0 0 0-16-16"/></svg><span class="button-label">Talk</span>';
 spacer.after(button);
 let live=null,busy=false;
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;
  try{
   if(live?.active){live.stop('You ended live mode.');return;}
   // The AudioContext must be created inside the tap for iOS to allow sound.
   const audio=new (window.AudioContext||window.webkitAudioContext)();audio.resume();
   const [{startLive},stage]=await Promise.all([import('./live.mjs'),ensureStage()]);
   live=await startLive({stage,audio,button});
  }catch(e){console.warn('[live]',e);}
  finally{busy=false;}
 });
}
