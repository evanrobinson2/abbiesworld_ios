import {SPRINT,PADS} from './race-model.mjs';
// Six playable course proposals. Same fair car physics, distinct paths and pickup patterns.
// These are track-layout studies: bespoke themed scenery is a later art pass.
export const TRACKS={
 sprint:{name:'Skate-Park Sprint',brief:'The original · learn the launch',sky:'#8fd0ee',ground:'#cdbf9e',scale:1,turn:1,pitch:1,shift:0},
 ribbon:{name:'Ribbon Garden',brief:'Broad bends · flowing lane changes',sky:'#c6dece',ground:'#a6ba8c',scale:1.35,turn:.65,pitch:.65,shift:1},
 moon:{name:'Moonbeam Run',brief:'Long dips · a silver hairpin',sky:'#919fcb',ground:'#b5b8c9',scale:1.15,turn:1.2,pitch:1.25,shift:2},
 attic:{name:'Toybox Switchback',brief:'Short straights · alternating bends',sky:'#e0c3c1',ground:'#bf9a80',scale:.95,turn:1.35,pitch:.8,shift:1,reverse:true},
 seaside:{name:'Seaside Swoop',brief:'Wide sweep · a long fast finish',sky:'#b8e2e5',ground:'#e3d0a9',scale:1.55,turn:.85,pitch:1.15,shift:2},
 parade:{name:'Celebration Circuit',brief:'Longer lap · rhythmic boost chains',sky:'#d6bee3',ground:'#b4a9c7',scale:1.8,turn:1.1,pitch:.9,shift:0,reverse:true}
};
export function course(id='sprint'){
 const key=TRACKS[id]?id:'sprint',def=TRACKS[key],track=structuredClone(SPRINT);
 if(key!=='sprint')track.segs=track.segs.map((s,i)=>({...s,...(s.len?{len:s.len*def.scale}:{}),...(s.k==='turn'?{deg:s.deg*def.turn*(def.reverse?-1:1),r:s.r*(def.scale>.99?def.scale:1)}:{}),...(s.k==='pitch'?{deg:s.deg*def.pitch}:{} )}));
 const pads=PADS.map(([tag,off,lane,kind],i)=>[tag,off*def.scale,((lane+1+def.shift+(key==='attic'?i%2:0))%3)-1,kind]);
 const trackId=key==='sprint'?'sprint-v1':key+'-study-v1';return {key,def,track,pads,trackId,boardKey:trackId+'/timed/cosmetic'};
}
