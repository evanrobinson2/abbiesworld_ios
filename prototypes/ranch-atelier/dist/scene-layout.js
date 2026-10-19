// Pure composition data. `scale` is the desired longest horizontal asset span
// in world units (normalize the loaded model's bounds before applying it).
const DIRECTIONS = [[1,0],[0,1],[-1,1],[-1,0],[0,-1],[1,-1]];
const key = ({q,r}) => `${q},${r}`;
const distance = (a,b={q:0,r:0}) => Math.max(Math.abs(a.q-b.q),Math.abs(a.r-b.r),Math.abs(a.q+a.r-b.q-b.r));
const point = ({q,r}) => ({x:Math.sqrt(3)*2*(q+r/2),z:3*r});

export function generateScene({seed=1,radius=3}={}) {
  if (!Number.isFinite(Number(seed))) throw new TypeError('seed must be finite');
  if (!Number.isInteger(radius)||radius<2||radius>10) throw new RangeError('radius must be an integer from 2 to 10');
  seed=Number(seed)>>>0;
  let state=seed;
  const random=()=>{state=(state+0x6D2B79F5)>>>0;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const shuffled=xs=>{xs=[...xs];for(let i=xs.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[xs[i],xs[j]]=[xs[j],xs[i]];}return xs;};
  const tiles=[],placements=[],paths=[];
  for(let q=-radius;q<=radius;q++)for(let r=-radius;r<=radius;r++)if(distance({q,r})<=radius)tiles.push({q,r,...point({q,r}),kind:'grass'});
  const byKey=new Map(tiles.map(t=>[key(t),t]));
  const neighbors=t=>DIRECTIONS.map(([q,r])=>byKey.get(`${t.q+q},${t.r+r}`)).filter(Boolean);
  const center=byKey.get('0,0');center.kind='courtyard';
  const inner=tiles.filter(t=>distance(t)===1);
  // A quiet shared yard and its six approaches remain unoccupied.
  for(const t of inner){t.kind='path';paths.push({from:point(center),to:point(t)});}
  const occupied=new Set();
  const put=(assetId,t,scale,rotation)=>{occupied.add(key(t));placements.push({assetId,q:t.q,r:t.r,x:t.x,z:t.z,scale,rotation});};
  const buildingSites=shuffled(tiles.filter(t=>distance(t)===2));
  const buildings=['family-home-complete','family-home-complete','shelter-complete','feed-store-complete','kitchen-garden-complete'];
  let shelter;
  for(const assetId of buildings){
    const t=buildingSites.pop();t.kind=assetId==='kitchen-garden-complete'?'garden':'building';
    const approach=shuffled(neighbors(t).filter(n=>distance(n)===1))[0];
    const dx=approach.x-t.x,dz=approach.z-t.z,len=Math.hypot(dx,dz);
    put(assetId,t,2.4,Math.atan2(dx,dz));
    paths.push({from:point(approach),to:{x:t.x+dx/len*1.3,z:t.z+dz/len*1.3}});
    if(assetId==='shelter-complete')shelter=t;
  }
  // Water occupies an edge tile, never a building or an approach.
  const edge=shuffled(tiles.filter(t=>distance(t)===radius&&!occupied.has(key(t))));
  const pond=edge[0];pond.kind='water';
  // Keep the paddock together near the shelter; no assets are placed in water.
  const pasture=shuffled(tiles.filter(t=>t.kind==='grass')).sort((a,b)=>distance(a,shelter)-distance(b,shelter));
  const animals=['horse-idle','cow-feeding','goat-idle','chicken-feeding'];
  for(const assetId of animals){const t=pasture.shift();t.kind='paddock';put(assetId,t,assetId.startsWith('chicken')?.7:1.4,random()*Math.PI*2);}
  // Woodland masses follow two seeded anchors, leaving gaps and the yard clear.
  const free=shuffled(tiles.filter(t=>t.kind==='grass'));
  if(free.length){const anchors=[free[0],free[Math.floor(free.length/2)]];
    free.sort((a,b)=>Math.min(...anchors.map(t=>distance(a,t)))-Math.min(...anchors.map(t=>distance(b,t))));
    const count=Math.min(free.length,Math.max(2,Math.floor(free.length*.65)));
    for(const t of free.slice(0,count)){t.kind='woodland';put('tree-standing',t,1.5+random()*.3,random()*Math.PI*2);}
  }
  return {seed,tiles,placements,paths};
}
