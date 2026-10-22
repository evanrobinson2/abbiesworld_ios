// Kid-speak to world actions, entirely on the device: no network round trip and no model
// tokens, so a shouted "make it snow" lands in the same frame. Anything it cannot place is
// handed to the ship's computer (Claude) when one is connected, or ordered from the modeler.
import {match,COLORS,KIT} from './kit.mjs';
import {REMIXES,WORLDS} from './worlds.mjs';

const NUM={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,twenty:20,hundred:100,dozen:12,lots:12,many:12,bunch:8,some:5};
const has=(t,re)=>re.test(t);

export function parse(raw,{magicWord='',names=[],present=[]}={}){
 const t=' '+String(raw||'').toLowerCase().replace(/[^a-z0-9'\s-]/g,' ').replace(/\s+/g,' ')+' ';
 const A=[];let reply='';
 const who=()=>{const n=names.find(n=>t.includes(' '+n.toLowerCase()+' '));return n||'all';};
 if(magicWord&&t.includes(' '+magicWord.toLowerCase().trim()+' ')){A.push({do:'magic'});return {actions:A,reply:'Magic word! ✨'};}
 // Travel
 if(has(t,/ (next world|next place|teleport|beam us|let's go|lets go|next stop) /))A.push({do:'go',world:'next'});
 for(const w of WORLDS)if(t.includes(' '+w.name.toLowerCase().replace(/'/g,"'")+' ')&&has(t,/ (go|take|teleport|visit|beam) /))A.push({do:'go',world:w.id});
 // Time and weather
 if(has(t,/ (night|dark|bedtime|midnight|nighttime) /))A.push({do:'time',hour:22});
 else if(has(t,/ (sunset|evening|dusk) /))A.push({do:'time',hour:18.6});
 else if(has(t,/ (sunrise|dawn) /))A.push({do:'time',hour:6.4});
 else if(has(t,/ (day|daytime|morning|sunny|noon|light) /)&&!has(t,/ (lights?) on /))A.push({do:'time',hour:11});
 const weather=[[/ (snow|snowing|blizzard|snowy) /,'snow'],[/ (rain|raining|rainy|storm|thunder) /,'rain'],[/ (confetti|party) /,'confetti'],[/ (bubble|bubbles) /,'bubbles'],[/ (leaves|autumn|fall) /,'leaves'],[/ (firework|fireworks) /,'fireworks'],[/ (sparkle|sparkles|glitter) /,'sparkles'],[/ (clear|stop the|no more) (snow|rain|weather) /,'clear']];
 for(const [re,mode] of weather)if(has(t,re)){A.push({do:'weather',mode});break;}
 // Style remixes
 if(has(t,/ (switch it up|remix|surprise me|something different|change everything) /))A.push({do:'remix',style:'random'});
 for(const [k,r] of Object.entries(REMIXES))if(k!=='night'&&(t.includes(' '+k+' ')||t.includes(' '+r.label.toLowerCase()+' ')||(k==='winter'&&has(t,/ (frozen|icy|ice) world /))||(k==='candy'&&has(t,/ candy (land|world) /))||(k==='neon'&&has(t,/ (neon|disco) /)))){A.push({do:'remix',style:k});break;}
 // Gravity
 if(has(t,/ (low gravity|moon gravity|float|floaty|fly|flying) /))A.push({do:'gravity',low:true});
 if(has(t,/ (normal gravity|heavy|land|stop flying) /))A.push({do:'gravity',low:false});
 // Sky or ground colour: "make the sky green", "turn the grass purple"
 const col=Object.keys(COLORS).find(c=>t.includes(' '+c+' '));
 if(col&&has(t,/ (sky) /))A.push({do:'sky',color:COLORS[col]});
 else if(col&&has(t,/ (ground|grass|floor|sand) /))A.push({do:'ground',color:COLORS[col]});
 // Family emotes
 const emotes=[[/ (dance|dancing|boogie) /,'dance'],[/ (jump|jumping|hop|bounce) /,'jump'],[/ (wave|waving|hello|hi) /,'wave'],[/ (spin|twirl) /,'spin'],[/ (sleep|nap|tired) /,'sleep'],[/ (cheer|yay|hooray) /,'cheer']];
 for(const [re,emote] of emotes)if(has(t,re)&&!has(t,/ (make the|make a|the [a-z-]+ (dance|jump|spin)) /)){A.push({do:'emote',who:who(),emote});break;}
 // Size and colour of things already in the world: "make the dinosaur giant", "turn the whale pink"
 const sizeWord=(t.match(/ (giant|huge|enormous|massive|bigger|big|gigantic|tiny|small|smaller|little|mini|normal) /)||[])[1];
 const thing=findThing(t,present);
 if(thing&&sizeWord){const f=/giant|huge|enormous|massive|gigantic/.test(sizeWord)?3:/bigger|big/.test(sizeWord)?1.7:/normal/.test(sizeWord)?0:.35;A.push({do:'scale',target:thing,factor:f});}
 else if(thing&&col&&!has(t,/ (sky|ground|grass) /)&&has(t,/ (make|turn|paint|color|colour) /))A.push({do:'color',target:thing,color:COLORS[col]});
 if(thing&&has(t,/ (chase|chasing|run after|get us|come here) /))A.push({do:'chase',target:thing});
 if(thing&&has(t,/ (go away|disappear|vanish|bye) /))A.push({do:'remove',target:thing});
 // New things: "add three unicorns", "I want a giant pizza", "can we have a rocket"
 const wantsNew=has(t,/ (add|bring|make a|make an|make some|give us|i want|we want|can we have|can i have|let's have|show me|summon|create|put|spawn|more|there should be) /);
 if(wantsNew&&!(thing&&(sizeWord||col)&&!has(t,/ (add|bring|more|another) /))){
  const tail=t.replace(/.*?(add|bring|make an|make a|make some|give us|i want|we want|can we have|can i have|let's have|show me|summon|create|put|spawn|more|there should be)\s/,'');
  const n=countIn(' '+tail);const m=match(tail.replace(/ (here|there|please|now|too|for us|in the world|everywhere) /g,' '));
  if(m)A.push({do:'spawn',id:m.id,word:m.word,color:m.color,size:m.size,count:n});
 }
 if(!A.length){reply='';}
 return {actions:A,reply};
}
function countIn(t){const d=t.match(/ (\d{1,3}) /);if(d)return Math.min(30,+d[1]);for(const [w,n] of Object.entries(NUM))if(t.includes(' '+w+' '))return Math.min(30,n);return 1;}
// Which kit id already present in the scene the sentence talks about.
function findThing(t,present){
 const ids=[...new Set(present)];
 for(const id of ids){const k=KIT[id];if(!k)continue;if(k.tags.some(tag=>tag.length>2&&(t.includes(' '+tag+' ')||t.includes(' '+tag+'s '))))return id;}
 if(has(t,/ (dinosaur|dino|dinosaurs|dinos) /))return ids.find(id=>KIT[id]?.tags.includes('dinosaur')||['stegosaurus','triceratops','brontosaurus','t-rex','raptor'].includes(id))||null;
 if(has(t,/ (everything|all the things|the world) /))return 'everything';
 return null;
}
