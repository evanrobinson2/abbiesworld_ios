import * as T from 'three';

// Describe observed activity, never infer happiness from an unmet need score.
export function activityEmoji(activity='') {
 const s=activity.toLowerCase();
 if(/blocked|awaiting care|waiting for.*water|waiting for.*feed/.test(s))return '⚠️';
 if(/walking|going|carrying|heading/.test(s))return null;
 if(/drink/.test(s))return '💧';
 if(/eat|feeding|graz|scratch|breakfast|lunch|dinner/.test(s))return '🌿';
 if(/sleep|rest/.test(s))return '💤';
 if(/social|chat|companion/.test(s))return '💬';
 if(/play|climb/.test(s))return '🎈';
 if(/garden|harvest|apple/.test(s))return '🌱';
 if(/groom|brush/.test(s))return '❤️';
 if(/egg/.test(s))return '🥚';
 if(/shelter|rain/.test(s))return '☔';
 return null;
}

export function createFeelings(root){
 const materials=new Map(),seen=new Map(),pool=[],point=new T.Vector3();
 let time=0,next=1,cursor=0;
 function material(emoji){
  if(materials.has(emoji))return materials.get(emoji);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');ctx.fillStyle='rgba(255,249,234,.94)';ctx.beginPath();ctx.arc(64,64,52,0,Math.PI*2);ctx.fill();
  ctx.font='72px "Apple Color Emoji","Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(emoji,64,67);
  const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
  const m=new T.SpriteMaterial({map,transparent:true,depthWrite:false,toneMapped:false});materials.set(emoji,m);return m;
 }
 function hide(slot){slot.sprite.visible=false;slot.body=null;}
 return {
  update(dt,entities,speed=1){
   time+=Math.min(.1,Math.max(0,dt));
   const live=new Set(entities.map(e=>e.body));for(const body of seen.keys())if(!live.has(body))seen.delete(body);
   for(const slot of pool){
    if(speed!==1||!slot.body||!live.has(slot.body)||!slot.body.visible||time>slot.until){hide(slot);continue;}
    slot.sprite.visible=true;slot.body.getWorldPosition(point);root.worldToLocal(point);slot.sprite.position.copy(point);slot.sprite.position.y+=slot.height;
   }
   if(speed!==1||time<next||!entities.length)return;
   next=time+1.2;
   for(let n=0;n<entities.length;n++){
    const e=entities[cursor++%entities.length],emoji=activityEmoji(e.activity),prev=seen.get(e.body);
    if(!e.body.visible||!emoji||pool.some(s=>s.body===e.body)||prev&&time-prev.time<(prev.emoji===emoji?24:8))continue;
    let slot=pool.find(s=>!s.body);
    if(!slot&&pool.length<4){const sprite=new T.Sprite(material(emoji));sprite.raycast=()=>{};sprite.scale.set(1.8,1.8,1);root.add(sprite);slot={sprite};pool.push(slot);}
    if(!slot)return;
    slot.sprite.material=material(emoji);slot.body=e.body;slot.height=e.height;slot.until=time+3.2;slot.sprite.visible=false;
    seen.set(e.body,{emoji,time});break;
   }
  },
  dispose(){for(const s of pool)root.remove(s.sprite);for(const m of materials.values()){m.map.dispose();m.dispose();}materials.clear();seen.clear();pool.length=0;}
 };
}
