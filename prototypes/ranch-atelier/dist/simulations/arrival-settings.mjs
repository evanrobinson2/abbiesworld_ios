// Labels, limits and defaults are shared by the modal and renderer.
const duration=()=>({key:'duration',label:'Duration',min:.5,max:10,step:.1,value:1,unit:'s'});
export const ARRIVAL_SETTINGS={
 hologram:[duration(),{key:'hold',label:'Blueprint hold',min:0,max:3,step:.1,value:.2,unit:'s'},{key:'scan',label:'Scan lines',min:0,max:1,step:.05,value:.6,unit:'%'}],
 laser:[duration(),{key:'beam',label:'Beam width',min:.004,max:.035,step:.001,value:.012,unit:'%'},{key:'sparks',label:'Sparks',min:0,max:1,step:.05,value:.65,unit:'%'}],
 space:[duration(),{key:'height',label:'Flight height',min:20,max:140,step:5,value:80,unit:'m'},{key:'spin',label:'Turn',min:0,max:1,step:.05,value:.35,unit:'turns'},{key:'stagger',label:'Stagger',min:0,max:.55,step:.05,value:.25,unit:'%'}],
 quantum:[duration(),{key:'spread',label:'Burst radius',min:.05,max:.6,step:.025,value:.24,unit:'%'},{key:'spin',label:'Part rotation',min:0,max:1,step:.05,value:.4,unit:'turns'}],
 storybook:[duration(),{key:'curl',label:'Page curl',min:0,max:1,step:.05,value:.55,unit:'%'},{key:'pop',label:'Pop-up pace',min:0,max:1,step:.05,value:.5,unit:'%'}],
 organic:[duration(),{key:'wave',label:'Growth variation',min:0,max:.08,step:.005,value:.035,unit:'%'},{key:'glow',label:'Growing tips',min:0,max:1,step:.05,value:.45,unit:'%'}]
};
export function arrivalOptions(mode,values={}){return Object.fromEntries((ARRIVAL_SETTINGS[mode]||ARRIVAL_SETTINGS.hologram).map(p=>[p.key,Math.max(p.min,Math.min(p.max,Number.isFinite(Number(values?.[p.key]))?Number(values?.[p.key]):p.value))]));}
