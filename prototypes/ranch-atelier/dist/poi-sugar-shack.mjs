import {applyDorfRanch} from '/simulations/dorf-ranch-materials.mjs';
import {createContours} from '/simulations/ranch-contours.js';
import * as T from 'three';
import {OrbitControls} from '/simulations/vendor/OrbitControls.js';
import {sandboxWheel} from '/simulations/vendor/sandbox-camera.mjs';
import {sugarShack} from '/simulations/poi/sugar-shack.mjs';
const main=document.querySelector('main'),renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;main.prepend(renderer.domElement);
const ink=createContours(renderer,renderer.render.bind(renderer),{samples:0});const scene=new T.Scene();scene.background=new T.Color('#e7e5d7');const camera=new T.PerspectiveCamera(34,1,.05,1200),orbit=new OrbitControls(camera,renderer.domElement);orbit.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN};orbit.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN};orbit.minDistance=1.2;orbit.maxDistance=800;orbit.maxPolarAngle=Math.PI*.47;orbit.enableDamping=false;
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();e.stopImmediatePropagation();sandboxWheel(T,camera,orbit,e);},{capture:true,passive:false});
scene.add(new T.HemisphereLight('#fff1d2','#738365',2));const sun=new T.DirectionalLight('#ffebcf',3);sun.position.set(-10,16,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});sun.shadow.normalBias=.02;scene.add(sun);
const model=sugarShack({seed:11});applyDorfRanch(model);scene.add(model);const ground=new T.Mesh(new T.CylinderGeometry(6,6.2,.3,6),new T.MeshStandardMaterial({color:'#9da970',roughness:1}));ground.position.y=-.15;ground.receiveShadow=true;scene.add(ground);
function fit(){orbit.target.set(0,2,0);camera.position.set(11,9,15);orbit.update();}fit();document.querySelector('#fit').onclick=fit;document.querySelector('#help').onclick=()=>document.querySelector('dialog').showModal();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let rotating=!reduced.matches,last=performance.now();const button=document.querySelector('#rotate');function sync(){button.setAttribute('aria-pressed',String(rotating));button.textContent=rotating?'Pause rotation':'Rotate';}sync();button.onclick=()=>{rotating=!rotating;sync();};orbit.addEventListener('start',()=>{rotating=false;sync();});reduced.addEventListener('change',()=>{if(reduced.matches){rotating=false;sync();}});
new ResizeObserver(()=>{renderer.setSize(main.clientWidth,main.clientHeight);camera.aspect=main.clientWidth/main.clientHeight;camera.updateProjectionMatrix();}).observe(main);
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(rotating&&!document.hidden)model.rotation.y+=dt*.09;ink.draw(scene,camera);requestAnimationFrame(frame);}requestAnimationFrame(frame);
const move=()=>{const b=document.querySelector('#app-settings-toggle');if(!b)return false;document.querySelector('header').append(b);return true;};if(!move()){const ob=new MutationObserver(()=>{if(move())ob.disconnect();});ob.observe(document.body,{childList:true});}
