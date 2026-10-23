// Everything the Oracle knows, behind one search: game identity records, Steam study profiles,
// anatomy studies and design lessons, the art-style catalog, and the presentation styles.
import repo from '../data/repo-knowledge.json' with {type:'json'};
import styles from '../data/presentation-styles.json' with {type:'json'};
import {anatomy} from './anatomy.js';
import {catalog,search as searchCatalog} from './search.js';
export {repo,styles};

// The shared taste of Evan's favourites (GAME_IDENTITY.md, "What the five share"): the default identity
// for Abbie's World unless a brief says otherwise.
export const HOUSE_IDENTITY=[
 'Building is the verb: the player makes something, usually a diorama seen from above.',
 'The world reads as a toy or a miniature: tilt-shift, chunky bevels, warm saturated colour, matte or plastic materials.',
 'A small number of verbs with deep consequences: five or fewer core verbs.',
 'The interface hides: little HUD, little text, no leaving the world for a menu in normal play.',
 'Placement is rewarded by the world: something grows, settles, chimes or simulates within half a second.',
 'Low failure cost: no fail state, or instant retries.'
];

const STOP=new Set('a an the and or of to in on at for with my me i we us you it is are be make made game games like want let lets let\'s some that this there where when what who how about into from so very can could would please play'.split(' '));
// Words match at the start of a word, so "fight" finds "fighter"; a plural is cut to its stem first ("brutes"
// finds "brute"), and a word never matches inside another ("side" does not find "inside").
const stem=w=>w.length>4&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
export function terms(text){return [...new Set(String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>2&&!STOP.has(w)).map(stem))];}
function score(words,fields){let s=0;for(const [text,weight]of fields){const t=' '+String(text||'').toLowerCase().replace(/[^a-z0-9]+/g,' ')+' ';for(const w of words)if(t.includes(' '+w))s+=weight;}return s;}
const flat=v=>v==null?'':typeof v==='object'?Object.values(v).map(flat).join(' '):String(v);

// Compact views: enough for a search hit or a model prompt, never the whole record.
export function identityCard(r){
 return {id:r.id,kind:'identity',title:r.game?.title,steamAppId:r.game?.steam_appid??null,fantasy:r.core?.fantasy,pillars:r.core?.pillars||[],
  signatureMoment:r.core?.signature_moment,verbs:(r.layers?.mechanics?.verbs||[]).map(v=>v.verb).slice(0,5),loop:r.layers?.mechanics?.core_loop?.steps||[],antiGoals:r.core?.anti_goals||[],
  signatures:(r.core?.signatures||[]).map(s=>({id:s.id,layer:s.layer,description:s.description,class:s.class})),
  take:(r.assimilation?.take||[]).map(t=>({layer:t.layer,target:t.target,setting:t.setting})),leave:r.assimilation?.leave||[],
  expression:(r.ledger?.expression||[]).map(e=>typeof e==='string'?e:e.description||e.id),file:r.file};
}
export function profileCard(p){
 return {id:p.id,kind:'steam-profile',title:p.name,steamAppId:p.appid,developers:p.developers||[],genres:p.genres||[],summary:p.short_description,feel:p.identity?.ui_and_game_feel||null,dna:p.dna?.axes||null,study:p.study||null,engine:p.install?.engine||null,storeUrl:p.store_url,file:p.file};
}
function anatomyCard(g){return {id:g.id,kind:g.kind==='design-lesson'?'lesson':'anatomy',title:g.title,genre:g.genre,lesson:g.lesson||null,findings:(g.claims||[]).slice(0,6).map(c=>({domain:c.domain,title:c.title,finding:c.finding})),studyUrl:`https://abbies-game-oracle.vercel.app/game-anatomy?game=${g.id}`};}

export function getIdentity(id){
 const r=repo.identities.find(x=>x.id===id||String(x.game?.steam_appid)===String(id));if(r)return {record:r,profile:((r.game?.steam_appid!=null?repo.profiles.find(p=>p.appid===r.game.steam_appid):repo.profiles.find(p=>p.appid==null&&p.id===r.id)))||null};
 const p=repo.profiles.find(x=>x.id===id||String(x.appid)===String(id));return p?{record:null,profile:p}:null;
}

// One ranked list across every kind of knowledge.
export function searchKnowledge({q='',kinds=['identity','steam-profile','anatomy','lesson','catalog','style'],limit=12}={}){
 const words=terms(q),hits=[];
 if(kinds.includes('identity'))for(const r of repo.identities)hits.push({s:score(words,[[r.game?.title,8],[r.core?.fantasy,3],[(r.core?.pillars||[]).join(' '),3],[flat(r.core?.signatures),2],[flat(r.layers),1],[flat(r.assimilation),2]]),card:identityCard(r)});
 if(kinds.includes('steam-profile'))for(const p of repo.profiles)hits.push({s:score(words,[[p.name,8],[(p.genres||[]).join(' '),2],[p.short_description,2],[[p.identity?.core_loop,p.identity?.ui_and_game_feel,p.identity?.lessons_for_abbies_world,p.review].filter(Boolean).join(' '),1]]),card:profileCard(p)});
 for(const g of anatomy.games){const kind=g.kind==='design-lesson'?'lesson':'anatomy';if(!kinds.includes(kind))continue;hits.push({s:score(words,[[g.title,8],[g.genre,3],[g.lesson,2],[flat((g.claims||[]).map(c=>[c.title,c.finding,c.domain])),1]]),card:anatomyCard(g)});}
 if(kinds.includes('style'))for(const st of styles.styles)hits.push({s:score(words,[[st.name,6],[st.keywords.join(' '),4],[st.summary,1],[st.references.join(' '),3]]),card:{id:st.id,kind:'style',title:st.name,summary:st.summary,references:st.references}});
 if(kinds.includes('catalog')&&q){const c=searchCatalog({q,limit:6});for(const g of c.results)hits.push({s:Math.min(g.score,12)*0.5,card:{id:g.id,kind:'catalog',title:g.name,steamAppId:g.steamAppId,styles:g.styles,ownership:g.ownership,installed:g.installation?.present||false,summary:g.summary}});}
 const ranked=hits.filter(h=>!words.length||h.s>0).sort((a,b)=>b.s-a.s||String(a.card.title).localeCompare(String(b.card.title)));
 return {query:q,terms:words,total:ranked.length,results:ranked.slice(0,Math.min(50,Math.max(1,limit))).map(h=>({...h.card,score:Math.round(h.s*10)/10}))};
}

// The Steam library index: the installed-games snapshot joined to the catalog, profiles and identity records.
export function steamLibrary({q='',installed}={}){
 const byApp=new Map(catalog.games.map(g=>[String(g.steamAppId),g]));
 const installedIds=new Set(repo.installed.map(g=>String(g.appid)));
 const rows=[...new Set([...installedIds,...catalog.games.filter(g=>g.ownership==='owned-snapshot').map(g=>String(g.steamAppId))])].map(appid=>{
  const inst=repo.installed.find(g=>String(g.appid)===appid),cat=byApp.get(appid);
  return {steamAppId:appid,name:inst?.name||cat?.name,installed:installedIds.has(appid),sizeGb:inst?.size_gb??null,
   ownership:cat?.ownership||'unverified',styles:cat?.styles||null,catalogId:cat?.id||null,
   identity:repo.identities.some(r=>String(r.game?.steam_appid)===appid),profile:repo.profiles.some(p=>String(p.appid)===appid)};
 }).filter(r=>r.name);
 const words=terms(q);
 const filtered=rows.filter(r=>(installed===undefined||r.installed===installed)&&(!words.length||words.every(w=>r.name.toLowerCase().includes(w)||flat(r.styles).toLowerCase().includes(w))));
 filtered.sort((a,b)=>a.name.localeCompare(b.name));
 return {snapshot:{installed:'2026-10-22 (tools/steam-study list)',ownership:catalog.meta.ownershipSnapshotDate},counts:{rows:rows.length,installed:rows.filter(r=>r.installed).length,owned:rows.filter(r=>r.ownership==='owned-snapshot').length,identities:repo.identities.length,profiles:repo.profiles.length},total:filtered.length,results:filtered};
}
