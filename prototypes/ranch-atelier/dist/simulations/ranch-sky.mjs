import * as T from 'three';
import {solarCycle} from './simulation/solar-cycle.mjs';
import {lunarCycle} from './simulation/lunar-cycle.mjs';
// A single camera-centred sky mesh: no textures, particle pools or extra shadow maps.
export function createRanchSky(scene){
 const uniforms={themeSky:{value:new T.Color('#8ebed1')},themeHorizon:{value:new T.Color('#fffcf0')},sunDir:{value:new T.Vector3()},moonDir:{value:new T.Vector3()},daylight:{value:1},cloud:{value:0}};
 const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms,vertexShader:`varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`
 varying vec3 ray;uniform vec3 sunDir,moonDir,themeSky,themeHorizon;uniform float daylight,cloud;
 void main(){
 vec3 d=normalize(ray);float horizon=pow(1.-abs(d.y),4.);
 vec3 sky=mix(vec3(.012,.022,.055),vec3(.25,.48,.68),daylight);
 sky=mix(sky,mix(vec3(.06,.08,.12),vec3(.78,.82,.74),daylight),horizon);
 sky=mix(sky,mix(themeSky,themeHorizon,horizon),daylight*.24);
 float sd=length(d-sunDir),sunUp=smoothstep(-.025,.025,sunDir.y);
 vec3 sunlight=mix(vec3(1.,.42,.12),vec3(1.,.94,.72),smoothstep(0.,.45,sunDir.y));
 sky+=sunlight*(.18*exp(-sd*sd/ .014)+1.8*(1.-smoothstep(.012,.015,sd)))*sunUp*(1.-cloud*.92);
 vec3 right=normalize(cross(vec3(0.,1.,0.),moonDir)),up=cross(moonDir,right);
 vec2 p=vec2(dot(d,right),dot(d,up))/.012;float r=length(p);
 if(dot(d,moonDir)>.99&&r<1.){
 vec3 normal=right*p.x+up*p.y-moonDir*sqrt(max(0.,1.-r*r));
 float lit=smoothstep(-.025,.06,dot(normal,sunDir));
 float maria=.88+.06*sin(p.x*19.+sin(p.y*12.))+.06*cos(p.y*22.+p.x*9.);
 vec3 moon=vec3(.72,.77,.81)*maria*(.035+.965*lit);
 float visible=(1.-smoothstep(.94,1.,r))*smoothstep(-.02,.02,moonDir.y)*(1.-cloud*.94);
 sky=mix(sky,moon,visible);
 }
 gl_FragColor=vec4(sky,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const geometry=new T.SphereGeometry(900,24,12),root=new T.Mesh(geometry,material);root.name='Sun and moon sky';root.renderOrder=-100;root.frustumCulled=false;root.raycast=()=>{};scene.add(root);
 return {root,setTheme(p){uniforms.themeSky.value.copy(p.sky);uniforms.themeHorizon.value.copy(p.horizon);},update(camera,hour,day,phase,cloudCover=0){
  root.position.copy(camera.position);const sun=solarCycle(hour,phase),moon=lunarCycle(day,hour,phase);
  uniforms.sunDir.value.fromArray(sun.direction);uniforms.moonDir.value.fromArray(moon.direction);uniforms.daylight.value=sun.daylight;uniforms.cloud.value=cloudCover;
  return moon;
 },dispose(){scene.remove(root);geometry.dispose();material.dispose();}};
}
