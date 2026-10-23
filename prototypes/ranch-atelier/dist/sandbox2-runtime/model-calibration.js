// Shared project metre defaults. Artistic size targets, not user approvals.
// One factor per subject preserves construction stages and animated poses.
export const FAMILY_CALIBRATIONS=Object.freeze({
 'shelter':2,'family-home':2,'feed-store':2,'water-point':1,'cattle-shelter':2,'goat-shelter':1.5,'chicken-coop':1,'kitchen-garden':2,
 'horse':1,'cow':1,'goat':.5,'chicken':.35,'tree':2,'marley':.55,
 'wood':1,'hay':1,'ration':.7,'water-trough':1,'water-bucket':.4,'compost':1,
 'abbie':1,'ani':1,'mommy':1,'daddy':1,'jeff':1,'alexis':1
});
export const PROJECT_CALIBRATIONS=Object.freeze(Object.fromEntries(['planned','foundation','frame','roof','complete'].map(state=>['shelter-'+state,2])));
export function modelFamily(id){return Object.keys(FAMILY_CALIBRATIONS).find(f=>id===f||id.startsWith(f+'-'))??null;}
export function projectScale(id){return FAMILY_CALIBRATIONS[modelFamily(id)]??null;}
export const CALIBRATION_KEY='ranch-model-calibration-v1';
export function readCalibrations(){if(calibrationStatus.state==='synced')return Object.fromEntries(Object.entries(cloudEntries).filter(([,r])=>Number.isFinite(r.metresPerUnit)&&r.metresPerUnit>0));try{const v=JSON.parse(localStorage.getItem(CALIBRATION_KEY));return v?.version===1&&v.models&&typeof v.models==='object'&&!Array.isArray(v.models)?v.models:{};}catch{return {};}}
export function calibratedScale(id){const v=(calibrationStatus.state==='synced'?cloudEntries[id]:readCalibrations()[id])?.metresPerUnit;return Number.isFinite(v)&&v>0?v:projectScale(id);}
export function modelDimensions(id,size){const factor=calibratedScale(id)??1;return {w:size.x*factor,h:size.y*factor,d:size.z*factor,metresPerUnit:factor};}

let cloudEntries={},syncPromise=null,pendingWrites=0;
export const calibrationStatus={state:'loading',error:null};
function emit(){if(typeof window!=='undefined')window.dispatchEvent(new Event('ranch-model-calibration'));}
function cacheCloud(){const models=Object.fromEntries(Object.entries(cloudEntries).filter(([,r])=>Number.isFinite(r.metresPerUnit)&&r.metresPerUnit>0));try{localStorage.setItem(CALIBRATION_KEY,JSON.stringify({version:1,units:'metres',remoteSynced:true,models}));}catch{}emit();}
function pairKey(){try{return localStorage.getItem('ranch-view-pair-v1')}catch{return null}}
async function request(body){const key=pairKey();if(!key)throw Error('Pair this browser before saving shared model sizes.');const response=await fetch('/api/model-calibrations',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Shared save failed');return data;}
export function refreshCalibrations(){if(pendingWrites)return Promise.resolve();if(syncPromise)return syncPromise;syncPromise=(async()=>{
 try{let legacy={};try{const old=JSON.parse(localStorage.getItem(CALIBRATION_KEY));if(old&&!old.remoteSynced)legacy=readCalibrations();}catch{}
 const response=await fetch('/api/model-calibrations',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Shared sizes unavailable; using cached sizes.');const data=await response.json();
 const next=data.models||{};
 // Keep a separate backup before migrating browser-only approvals and sizes.
 if(Object.keys(legacy).length){try{if(!localStorage.getItem('ranch-model-calibration-legacy-backup'))localStorage.setItem('ranch-model-calibration-legacy-backup',JSON.stringify(legacy));}catch{}
 for(const [id,r]of Object.entries(legacy)){if(id in next||!Number.isFinite(r.metresPerUnit)||r.metresPerUnit<=0)continue;const saved=await request({id,metresPerUnit:r.metresPerUnit,approved:!!r.approvedAt});next[id]=saved.record;}}
 const changed=calibrationStatus.state!=='synced'||JSON.stringify(cloudEntries)!==JSON.stringify(next);cloudEntries=next;calibrationStatus.state='synced';calibrationStatus.error=null;if(changed||Object.keys(legacy).length)cacheCloud();
 }catch(e){calibrationStatus.state='offline';calibrationStatus.error=e.message;}
 })().finally(()=>syncPromise=null);return syncPromise;}
async function commit(id,metresPerUnit,approved){
 pendingWrites++;if(syncPromise)await syncPromise;
 try{const result=await request({id,metresPerUnit,approved,expectedRevision:cloudEntries[id]?.revision});cloudEntries[id]=result.record;calibrationStatus.state='synced';calibrationStatus.error=null;cacheCloud();}
 catch(e){calibrationStatus.state='error';calibrationStatus.error=e.message;throw e;}finally{pendingWrites--;}
}
export function saveCalibration(id,metresPerUnit,{approved=false}={}){if(!Number.isFinite(metresPerUnit)||metresPerUnit<=0)throw Error('Scale must be a finite positive number.');return commit(id,metresPerUnit,approved);}
export function clearCalibration(id){return commit(id,null,false);}
// Every original-model consumer waits for the shared registry before first render.
if(typeof document!=='undefined'){
 await refreshCalibrations();
 window.addEventListener('focus',()=>refreshCalibrations());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCalibrations()});
 setInterval(()=>{if(!document.hidden)refreshCalibrations()},30000);
}
