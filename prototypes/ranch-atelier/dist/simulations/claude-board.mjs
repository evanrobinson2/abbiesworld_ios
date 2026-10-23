export const isClaudeBoard=()=>/^\/sandbox\/Claude\/?$/i.test(location.pathname);
export function startClaudeBoard({ready,contains,place,status}){
 let working=false;const key='abbies-claude-applied-v1';let applied=new Set();try{applied=new Set(JSON.parse(localStorage.getItem(key)||'[]'));}catch{}
 async function poll(){if(working||document.hidden||!isClaudeBoard()||!ready())return;working=true;
 try{const r=await fetch('/api/claude-board',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Cloud connection unavailable');const board=await r.json();
 for(const tile of board.tiles){if(!ready()||!isClaudeBoard())break;if(applied.has(tile.id))continue;if(contains(tile.id)){applied.add(tile.id);continue;}status('Building '+tile.type+' from Claude…');await place(tile);applied.add(tile.id);try{localStorage.setItem(key,JSON.stringify([...applied]));}catch{}}
 status('Claude · cloud tiles connected');
 }catch(e){status('Claude · '+e.message);}finally{working=false;}}
 const timer=setInterval(poll,5000);poll();return()=>clearInterval(timer);
}
