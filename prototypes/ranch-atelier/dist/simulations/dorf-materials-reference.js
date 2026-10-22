import * as T from 'three';
// House albedo translated from shader 1112/004-ps, material CB2 offsets
// and its assigned textures. Lighting is a browser approximation of Unity URP.
const textures=new Map();
async function tex(file){if(!file)return null;if(!textures.has(file))textures.set(file,new T.TextureLoader().loadAsync('/reference-assets/dorfromantik/'+file));const t=await textures.get(file);t.colorSpace=T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;return t;}
const rgb=(m,key,fallback)=>{const c=m.colors?.[key];return c?new T.Vector3(c.r,c.g,c.b):new T.Vector3(...fallback);};
const pair=(m,key,fallback)=>{const c=m.colors?.[key];return c?new T.Vector2(c.r,c.g):new T.Vector2(...fallback);};
export async function recoveredModel(meta,painted,wire,registry){
 const data=await(await fetch('/reference-assets/dorfromantik/'+meta.shaderData)).json();
 const g=new T.BufferGeometry();for(const [name,key,size] of [['position','position',3],['normal','normal',3],['uv','uv',2],['materialID','color',4]])g.setAttribute(name,new T.Float32BufferAttribute(name==='materialID'?data[key].map(v=>v>1?v/255:v):data[key],size));
 g.computeBoundingBox();g.translate(0,-g.boundingBox.min.y,0);
 const m=data.material||{},house=meta.category==='Houses',tree=meta.category==='Trees';
 let mat;
 if(house){
 const [paint,mask]=await Promise.all([tex(m.textures?._Tex),tex(m.textures?.Houses_Outline_Mask)]);
 mat=new T.MeshLambertMaterial({color:'#ffffff',wireframe:wire});const enabled={value:painted?1:0};mat.userData.paint=enabled;
 mat.onBeforeCompile=s=>{
 Object.assign(s.uniforms,{uDorfPaint:{value:paint},uDorfMask:{value:mask},uRecovered:enabled,uWall:{value:rgb(m,'_WallCol',[.79,.68,.57])},uRoof:{value:rgb(m,'_RoofCol',[.83,.4,.36])},uWindow:{value:rgb(m,'_WindowCol',[.55,.64,.77])},uDetail:{value:rgb(m,'_DetailCol',[1,.74,.84])},uDetail2:{value:rgb(m,'_DetailCol2',[0,0,0])},uOutline:{value:rgb(m,'OutlineColor',[0,0,0])},uAO:{value:rgb(m,'_AOCol',[.61,.55,.57])},uMultiply:{value:rgb(m,'_MultiplyCol',[.28,.25,.25])},uInTex:{value:pair(m,'_RemapInTex',[.41,.96])},uOutTex:{value:pair(m,'_RemapOutTex',[.23,1.12])},uIn:{value:pair(m,'_RemapIn',[.03,.6])},uOut:{value:pair(m,'_RemapOut',[-.02,1.12])},uContrast:{value:m.floats?._Contrast??.95}});
 s.vertexShader='attribute vec4 materialID; varying vec4 vMaterialID; varying vec2 vDorfUV;\n'+s.vertexShader;
 s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMaterialID=materialID;vDorfUV=uv;');
 s.fragmentShader=`varying vec4 vMaterialID;varying vec2 vDorfUV;uniform sampler2D uDorfPaint,uDorfMask;uniform float uRecovered,uContrast;uniform vec3 uWall,uRoof,uWindow,uDetail,uDetail2,uOutline,uAO,uMultiply;uniform vec2 uInTex,uOutTex,uIn,uOut;
 float idMatch(vec3 id){return max(0.,1.-distance(vMaterialID.rgb,id)*100000.);}
 vec3 toLinear(vec3 c){return mix(c/12.92,pow(max((c+.055)/1.055,vec3(0.)),vec3(2.4)),step(vec3(.04045),c));}
 `+s.fragmentShader;
 s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec4 paint=texture2D(uDorfPaint,vDorfUV);
 vec3 base=idMatch(vec3(1,0,0))*uRoof+idMatch(vec3(0,1,0))*uWall+idMatch(vec3(0,0,1))*uWindow+idMatch(vec3(1,0,1))*uDetail+idMatch(vec3(1,1,0))*uDetail2;
 vec3 remapped=(paint.rgb-uInTex.x)/(uInTex.y-uInTex.x)*(uOutTex.y-uOutTex.x)+uOutTex.x;
 vec3 over=mix(2.*base*remapped,1.-2.*(1.-base)*(1.-remapped),step(vec3(.500001),base));
 vec3 col=mix(base,over,uContrast);
 float brightness=(paint.r-uIn.x)/(uIn.y-uIn.x)*(uOut.y-uOut.x)+uOut.x;
 col=mix(col,1.-(1.-uMultiply)*(1.-col),brightness);
 col=mix(col,col*uAO,abs(1.-paint.a));
 col=mix(col,uOutline,texture2D(uDorfMask,vDorfUV).r);
 diffuseColor.rgb=toLinear(clamp(mix(paint.rgb,col,uRecovered),0.,1.));`);
 };mat.customProgramCacheKey=()=> 'dorf-house-recovered-v1';
 }else if(tree){
 // Shader1084/002-ps: gradient noise, self-overlay, view-dependent shading,
 // antialiased UV trunk band and Fresnel ink. Snow/wind omitted in this study.
 // Summer colors are a reference-image hypothesis; stored MAT_Trees is autumnal.
 const enabled={value:painted?1:0};
 mat=new T.ShaderMaterial({wireframe:wire,uniforms:{uRecovered:enabled,uLeaf1:{value:new T.Vector3(.44,.62,.34)},uLeaf2:{value:new T.Vector3(.28,.46,.32)},uTrunk:{value:rgb(m,'TreeColor_3',[.19,.067,0])},uInk:{value:rgb(m,'Tree_OutlineColor',[0,.066,.013])},uThickness:{value:m.floats?._Outline_Thickness??.46}},vertexShader:`varying vec2 vUV;varying vec3 vN;varying vec3 vV;varying float vLocalNY;
 void main(){vUV=uv;vN=normalize(normalMatrix*normal);vec4 view=modelViewMatrix*vec4(position,1.);vV=-view.xyz;vLocalNY=normal.y;gl_Position=projectionMatrix*view;}`,fragmentShader:`
 varying vec2 vUV;varying vec3 vN,vV;varying float vLocalNY;uniform vec3 uLeaf1,uLeaf2,uTrunk,uInk;uniform float uRecovered,uThickness;
 vec2 grad(vec2 p){p=mod(p,289.);float x=mod((34.*p.x+1.)*p.x,289.)+p.y;x=mod((34.*x+1.)*x,289.);x=fract(x/41.)*2.-1.;return normalize(vec2(x-floor(x+.5),abs(x)-.5));}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);float a=dot(grad(i),f),b=dot(grad(i+vec2(0,1)),f-vec2(0,1)),c=dot(grad(i+vec2(1,0)),f-vec2(1,0)),d=dot(grad(i+1.),f-1.);vec2 w=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(a,b,w.y),mix(c,d,w.y),w.x)+.5;}
 void main(){
 vec3 col=mix(uLeaf2,uLeaf1,noise(vUV*.28));
 vec3 over=mix(4.*col*col,1.-2.*(1.-col)*(1.-2.*col),step(vec3(.500001),col));
 float facing=clamp(dot(normalize(vN),normalize(vV)),0.,1.);
 col-=vLocalNY*pow(1.-facing,.64)*(over-col);
 float deriv=length(vec2(dFdx(vUV.y+.5),dFdy(vUV.y+.5)));
 float triangle=4.*abs(fract(vUV.y+.75)-.5)-1.;
 float trunk=.5+.5*clamp(triangle*.35/max(deriv,.00001),-1.,1.)*sqrt(clamp(1.1-deriv,0.,1.));
 col=mix(col,uTrunk,trunk);
 float edge=step(uThickness,pow(1.-facing,1.8));col=mix(col,uInk,edge);
 gl_FragColor=vec4(clamp(mix(vec3(.62),col,uRecovered),0.,1.),1.);
 }`});mat.userData.paint=enabled;
 }else{mat=new T.MeshLambertMaterial({color:meta.category==='Fields'?'#d9b85f':'#9aaa63',wireframe:wire});}
 registry.set(meta.id,mat);const obj=new T.Group();const mesh=new T.Mesh(g,mat);mesh.castShadow=true;mesh.receiveShadow=true;obj.add(mesh);obj.userData.materialSource=m.name;return obj;
}
