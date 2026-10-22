// The adventure: madlib prompts, the five announced stops, and the secret world that is not
// on the map. A world is a recipe (sky, ground, weather, kit placements, story beats), so it
// can be rebuilt, restyled or upgraded without stored scene files.

export const MADLIBS=[
 {key:'animal',ask:'An animal you would love as a pet',example:'a purple dragon'},
 {key:'color',ask:'Your favourite colour',example:'pink'},
 {key:'food',ask:'A food you could eat forever',example:'giant pizza'},
 {key:'ride',ask:'Something you would ride on',example:'a rocket'},
 {key:'treasure',ask:'Something you would find in a treasure chest',example:'a crown'},
 {key:'creature',ask:'A silly creature to meet on the way',example:'a dancing robot'},
 {key:'word',ask:'A magic word',example:'bananarama'},
];
export const SAMPLE_ANSWERS={animal:'purple dragon',color:'pink',food:'giant pizza',ride:'rocket',treasure:'crown',creature:'robot',word:'bananarama'};

// ring: [inner, outer] radius around the family; n: how many; s: scale range.
export const WORLDS=[
 {id:'sky-meadow',name:'Sky Meadow',stop:1,mode:'show',
  blurb:'Floating islands, giant flowers and waterfalls in the sky.',
  sky:['#7cc8ff','#ffe9f5'],fog:'#dff1ff',ground:'#7dcf6a',groundEdge:'#b58a5a',island:true,hour:10,particles:'pollen',
  place:[{k:'giant-flower',n:7,ring:[5,11],s:[.8,1.3]},{k:'flower',n:40,ring:[2,13],s:[.8,1.6]},{k:'tree',n:6,ring:[8,14]},{k:'windmill',n:1,ring:[10,10]},{k:'cloud',n:10,ring:[12,22],y:[3,7],s:[1.5,3]},{k:'butterfly',n:8,ring:[2,8],y:[0,1.2],live:'flutter'},{k:'sheep',n:4,ring:[5,10],live:'graze'},{k:'rainbow',n:1,ring:[18,18],y:[-2,-2],s:[2,2]},{k:'hot-air-balloon',n:2,ring:[17,22],y:[6,10],live:'float'}],
  slots:[{answer:'animal',n:1,ring:[3.5,3.5],live:'graze',hero:true},{answer:'ride',n:1,ring:[7,7]}],
  beats:['Welcome to Sky Meadow. You are standing on an island floating in the clouds.','Down there, the flowers are taller than Dad.','And look who is grazing in the meadow.'],
 },
 {id:'dino-valley',name:'Dino Valley',stop:2,mode:'play',
  blurb:'A steamy jungle valley with a sleepy volcano and friendly dinosaurs.',
  sky:['#ffb36b','#fff0c9'],fog:'#f7dcae',ground:'#6aa84f',groundEdge:'#6b4a3a',hour:16,particles:'fireflies',
  place:[{k:'volcano',n:1,ring:[16,16],s:[2.2,2.2]},{k:'jungle-tree',n:14,ring:[7,17]},{k:'palm-tree',n:8,ring:[6,15]},{k:'bush',n:20,ring:[3,14]},{k:'rock',n:12,ring:[3,14]},{k:'brontosaurus',n:2,ring:[10,14],live:'wander'},{k:'t-rex',n:1,ring:[8,8],live:'wander'},{k:'stegosaurus',n:2,ring:[6,11],live:'wander'},{k:'triceratops',n:2,ring:[5,10],live:'wander'},{k:'pterodactyl',n:3,ring:[6,12],y:[4,7],live:'circle'},{k:'egg',n:5,ring:[2.5,4],s:[.8,1.2]}],
  slots:[{answer:'food',n:1,ring:[6.5,6.5],hero:true,s:1.8},{answer:'creature',n:1,ring:[3,3],live:'wander'}],
  beats:['Dino Valley. This one is live: say anything and the valley will do it.','Try "make it night", "make the T-Rex tiny" or "everybody dance".'],
 },
 {id:'abbies-world',name:"Abbie's World",stop:null,secret:true,mode:'play',
  blurb:'A world nobody knew about, made of everything you imagined.',
  sky:['#c8a8ff','#ffd6ef'],fog:'#f4dcff',ground:'#ffc4e6',groundEdge:'#a87ad8',island:true,hour:16,particles:'sparkles',useColor:true,
  place:[{k:'candy-tree',n:10,ring:[6,14]},{k:'lollipop',n:16,ring:[3,13],s:[1.4,2.4]},{k:'mushroom',n:12,ring:[3,12],s:[1,2.2]},{k:'crystal',n:8,ring:[5,13],s:[1,2]},{k:'balloon',n:10,ring:[3,12],y:[1,4],live:'float'},{k:'castle',n:1,ring:[12,12],s:[1.4,1.4]},{k:'star',n:8,ring:[10,18],y:[5,9],live:'spin'},{k:'unicorn',n:2,ring:[5,10],live:'wander'}],
  slots:[{answer:'animal',n:3,ring:[3,8],live:'wander'},{answer:'food',n:4,ring:[4,10],s:1.8},{answer:'ride',n:1,ring:[5,5]},{answer:'treasure',n:3,ring:[2.5,6]},{answer:'creature',n:2,ring:[4,8],live:'wander'}],
  beats:["Wait. This one is not on the map.","Computer, where are we?","Welcome to Abbie's World. Everything here came out of your imagination."],
 },
 {id:'coral-reef',name:'Coral Reef',stop:3,mode:'play',
  blurb:'Under the sea with whales, fish and a yellow submarine.',
  sky:['#1a6fa8','#7ae0e8'],fog:'#3aa0c8',ground:'#e8d8a8',groundEdge:'#c8b078',hour:12,particles:'bubbles',underwater:true,
  place:[{k:'coral',n:24,ring:[2.5,13],s:[.8,2]},{k:'seaweed',n:24,ring:[2,14],s:[1,2.2],live:'sway'},{k:'shell',n:12,ring:[2,10]},{k:'starfish',n:10,ring:[2,10]},{k:'fish',n:24,ring:[3,12],y:[.6,3.5],live:'swim'},{k:'whale',n:1,ring:[14,14],y:[5,5],live:'swim',s:[2,2]},{k:'jellyfish',n:6,ring:[5,12],y:[2,5],live:'float'},{k:'octopus',n:1,ring:[6,6]},{k:'crab',n:4,ring:[3,8],live:'wander'},{k:'submarine',n:1,ring:[9,9],y:[2,2],live:'swim'},{k:'treasure-chest',n:1,ring:[5,5]},{k:'dolphin',n:3,ring:[8,12],y:[2,4],live:'swim'}],
  slots:[{answer:'treasure',n:1,ring:[4,4],hero:true}],
  beats:['The Coral Reef. Do not worry, holodeck water is perfectly breathable.','Somewhere down here is a treasure chest.'],
 },
 {id:'moon-base',name:'Moon Base',stop:4,mode:'play',
  blurb:'Low gravity, a moon buggy and the whole Earth in the sky.',
  sky:['#05060f','#1a1f3a'],fog:'#0a0d1c',ground:'#c9c6bd',groundEdge:'#8d8a85',hour:22,particles:'stars',lowGravity:true,space:true,
  place:[{k:'moon-base',n:2,ring:[8,11],s:[1.5,2]},{k:'lunar-rover',n:1,ring:[4,4],live:'wander'},{k:'rocket',n:1,ring:[10,10],s:[1.6,1.6]},{k:'satellite',n:2,ring:[12,16],y:[6,9],live:'spin'},{k:'rock',n:20,ring:[3,16]},{k:'crystal',n:6,ring:[6,14]},{k:'planet',n:1,ring:[30,30],y:[14,14],s:[6,6]},{k:'flag',n:1,ring:[3,3]},{k:'alien',n:3,ring:[5,10],live:'wander'},{k:'ufo',n:1,ring:[10,10],y:[5,5],live:'circle'}],
  slots:[{answer:'ride',n:1,ring:[5,5]},{answer:'creature',n:1,ring:[6,6],live:'wander'}],
  beats:['Moon Base. Gravity here is one sixth of home. Try jumping.','That big blue marble up there is Earth.'],
 },
 {id:'cloud-castle',name:'Cloud Castle',stop:5,mode:'play',finale:true,
  blurb:'A golden castle on the clouds, with a party just for you.',
  sky:['#ffb0d0','#fff4c8'],fog:'#ffe8f0',ground:'#ffffff',groundEdge:'#e8eaff',island:true,hour:16.5,particles:'confetti',
  place:[{k:'cloud-castle',n:1,ring:[11,11],s:[1.6,1.6]},{k:'cloud',n:24,ring:[10,24],y:[-2,5],s:[1,3]},{k:'cake',n:1,ring:[3.5,3.5],s:[2.5,2.5]},{k:'gift',n:12,ring:[3,8]},{k:'balloon',n:20,ring:[2,12],y:[1,6],live:'float'},{k:'carousel',n:1,ring:[8,8],live:'spin'},{k:'ferris-wheel',n:1,ring:[14,14],s:[1.4,1.4]},{k:'star',n:10,ring:[12,20],y:[6,10],live:'spin'},{k:'unicorn',n:2,ring:[6,10],live:'wander'}],
  slots:[{answer:'animal',n:1,ring:[4,4],live:'wander'},{answer:'food',n:2,ring:[5,7]},{answer:'treasure',n:1,ring:[2.2,2.2]}],
  beats:['Cloud Castle, the last stop. Everyone you met is here.','Say the magic word and see what happens.'],
 },
];
export const MAP=WORLDS.filter(w=>!w.secret);

// Five quick looks the presenter (or a kid) can throw at any world.
export const REMIXES={
 candy:{label:'Candy',sky:['#ff9ad6','#fff0a8'],ground:'#ffc4e6',fog:'#ffe0f2',tint:['#ff7ac2','#ffd84a','#7ad3ff','#b07aff']},
 winter:{label:'Winter',sky:['#a8c8e8','#f2f8ff'],ground:'#f7fbff',fog:'#e8f2ff',particles:'snow',tint:['#ffffff','#cfefff','#8fd8ff']},
 night:{label:'Night',hour:22,particles:'fireflies'},
 neon:{label:'Disco',sky:['#12002a','#3a0a5a'],ground:'#1a0a2a',fog:'#20103a',glow:true,tint:['#ff3ad8','#3affe8','#ffe83a','#7a3aff']},
 golden:{label:'Golden',sky:['#ffb84a','#fff0c0'],ground:'#e8c86a',fog:'#ffe8b0',tint:['#ffd23a','#ffb84a','#fff0a0'],metal:true},
 autumn:{label:'Autumn',sky:['#ffb08a','#ffe8d0'],ground:'#c8a050',fog:'#f8d8b0',particles:'leaves',tint:['#e8822a','#d8402c','#ffd23a']},
};

// Everything a world will need from the builder: kit models (free, procedural) and new
// models the kit cannot match yet (ordered from the modeler at low detail first).
export function modelOrder(answers,match){
 const need=new Map();
 const want=(word,world,role)=>{const m=match(word);if(!m)return;const key=m.id||'new:'+m.word;const e=need.get(key)||{key,id:m.id,word:m.word,color:m.color,worlds:new Set(),role};e.worlds.add(world);need.set(key,e);};
 for(const w of WORLDS){for(const p of w.place)want(p.k,w.id,'set');for(const s of w.slots)if(answers[s.answer])want(answers[s.answer],w.id,'madlib:'+s.answer);}
 return [...need.values()].map(e=>{const worlds=[...e.worlds];return {...e,worlds,firstWorld:WORLDS.findIndex(w=>worlds.includes(w.id))};}).sort((a,b)=>a.firstWorld-b.firstWorld);
}
