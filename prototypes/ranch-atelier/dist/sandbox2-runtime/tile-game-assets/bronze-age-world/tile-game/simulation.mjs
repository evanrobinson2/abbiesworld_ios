export const R=12, SQ=Math.sqrt(3), directions=[[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
export const center=(q,r)=>({x:SQ*R*(q+r/2),z:1.5*R*r});
export function cell(x,z){let q=(SQ/3*x-z/3)/R,r=2*z/(3*R),s=-q-r,Q=Math.round(q),S=Math.round(s),Z=Math.round(r);const dq=Math.abs(Q-q),ds=Math.abs(S-s),dr=Math.abs(Z-r);if(dq>ds&&dq>dr)Q=-S-Z;else if(dr>ds)Z=-Q-S;return{q:Q,r:Z};}
export const ground=(x,z)=>.65*Math.sin(x*.035)+.45*Math.cos(z*.045);
// Interior relief reaches exactly zero with zero derivative at all six edges.
export function relief(x,z){let edge=0;for(let k=0;k<6;k++)edge=Math.max(edge,(x*Math.cos(k*Math.PI/3)+z*Math.sin(k*Math.PI/3))/(R*SQ/2));return .8*Math.pow(Math.max(0,1-edge*edge),2);}
export function height(t,x,z){const c=center(t.q,t.r);return ground(c.x+x,c.z+z)+t.level*4+relief(x,z);}
export function world(){return{version:1,time:0,nextId:1,tiles:[],deliveries:0,events:[]};}
export function occupied(w,q,r,level=0,except=null){return w.tiles.find(t=>t.id!==except&&t.q===q&&t.r===r&&t.level===level);}
export function canPlace(w,q,r,level=0,except=null){return Number.isInteger(q)&&Number.isInteger(r)&&Math.max(Math.abs(q),Math.abs(r),Math.abs(q+r))<=4&&Number.isInteger(level)&&level>=0&&level<=2&&!occupied(w,q,r,level,except)&&(level===0||!!occupied(w,q,r,level-1,except));}
export function addTile(w,kind,q,r,level=0){if(!canPlace(w,q,r,level))throw Error('Tile needs an empty supported site');const t={id:'tile-'+w.nextId++,kind,q,r,level,rotation:0,progress:0,inventory:{},cycles:0,age:0,lifted:false};w.tiles.push(t);return t;}
export function beginMove(w,id){const t=w.tiles.find(t=>t.id===id);if(!t||t.lifted||occupied(w,t.q,t.r,t.level+1))return null;t.lifted=true;return{id,original:{q:t.q,r:t.r,level:t.level,rotation:t.rotation}};}
export function finishMove(w,move,dest){const t=w.tiles.find(t=>t.id===move?.id);if(!t)return false;const valid=dest&&canPlace(w,dest.q,dest.r,dest.level,t.id);Object.assign(t,valid?dest:move.original);t.lifted=false;return!!valid;}
export function neighbors(w,t){return w.tiles.filter(o=>!o.lifted&&o.id!==t.id&&o.level===t.level&&directions.some(([q,r])=>o.q===t.q+q&&o.r===t.r+r));}
export function path(w,a,b){const queue=[[a]],seen=new Set([a.id]);while(queue.length){const p=queue.shift(),last=p.at(-1);if(last.id===b.id)return p;for(const n of neighbors(w,last))if(!seen.has(n.id)){seen.add(n.id);queue.push([...p,n]);}}return null;}
export function step(w,cards,dt){if(!Number.isFinite(dt)||dt<0||dt>.1)throw Error('Bounded fixed step required');w.time+=dt;w.events=[];for(const t of w.tiles){if(t.lifted)continue;t.age+=dt;t.progress+=dt;if(t.progress<8)continue;t.progress-=8;const c=cards.find(c=>c.id===t.kind);if(!c)throw Error('Unknown prefab');if(c.produces){let supplier=t;if(c.needs){supplier=[t,...neighbors(w,t)].find(n=>(n.inventory[c.needs]??0)>0);if(!supplier)continue;supplier.inventory[c.needs]--;w.events.push({from:supplier.id,to:t.id,resource:c.needs});}t.inventory[c.produces]=(t.inventory[c.produces]??0)+1;t.cycles++;}
 const store=w.tiles.find(o=>o.kind==='store'&&!o.lifted&&o.id!==t.id&&path(w,t,o));if(store){const item=Object.keys(t.inventory).find(k=>t.inventory[k]>0);if(item){t.inventory[item]--;store.inventory[item]=(store.inventory[item]??0)+1;w.deliveries++;w.events.push({from:t.id,to:store.id,resource:item,route:path(w,t,store).map(p=>p.id)});}}
 }}
export function total(w){return w.tiles.reduce((n,t)=>n+Object.values(t.inventory).reduce((a,b)=>a+b,0),0);}
