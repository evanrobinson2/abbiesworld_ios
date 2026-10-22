import {profiler} from './simulation-profiler.mjs';
export function attachDiagnostics(renderer,context){
 if(!new URLSearchParams(location.search).has('profile'))return;
 const button=document.createElement('button');button.textContent='Performance diagnostics';button.setAttribute('aria-label','Performance diagnostics');button.title='Browser CPU diagnostics';button.type='button';const mount=()=>{const footer=document.querySelector('#app-settings .appearance-footer');if(!footer)return false;footer.append(button);return true;};if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});}
 const dialog=document.createElement('dialog');dialog.style.cssText='max-width:min(850px,90vw);max-height:80vh;overflow:auto;background:var(--app-paper,#fbf7ed);color:var(--app-ink,#302b23);border:1px solid var(--app-border,#d5c9aa);border-radius:16px;padding:16px;font:14px var(--app-font,system-ui)';
 const title=document.createElement('h2');title.textContent='Browser performance';title.style.fontFamily='var(--app-heading,Georgia)';
 const note=document.createElement('p');note.textContent='Opt-in CPU timings add measurement overhead. Nested scopes overlap: do not add them. Render submission is CPU work, not GPU duration. Reports stay on this device.';
 const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;font-size:12px';
 const refresh=document.createElement('button');refresh.textContent='Refresh';const reset=document.createElement('button');reset.textContent='Reset sample';const download=document.createElement('button');download.textContent='Download JSON';const close=document.createElement('button');close.textContent='Close';
 const report=()=>({schema:1,capturedAt:new Date().toISOString(),url:location.origin+location.pathname,context:context(),timings:profiler.report(),render:JSON.parse(renderer.domElement.dataset.performance||'{}')});
 refresh.onclick=()=>output.textContent=JSON.stringify(report(),null,2);reset.onclick=()=>{profiler.reset();refresh.click();};button.onclick=()=>{refresh.click();dialog.showModal();};close.onclick=()=>dialog.close();
 download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='simulation-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};dialog.append(title,note,refresh,reset,download,close,output);document.body.append(dialog);
}
