import * as T from '../vendor/three.module.js';
export {SUGAR_SHACK} from './sugar-shack-spec.mjs';
// A reusable asset in metres; placement, terrain and access belong to the scene planner.
export function sugarShack({seed=1,width=5,depth=4.2,height=2.7}={}){
 const root=new T.Group();root.name='Maple sugar shack';const palette={wood:seed%2?'#926346':'#a77450',trim:'#e1c99a',roof:'#487779',stone:'#8d9184',dark:'#493a2b',metal:'#899b99',amber:'#bf7437'};
 const mats=Object.fromEntries(Object.entries(palette).map(([k,color])=>[k,new T.MeshStandardMaterial({color,roughness:.9})]));
 function mesh(g,k,x,y,z){const o=new T.Mesh(g,mats[k]);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;root.add(o);return o;}
 const box=(k,x,y,z,w,h,d)=>mesh(new T.BoxGeometry(w,h,d),k,x,y,z);
 box('stone',0,.15,0,width+.3,.3,depth+.3);box('wood',0,height/2+.3,0,width,height,depth);
 // Gabled roof follows width/height parameters instead of a fixed outline.
 const pitch=.62,rise=width/2*Math.tan(pitch),ridge=height+.3+rise,slant=(width/2+.35)/Math.cos(pitch);
 for(const sign of [-1,1]){const roof=box('roof',sign*width/4,ridge-rise/2,0,slant,.16,depth+.65);roof.rotation.z=-sign*pitch;}
 for(const z of [-depth/2-.01,depth/2+.01]){const shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(0,rise);shape.closePath();const g=new T.ShapeGeometry(shape);const face=mesh(g,'wood',0,height+.3,z);if(z<0)face.rotation.y=Math.PI;}
 for(let x=-width/2+.15;x<width/2;x+=.38)box('trim',x,height/2+.3,depth/2+.025,.035,height,.035);
 box('dark',0,1.25,depth/2+.06,1.1,1.9,.09);box('trim',0,2.25,depth/2+.11,1.35,.12,.13);
 for(const x of [-1.5,1.5]){box('trim',x,1.85,depth/2+.07,.95,.95,.1);box('amber',x,1.85,depth/2+.13,.77,.77,.03);box('trim',x,1.85,depth/2+.16,.05,.8,.03);box('trim',x,1.85,depth/2+.16,.8,.05,.03);}
 box('wood',0,ridge+.25,0,1.2,.65,1.1);box('roof',0,ridge+.65,0,1.5,.15,1.4);for(const x of [-.61,.61])box('dark',x,ridge+.26,0,.04,.28,.78);
 box('wood',0,.24,depth/2+.75,width+.6,.18,1.4);box('trim',0,.1,depth/2+1.55,1.8,.2,.45);
 for(const x of [-width/2,width/2])box('trim',x,1.4,depth/2+1.15,.13,2.5,.13);
 const awning=box('roof',0,2.65,depth/2+.65,width+.6,.12,1.5);awning.rotation.x=.12;
 for(const x of [-1.75,1.75]){mesh(new T.CylinderGeometry(.35,.32,.75,10),'wood',x,.71,depth/2+.7);for(const y of [.45,.95])mesh(new T.CylinderGeometry(.36,.36,.055,10),'metal',x,y,depth/2+.7);}
 for(let row=0;row<3;row++)for(let col=0;col<4-row;col++){const log=mesh(new T.CylinderGeometry(.14,.14,1.15,7),'dark',-width/2-.6,.35+row*.25,-1+col*.29+row*.14);log.rotation.z=Math.PI/2;}
 box('trim',1.5,2.7,depth/2+.21,.9,.42,.1);
 root.userData.inspect={title:'Maple sugar shack',kind:'New England point of interest',description:'A seasonal sugaring shed and year-round sightseeing stop. Nearby tiles favor visits during leisure time; arriving visitors earn a small wellbeing benefit.'};
 return root;
}
