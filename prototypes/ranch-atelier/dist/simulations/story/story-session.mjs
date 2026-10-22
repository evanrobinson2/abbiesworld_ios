import {storyProps,validateStory,storyNeeds,STORY_SPECIES} from './story-contract.mjs';
import {createStoryDirector,stageProp,unstageProps} from './story-director.mjs';
import {dryRunStory} from './story-dry-run.mjs';
import {createStoryStage} from './story-stage.mjs';
// One told story from words to a playing scene: plan → check → build → dry run → stage → play.
// `host` is the sandbox: it owns the board, camera and controls; this file owns the story.
let catalogPromise=null;
const loadCatalog=()=>catalogPromise||(catalogPromise=fetch('/simulation-assets/catalog.json').then(r=>r.ok?r.json():[]).catch(()=>[]));

export async function availableProps(){return storyProps(await loadCatalog());}

export async function planStory(text,{signal}={}){
 const props=await availableProps();
 const response=await fetch('/api/story-compose',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({story:text,props}),signal});
 let data;try{data=await response.json();}catch{}
 if(!response.ok||!data?.story)throw Error(data?.error||'The storyteller could not be reached.');
 // The server validated against the props we sent; validate again against what this page can load.
 return {story:validateStory(data.story,{props}),model:data.model,costUSD:data.costUSD};
}

export function presentAnimals(state){const n={};for(const p of state.pens)n[p.species]=(n[p.species]||0)+p.animals.length;return n;}

// Species the board lacks entirely, or lacks enough of for the named animal cast.
export function missingHerd(story,state){
 const have=presentAnimals(state),needs=storyNeeds(story),cast={},out={};
 for(const c of story.cast)if(c.kind==='animal')cast[c.species]=(cast[c.species]||0)+1;
 for(const s of STORY_SPECIES){if(!needs[s])continue;if(!have[s]||have[s]<(cast[s]||0))out[s]=Math.max(needs[s],cast[s]||0);}
 return out;
}

export function createStorySession(host,events){
 let current=null;
 function clear(){if(!current)return;current.director?.stop();clearInterval(current.timer);cancelAnimationFrame(current.frame);current.director?.release();current.stage?.dispose();if(current.staged&&current.world)unstageProps(current.world,current.staged);current=null;}
 async function play(story){
  clear();
  const session=current={story};
  events.stage('building');
  const missing=missingHerd(story,host.world().state);
  if(Object.keys(missing).length){events.stage('new-tile',missing);await host.buildTile(story,missing);}
  if(current!==session)return;
  host.setScene(story.setting);
  // Headless check on a detached copy of the board that now exists.
  let check=null;try{check=dryRunStory(story,host.core());}catch(error){check={ok:false,reason:'dry-run-error',issues:[error.message],skipped:[],broken:[]};}
  events.checked(check);
  if(check.broken?.length)throw Error('This story would hurt a hero, so it was not played.');
  const world=session.world=host.world(),stage=session.stage=createStoryStage({root:host.root(),heightAt:host.heightAt,reducedMotion:host.reducedMotion()});
  const catalog=await loadCatalog();
  session.staged=[];
  for(const [i,p]of story.props.entries()){const record=catalog.find(r=>r.id===p.asset),staged=record&&stageProp(p,world);if(!staged)continue;staged.label=record.label;session.staged.push(staged);try{await stage.addProp(record,staged,i*.09);}catch{}}
  if(current!==session)return;
  const director=session.director=createStoryDirector(story,{world:host.world,staged:session.staged,
   onBeat:(i,beat,binding)=>{events.beat(i,beat);if(binding?.worker)host.follow(binding.worker.body);},
   onBeatDone:(i,beat,info)=>events.beatDone(i,beat,info),
   onIssue:m=>events.issue(m),
   onEnd:e=>{clearInterval(session.timer);events.end(e);},
   setWeather:w=>host.setScene({weather:w}),
   narrating:()=>events.narrating()});
  stage.setHeroes(story.cast.filter(c=>c.hero).map(c=>host.bodyFor(director.bindings[c.id])));
  events.cast(director.bindings);
  let last=performance.now();const frame=now=>{stage.update(Math.min(.1,(now-last)/1000));last=now;session.frame=requestAnimationFrame(frame);};session.frame=requestAnimationFrame(frame);
  session.timer=setInterval(()=>director.update(),250);
  director.start();
 }
 return {play,clear,get current(){return current;},focus(castId){const b=current?.director?.bindings[castId];if(b)host.follow(host.bodyFor(b));}};
}
