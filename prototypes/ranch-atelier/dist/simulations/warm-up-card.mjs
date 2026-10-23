// Shown while the sandbox compiles every tile's shaders at startup. It offers Grace's Basement as the
// waiting game and says so with a small toast when everything is ready. Styled like the app's other toasts.
const GAME='/studies/basement/play.html?embed=1';
const STYLE=`#warm-up{position:fixed;z-index:1000;left:50%;bottom:20px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;background:var(--app-ink,#2b2118);color:var(--app-paper,#fbf4e4);border-radius:10px;padding:4px 8px;font:12px var(--app-font,system-ui,sans-serif);box-shadow:0 6px 24px #0005;max-width:calc(100vw - 24px)}
#warm-up[hidden]{display:none}#warm-up progress{width:48px;height:5px;accent-color:#e0a84a}#warm-up .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}#warm-up button svg{width:14px;height:14px;display:block;fill:currentColor}#warm-up button{padding:4px 8px!important}
#warm-up button{font:inherit;color:inherit;background:#ffffff1f;border:1px solid #ffffff55;border-radius:8px;padding:5px 10px;cursor:pointer}
#warm-up-game{position:fixed;inset:0;z-index:999;background:#000;display:flex;flex-direction:column}#warm-up-game[hidden]{display:none}
#warm-up-game iframe{flex:1;border:0;width:100%}`;
export function createWarmUpCard(){
 const style=document.createElement('style');style.textContent=STYLE;document.head.append(style);
 const card=document.createElement('div');card.id='warm-up';card.setAttribute('role','status');card.setAttribute('aria-live','polite');card.hidden=true;
 const label=document.createElement('span'),bar=document.createElement('progress'),play=document.createElement('button'),back=document.createElement('button');
 play.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z"/></svg>';play.setAttribute('aria-label',"Play Grace's Basement while you wait");play.title="Play Grace's Basement while you wait";back.textContent='Back';back.setAttribute('aria-label','Back to the ranch');label.className='sr';back.hidden=true;bar.max=1;bar.value=0;
 card.append(label,bar,play,back);document.body.append(card);
 let frame=null,open=false,ready=false,timer=0;
 const show=()=>{if(!frame){frame=document.createElement('div');frame.id='warm-up-game';const f=document.createElement('iframe');f.title="Grace's Basement";f.allow='autoplay;fullscreen';f.src=GAME;frame.append(f);document.body.append(frame);}frame.hidden=false;frame.firstChild.contentWindow?.postMessage({type:'resume'},'*');open=true;play.hidden=true;back.hidden=!ready;card.hidden=false;card.style.zIndex=1001;};
 const hide=()=>{if(frame){frame.hidden=true;frame.firstChild?.contentWindow?.postMessage({type:'pause'},'*');}open=false;back.hidden=true;};
 play.onclick=show;back.onclick=()=>{hide();card.hidden=true;};
 addEventListener('message',e=>{if(e.data?.event==='quit'&&open)back.onclick();});
 return {
  step(done,total,id){if(ready)return;card.hidden=false;label.textContent=done<total?'Getting your tiles ready':'Almost ready';bar.max=total;bar.value=done;},
  finish(ok){
   ready=true;bar.hidden=true;play.hidden=true;label.className='';label.textContent=ok?'Ready':'Ready';
   if(open){back.hidden=false;return;}
   card.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{if(!open)card.hidden=true;},4000);
  },
 };
}
