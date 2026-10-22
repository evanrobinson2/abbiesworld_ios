import {exportCoreWorld,restoreCoreWorld} from '../simulation/ranch-headless.mjs';
import {createStoryDirector,stageProp,BEAT_TIMEOUT} from './story-director.mjs';
// Before a story plays on screen, play it on a detached copy of the same world with no renderer.
// The live board is untouched; the result says which beats the simulation can really perform.
const HOURS={morning:8,day:12,evening:17.5,night:21};

export function headlessView(core){const c=core.context;return {workers:core.workers,state:core.state,places:c.places,obstacles:c.obstacles,bounds:c.inBoard};}

export function dryRunStory(story,source,{step=.25,budgetMs=1500}={}){
 const started=performance.now(),core=restoreCoreWorld(typeof source.step==='function'?exportCoreWorld(source):source),view=headlessView(core);
 core.state.calendar={...(core.state.calendar||{day:1}),hour:HOURS[story.setting.time]??12};
 const staged=story.props.map(p=>stageProp(p,view)).filter(Boolean),results=[],issues=[];
 let ended=null;
 const director=createStoryDirector(story,{world:()=>view,staged,onBeatDone:(i,beat,{skipped})=>results.push({index:i,skipped,at:core.state.seconds}),onIssue:m=>issues.push(m),onEnd:e=>ended=e,setWeather:w=>{core.state.weatherOverride=w;core.state.weather=w;}});
 director.start();
 const limit=core.state.seconds+story.beats.length*(BEAT_TIMEOUT+5)+10;
 while(!director.finished&&core.state.seconds<limit&&performance.now()-started<budgetMs){core.step(step,step/6,step);director.update();}
 const played=results.filter(r=>!r.skipped).length;
 return {ok:!!ended&&ended.reason==='complete'&&!ended.broken.length,reason:ended?.reason||'out-of-time',played,beats:story.beats.length,skipped:results.filter(r=>r.skipped).map(r=>r.index),broken:ended?.broken||[],issues,propsStaged:staged.length,simSeconds:Math.round(core.state.seconds),ms:Math.round(performance.now()-started)};
}
