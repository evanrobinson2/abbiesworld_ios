// Effects arrive through the single throwable; PARTY and DISCO are independent persistent modes.
import {createWorldEffects} from './world-effects.mjs';
import {createCelebrationModes} from './celebration-modes.mjs';
export function mountTownEvents({THREE,scene,camera,controls,renderer,heightAt}) {
 const fx=createWorldEffects({T:THREE,scene,orbit:controls,camera,canvas:renderer.domElement,heightAt,clock:()=>({day:0,hour:performance.now()/1000/360*24})});
 const modes=createCelebrationModes({T:THREE,scene,camera,orbit:controls,canvas:renderer.domElement,heightAt});
 const play=e=>{const d=e.detail;if(d?.at&&fx.has(d.id))fx.play(d.id,d.at);};
 addEventListener('ranch:play-event',play);
 let mounted=false;
 const mount=()=>{if(mounted||!window.AWHud)return;mounted=true;modes.mount(window.AWHud.effects);};
 mount();addEventListener('aw-hud-ready',mount,{once:true});
 return {fx,modes,buttons:modes.buttons,dispose(){removeEventListener('aw-hud-ready',mount);removeEventListener('ranch:play-event',play);modes.dispose();fx.clear();}};
}
