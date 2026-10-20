import * as T from './vendor/three.module.js';
import {themes} from './app-style-presets.mjs';
const owned=new WeakSet();
export function appearanceIndex(){const n=Number(document.documentElement.dataset.appStyle)-1;return Number.isInteger(n)&&themes[n]?n:7;}
export function applyWorldAppearance(root,index=appearanceIndex()){
 const t=themes[index]||themes[7],original=index===7;
 if(root.isScene){if(root.background?.isColor)root.background.set(original?'#e7ecde':t[4]);if(root.fog)root.fog.color.set(original?'#e7ecde':t[4]);}
 root.traverse(o=>{
  if(o.isLight){o.userData.appearanceBase??={color:o.color.getHex(),ground:o.groundColor?.getHex()};const b=o.userData.appearanceBase;o.color.set(original?b.color:t[5]);if(o.groundColor)o.groundColor.set(original?b.ground:t[11]);return;}
  if(!o.isMesh||!o.material)return;
  const style=m=>{
   if(!m.color)return m;
   if(!owned.has(m)){m=m.clone();owned.add(m);}
   m.userData.worldAppearanceBase??={color:m.color.getHex(),roughness:m.roughness};
   const base=m.userData.worldAppearanceBase,c=new T.Color(base.color),hsl=c.getHSL({});
   if(original)m.color.copy(c);
   else if(o.userData.environment)m.color.set(t[4]);
   else if(m.vertexColors)m.color.set(t[11]).lerp(new T.Color('#ffffff'),.45);
   else {const swatch=hsl.h>.15&&hsl.h<.48?t[11]:hsl.h>.48&&hsl.h<.78?t[12]:hsl.s<.12?t[5]:t[13];const target=new T.Color(swatch);m.color.copy(c).lerp(target,.78);}
   if(base.roughness!==undefined)m.roughness=original?base.roughness:.82;
   return m;
  };
  o.material=Array.isArray(o.material)?o.material.map(style):style(o.material);
 });
}
