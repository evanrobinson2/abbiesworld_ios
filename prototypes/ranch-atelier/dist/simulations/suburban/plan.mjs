// Metres throughout. Reference-inspired geometry, not a cadastral reconstruction.
export function planSuburb(seed=214){
 let n=seed>>>0;const random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const homes=[],nodes={'cemetery#gate':{x:0,y:0,z:17}},adj={'cemetery#gate':[]},roads=[];
 const add=(id,x,z)=>{nodes[id]={x,y:0,z};adj[id]=[];return id;};
 const edge=(a,b,width=1.7)=>{const cost=Math.hypot(nodes[a].x-nodes[b].x,nodes[a].z-nodes[b].z);adj[a].push({id:b,cost});adj[b].push({id:a,cost});roads.push({a:nodes[a],b:nodes[b],width});};
 let prev='cemetery#gate';for(const z of [35,70,105,140,175,195,210]){const id=add('road'+z,0,z);edge(prev,id,6);prev=id;}
 const tiles=[0,70,140,210].map((z,i)=>({id:'hex'+i,x:0,z,label:['Cemetery','Alder lane','Supply corner','Sherman-inspired close'][i]}));
 function home(id,x,z,angle,hub){const width=8+random()*2,depth=10+random()*2;const front={x:x+Math.sin(angle)*(depth/2+2),z:z+Math.cos(angle)*(depth/2+2)};const door=add(id,front.x,front.z);edge(hub,door);homes.push({id,x,z,angle,width,depth,height:6.5+random(),color:['#a0ad94','#b5bdba','#b9ae96','#8eaaa6'][Math.floor(random()*4)],front,deck:random()>.4});}
 // Cul-de-sac frontage surrounds a turning bulb; each door has its own connected path.
 for(let i=0;i<6;i++){const a=(-.15+i/5*1.3)*Math.PI;const x=Math.cos(a)*25,z=210+Math.sin(a)*25;home('home'+i,x,z,Math.atan2(-x,210-z),'road210');}
 for(const z of [70,140])for(const side of [-1,1])home('home'+homes.length,side*(21+random()*3),z+(random()-.5)*9,side<0?Math.PI/2:-Math.PI/2,'road'+z);
 return {seed,homes,tiles,roads,nodes,adj,home:'home0',supply:'home8',refuge:'home0',graph:{nodes,adj,hubs:{},obstacles:[],signature:'suburb-'+seed,heightAt:()=>0}};
}
export function extendSuburbGraph(graph,plan){for(const [id,p]of Object.entries(plan.nodes))if(id!=='cemetery#gate'){graph.nodes[id]={...p};graph.adj[id]=[];}for(const [id,edges]of Object.entries(plan.adj))for(const e of edges)graph.adj[id].push({...e});graph.signature+='-suburb-'+plan.seed;}
