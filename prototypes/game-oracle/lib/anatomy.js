import baseAnatomy from '../data/game-anatomy.json' with {type:'json'};
import lessons from '../data/design-lessons.json' with {type:'json'};
const anatomy={...baseAnatomy,revision:baseAnatomy.revision+'+'+lessons.revision,games:[...lessons.studies,...baseAnatomy.games],counts:{...baseAnatomy.counts,findings:baseAnatomy.counts.findings+lessons.studies.reduce((n,g)=>n+g.claims.length,0)}};
export {anatomy};
export function searchAnatomy({q='',genre='',domain='',limit=30,offset=0}={}){
 const query=q.trim().toLowerCase();
 const matches=anatomy.games.filter(g=>(!genre||g.genre===genre)&&(!domain||g.claims.some(c=>c.domain===domain))&&(!query||JSON.stringify([g.title,g.genre,g.claims,g.nextPass]).toLowerCase().includes(query)));
 return {revision:anatomy.revision,total:matches.length,offset,limit,results:matches.slice(offset,offset+limit).map(({id,title,genre,status,fileCount,claims,inventoryUrl,runtimeObserved})=>({id,title,genre,status,fileCount,findings:claims.length,inventoryUrl,runtimeObserved,studyUrl:`https://abbies-game-oracle.vercel.app/game-anatomy?game=${id}`}))};
}
