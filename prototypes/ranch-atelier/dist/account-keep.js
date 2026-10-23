// Keeps a signed-in player's gold coins and charms with their account, from any page that earns them (the town, the
// games). Additive: what is on this device and what is in the account are joined, never replaced. See ACCOUNTS.md.
(()=>{
 const COINS='aw-memory-coins',PACK='aw-backpack',MADE='aw-cell-creation',CLEARS='aw-cell-clears'; // MADE: the cell a player built; this device's wins, else the account's
 const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
 const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{}};
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
 const join=(a,b)=>({...obj(a),...obj(b)}); // coins and charms are keyed by id: either side's wins are kept
 const merge=(here,cloud)=>{
  const h=obj(here),c=obj(cloud);
  return {...c,...h,charms:join(c.charms,h.charms),seen:[...new Set([...(c.seen||[]),...(h.seen||[])])]};
 };
 // cleared beakers: the most wins and the best (shortest) time per level, from either side
 const joinClears=(a,b)=>{const o={...obj(b)};for(const [k,v] of Object.entries(obj(a)))o[k]=o[k]?{wins:Math.max(o[k].wins||0,v.wins||0),best:Math.min(o[k].best||1e9,v.best||1e9)}:v;return o;};
 let busy=false,again=false;
 async function keep(){
  if(busy){again=true;return;}busy=true;
  try{
   const me=await (await fetch('/api/me',{cache:'no-store'})).json();if(!me.signedIn)return;
   const r=await fetch('/api/me?save=1',{cache:'no-store'});if(!r.ok)return;
   const cloud=await r.json(),cs=cloud.saves||{};
   const made=read(MADE)||(cs[MADE]?JSON.parse(cs[MADE]):null);
   const clears=joinClears(read(CLEARS),cs[CLEARS]?JSON.parse(cs[CLEARS]):null);
   const coins=join(JSON.parse(cs[COINS]||'{}'),read(COINS)),pack=merge(read(PACK),JSON.parse(cs[PACK]||'{}'));
   const same=JSON.stringify(coins)===JSON.stringify(read(COINS)||{})&&JSON.stringify(pack)===JSON.stringify(read(PACK)||{});
   if(!same){put(COINS,coins);put(PACK,pack);}
   if(made&&!read(MADE))put(MADE,made);
   if(Object.keys(clears).length)put(CLEARS,clears);
   if(JSON.stringify(coins)!==cs[COINS]||JSON.stringify(pack)!==cs[PACK]||(made&&JSON.stringify(made)!==cs[MADE])||(Object.keys(clears).length&&JSON.stringify(clears)!==cs[CLEARS]))
    await fetch('/api/me',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({updated:cloud.updated,saves:{[COINS]:JSON.stringify(coins),[PACK]:JSON.stringify(pack),...(made?{[MADE]:JSON.stringify(made)}:{}),...(Object.keys(clears).length?{[CLEARS]:JSON.stringify(clears)}:{})}})});
  }catch{}finally{busy=false;if(again){again=false;keep();}}
 }
 addEventListener('aw-backpack-change',()=>setTimeout(keep,400));
 addEventListener('aw-memory-coins-change',()=>setTimeout(keep,400));
 addEventListener('pagehide',keep);
 window.AbbiesKeep={keep,ready:keep()};
})();
