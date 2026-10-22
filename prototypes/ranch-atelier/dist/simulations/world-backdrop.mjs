import * as T from './vendor/three.module.js';
// Swappable painted backdrops behind the world. Add a painting by dropping it in ./assets and listing it here.
export const BACKDROPS=[
 {id:'sky',label:'Open sky'},
 {id:'custom',label:'Your picture…'}
];
const KEY='sandbox-world-backdrop-v1',CUSTOM='sandbox-world-backdrop-custom-v1';
export function createWorldBackdrop({onChange=()=>{}}={}){
 let choice='sky',custom=null;const textures=new Map(),loading=new Set();
 try{const saved=localStorage.getItem(KEY);if(BACKDROPS.some(b=>b.id===saved))choice=saved;custom=localStorage.getItem(CUSTOM);}catch{}
 if(choice==='custom'&&!custom)choice='sky';
 function urlFor(theme){const id=choice;if(id==='custom')return custom;return BACKDROPS.find(b=>b.id===id)?.url||null;}
 function texture(theme){const url=urlFor(theme);if(!url)return null;if(textures.has(url))return textures.get(url);if(!loading.has(url)){loading.add(url);new T.TextureLoader().load(url,t=>{t.colorSpace=T.SRGBColorSpace;textures.set(url,t);loading.delete(url);onChange();},undefined,()=>loading.delete(url));}return null;}
 function set(id){choice=id;try{localStorage.setItem(KEY,id);}catch{}sync();onChange();}
 // Shrink large uploads so they fit in browser storage and stay cheap to draw.
 async function adopt(file){const bitmap=await createImageBitmap(file),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();const url=canvas.toDataURL('image/webp',.86);if(custom&&textures.has(custom)){textures.get(custom).dispose();textures.delete(custom);}custom=url;try{localStorage.setItem(CUSTOM,url);}catch{status.textContent='Too large to remember after reload';}set('custom');}
 const picker=document.createElement('div');picker.className='world-backdrop-picker';picker.innerHTML='<span>Backdrop</span><div class="world-backdrop-options" role="radiogroup" aria-label="World backdrop"></div><input type="file" accept="image/*" hidden><small role="status"></small>';
 const options=picker.querySelector('.world-backdrop-options'),file=picker.querySelector('input'),status=picker.querySelector('small');
 for(const b of BACKDROPS){const button=document.createElement('button');button.type='button';button.dataset.backdrop=b.id;button.setAttribute('role','radio');button.textContent=b.label;if(b.url)button.style.setProperty('--thumb',`url("${b.url}")`);button.onclick=()=>{if(b.id==='custom'){file.click();return;}set(b.id);};options.append(button);}
 file.onchange=()=>{const f=file.files[0];file.value='';if(f)adopt(f).catch(e=>{status.textContent='Could not use that picture: '+e.message;});};
 function sync(){for(const b of options.children){b.setAttribute('aria-checked',String(b.dataset.backdrop===choice));if(b.dataset.backdrop==='custom'&&custom)b.style.setProperty('--thumb',`url("${custom}")`);}}
 sync();
 const style=document.createElement('style');style.textContent='.world-backdrop-picker{display:grid;gap:6px;margin:10px 0 4px;font:12px var(--app-font,system-ui);color:var(--app-ink)}.world-backdrop-picker>span{font-weight:600}.world-backdrop-options{display:grid;grid-template-columns:1fr 1fr;gap:6px}.world-backdrop-options button{min-height:44px;padding:6px 8px;border:1px solid var(--app-border);border-radius:8px;background:var(--thumb,none) center/cover,var(--app-paper);color:var(--app-ink);font:inherit;text-align:left;text-shadow:0 0 3px var(--app-paper),0 0 6px var(--app-paper)}.world-backdrop-options button[aria-checked=true]{outline:2px solid var(--app-accent,#b84931);outline-offset:1px}.world-backdrop-picker small:empty{display:none}';document.head.append(style);
 return {texture,picker,get choice(){return choice;},set,adopt};
}
