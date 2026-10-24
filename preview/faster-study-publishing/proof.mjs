import {volunteer, readManifest} from './components/presentation-layer.mjs';
let count=0;
function update(){count++;const signal=count%2?'The study garden is awake':'The study garden is resting';volunteer('study-publication-proof',{place:'Study garden',dialect:'Ranch',items:[{id:'garden-state',says:'The garden is awake',kind:'state',who:'player',for:['grown-up'],prefer:['none'],read:()=>signal}]});const data=readManifest('study-publication-proof')[0];document.querySelector('#component-state').textContent=data.items[0].value;document.querySelector('#component-result').textContent=`Shared component loaded · ${data.place} · change ${count}`;window.StudyReview?.changed(signal);window.RanchView?.changed()}
document.querySelector('#change-signal').addEventListener('click',update);update();
const attach=()=>window.StudyReview.addControl(document.querySelector('#change-signal'));
if(window.StudyReview)attach();else addEventListener('study-review-ready',attach,{once:true});
window.RanchView?.register('publication-component-proof',()=>({changes:count,component:'presentation-layer.mjs',scene:readManifest('study-publication-proof')}));
