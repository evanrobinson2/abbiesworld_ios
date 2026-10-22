// Social gestures are presentation only: they do not create relationships or canon.
export const EMOTES=Object.freeze([
 {id:'wave',label:'Hello there',duration:2.8,description:'A raised hand and two friendly waves.',cue:'Passing a neighbor'},
 {id:'cheer',label:'We did it!',duration:2.6,description:'Both arms up, with a small happy bounce.',cue:'Finishing a shared job'},
 {id:'shrug',label:'Not sure',duration:2.8,description:'Open arms, lifted shoulders and a tilted head.',cue:'An uncertain answer'},
 {id:'point',label:'Over there',duration:2.5,description:'A clear arm gesture with a glance in the same direction.',cue:'Giving directions'},
 {id:'nod',label:'Understood',duration:2.2,description:'Two small nods, then back to attention.',cue:'Acknowledging a request'},
 {id:'disappointed',label:'Oh, bother',duration:3.2,description:'A brief slump and lowered head, then recovery.',cue:'A small everyday setback'}
]);
export const neutralEmote=()=>({arms:[0,0],legs:[0,0],armsZ:[0,0],head:0,headTilt:0,headRoll:0,bob:0,lean:0});
export function emotePose(id,elapsed,intensity=1){
 const spec=EMOTES.find(e=>e.id===id);if(!spec)throw new RangeError(`Unknown emote: ${id}`);
 const p=neutralEmote(),t=Math.max(0,Math.min(spec.duration,elapsed));
 const smooth=x=>x*x*(3-2*x),weight=smooth(Math.min(1,t/.35))*smooth(Math.min(1,(spec.duration-t)/.45))*Math.max(0,Math.min(1.5,Number(intensity)||0));
 const beat=Math.sin(t*8);
 if(id==='wave'){p.arms[1]=-2.25;p.armsZ[1]=.45+Math.sin(t*9)*.20;p.head=.12;}
 if(id==='cheer'){p.arms=[-2.65,-2.65];p.armsZ=[-.25,.25];p.bob=Math.max(0,beat)*.075;p.headTilt=-.12;}
 if(id==='shrug'){p.arms=[-.25,-.25];p.armsZ=[-.8,.8];p.headRoll=.18;p.bob=.025;}
 if(id==='point'){p.arms[1]=-1.35;p.armsZ[1]=.35;p.head=-.3;}
 if(id==='nod'){p.headTilt=(.13+Math.sin(t*7)*.13);}
 if(id==='disappointed'){p.lean=.12;p.headTilt=.3;p.armsZ=[-.08,.08];}
 for(const key of Object.keys(p))p[key]=Array.isArray(p[key])?p[key].map(v=>v*weight):p[key]*weight;
 return p;
}
export function startEmote(model,id,intensity=1){
 if(!EMOTES.some(e=>e.id===id))throw new RangeError(`Unknown emote: ${id}`);
 model.userData.emote={id,elapsed:0,intensity};
}
