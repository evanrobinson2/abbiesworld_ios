// The welcome tour is built from a list of stops (AW-STUDY-0022, studies/welcome). Evan's rule (2026-10-23): every new
// feature decides whether it goes into the tour. To put it in, register a stop here (or from the feature's own module);
// to leave it out, write "Tour: no" in its brief (docs/design/briefs/feature.md). Hints are the chalk notes that follow
// the tour in real play, and features register those the same way.
//
// A stop:  {id, order, title, line, shot, seconds, find(world)->Object3D|null, run(ctx)->Promise (optional), when(ctx) (optional)}
//   title   the on-screen super, a few words (the 30-second-commercial caption)
//   line    what the narrator says; voice/<id>.mp3 if it has been rendered, the browser's voice otherwise
//   shot    sky | crane | push | follow | orbit | timelapse | card | hero (welcome.mjs, director)
//   find    what the camera looks at; return null and the stop is skipped, so a stop never shows something missing
// A hint:  {id, order, text, doodle, anchor(), when(), done(report)} (welcome.mjs, chalk hints)
const stops=new Map(),hints=new Map();
export function registerTourStop(stop){
 if(!stop?.id||!stop.shot)throw Error('A tour stop needs an id and a shot.');
 stops.set(stop.id,{order:500,seconds:4,...stop});
}
export function registerHint(hint){
 if(!hint?.id||!hint.text)throw Error('A hint needs an id and its chalk words.');
 hints.set(hint.id,{order:500,...hint});
}
export const tourStops=ctx=>[...stops.values()].filter(s=>!s.when||s.when(ctx)).sort((a,b)=>a.order-b.order);
export const tourHints=()=>[...hints.values()].sort((a,b)=>a.order-b.order);

// Things in the world, found by what they are (names and userData the ranch already carries).
const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
export function findIn(world,test){let hit=null;world?.traverse(o=>{if(!hit&&test(o)&&visible(o))hit=o;});return hit;}
const species=(...names)=>world=>{for(const n of names){const o=findIn(world,o=>o.userData?.articulation?.species===n);if(o)return o;}return null;};
const named=name=>world=>findIn(world,o=>o.name===name);

// The core tour: about thirty seconds, like a commercial. Build, come alive, animals, people, time, cards, your turn.
registerTourStop({id:'build',order:100,shot:'crane',seconds:5,title:'This is Abbie’s World.',line:'This is Abbie’s World.',when:ctx=>ctx.fresh,find:world=>world,
 run:async ctx=>{await ctx.rebuild('flower');ctx.arrive('space',3.4);}});
registerTourStop({id:'alive',order:200,shot:'push',seconds:4.2,title:'Everything you make comes alive.',line:'Where everything you make… comes alive.',find:world=>named('porch-lamp')(world)||named('Kitchen garden')(world)});
registerTourStop({id:'animals',order:300,shot:'follow',seconds:4.4,title:'The goats have opinions.',line:'The goats have opinions. The horses have best friends.',find:species('goat','horse','cow','chicken')});
registerTourStop({id:'people',order:400,shot:'follow',seconds:3.6,title:'Everyone has somewhere to be.',line:'And everyone has somewhere to be.',find:world=>findIn(world,o=>!!o.userData?.person)});
registerTourStop({id:'time',order:500,shot:'timelapse',seconds:4.4,title:'Days roll by.',line:'Days roll by. Lanterns glow.',find:world=>world});
registerTourStop({id:'cards',order:600,shot:'card',seconds:4.8,title:'Pick a card. Drop it in.',line:'Pick a card, drop it in, and watch your world grow.',find:world=>world});
registerTourStop({id:'yours',order:900,shot:'hero',seconds:4,title:'Now it’s your turn.',line:'Now it’s your turn.',find:world=>world});

// Chalk hints for real play: one at a time, drawn beside the thing, gone when you do it (or after a while).
const el=sel=>()=>document.querySelector(sel);
registerHint({id:'look',order:100,text:'drag to look around',doodle:'swirl',anchor:()=>({x:innerWidth/2,y:innerHeight*.42}),done:report=>report.dragged});
registerHint({id:'cards',order:200,text:'pick a card',doodle:'arrow',anchor:el('#v2-hand .generator-hero, #v2-hand'),done:report=>report.tapped('#v2-hand')});
registerHint({id:'meet',order:300,text:'tap anyone to say hi',doodle:'circle',world:species('goat','horse','cow','chicken'),done:report=>report.inspected});
registerHint({id:'time',order:400,text:'pause or speed up time',doodle:'arrow',anchor:el('#v2-chrono'),done:report=>report.tapped('#v2-chrono')});
registerHint({id:'toys',order:500,text:'more toys in here',doodle:'arrow',anchor:el('#v2-box'),done:report=>report.tapped('#v2-box')});
