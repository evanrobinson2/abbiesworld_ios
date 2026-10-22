importScripts('drawing-brush.js?v=1');
let active=0,state;
onmessage=async e=>{const m=e.data,version=++active;try{if(!state||state.key!==m.key||m.limit<state.count)state={key:m.key,paper:new DrawingBrush.Paper(720,660,m.seed,m.options),count:0,contacts:0};const s=state,canvas=new OffscreenCanvas(720,660),ctx=canvas.getContext('2d');async function emit(done){ctx.putImageData(new ImageData(s.paper.pixels(),720,660),0,0);const blob=await canvas.convertToBlob({type:'image/png'});if(version===active)postMessage({request:m.request,blob,done,completed:s.count,contacts:s.contacts});}
while(s.count<m.limit){const end=Math.min(m.limit,s.count+35);while(s.count<end){s.paper.stroke(m.strokes[s.count],s.count);s.contacts+=s.paper.lastStats.contacts;s.count++;}if(version!==active)return;if(s.count<m.limit){await emit(false);await new Promise(r=>setTimeout(r,0));if(version!==active)return;}}
s.paper.settle(8,.04);await emit(true);
}catch(err){postMessage({request:m.request,error:String(err.message||err)});}};
