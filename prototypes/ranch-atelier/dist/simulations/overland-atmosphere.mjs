// Broad overlapping volumes conceal upper slopes, not just a tiny lid on each tip.
export function summitClouds(peaks,k=1){return peaks.flatMap((p,j)=>Array.from({length:29},(_,i)=>{
 const a=i*2.399963+j*.7,r=Math.sqrt(i/28)*p.footprintRadius*1.08;
 return {x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r*.75,y:p.summitHeight*(.89+(i%4)*.035),
  sx:(35+i%5*6)*k,sy:(19+i%4*5)*k,sz:(25+i%3*8)*k};
}));}
export function woodlandDetails(plan,heightAt){
 const trees=[],shrubs=[],rocks=[],used=[];
 const parents=plan.items.filter(p=>['WW-140','WW-139','WW-147','WW-151'].includes(p.asset));
 for(const [n,p]of parents.entries())for(let j=0;j<8;j++){
  const a=j*2.399963+n*.7,r=(5+Math.sqrt(j)*2.3)*plan.k,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
  const tree=j<3,radius=(tree?1.6:.65)*plan.k;
  if(!plan.clear(x,z,radius)||plan.clearings.some(c=>Math.hypot(c.x-x,c.z-z)<c.r)||used.some(q=>Math.hypot(q.x-x,q.z-z)<radius+q.radius)||heightAt.slope(x,z)>3.8)continue;
  const point={x,z,y:heightAt(x,z),radius,size:(tree?5+(n+j)%6:1+(n+j)%3*.35)*plan.k,pine:p.asset==='WW-140',angle:a};used.push(point);
  (tree?trees:j===7?rocks:shrubs).push(point);
 }
 return {trees,shrubs,rocks};
}
