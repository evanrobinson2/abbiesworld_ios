// Read existing care state. Never infer a completed task from an animation/emoji.
export function careVisuals(state) {
 return state.pens.map(p=>({id:p.id,waterLitres:p.water,feedKg:p.feed,
  waterFraction:Math.max(0,Math.min(1,p.water/p.capacity)),
  feedVariant:p.feed<=0?'hay-empty':p.feed<p.capacity/2?'hay-partial':'hay-full',
  visits:p.visits,waiting:p.animals.filter(a=>a.activity==='Waiting for care').length}));
}
export function createCareCues() {
 let previous=new Map();
 return {
  // First observation establishes a baseline; loading a save is not a delivery.
  observe(state){
   const events=[];const next=new Map();
   for(const p of state.pens){
    const old=previous.get(p.id);next.set(p.id,{visits:p.visits,water:p.water,feed:p.feed});
    if(old&&p.visits>old.visits)events.push({siteId:p.id,kind:'delivery',deliveries:p.visits-old.visits,
     waterNetChange:p.water-old.water,feedNetChange:p.feed-old.feed,
     activity:'Care delivery completed',note:'Net stock change includes consumption between observations.'});
   }
   previous=next;return {events,visuals:careVisuals(state)};
  },
  reset(){previous.clear();},
 };
}
