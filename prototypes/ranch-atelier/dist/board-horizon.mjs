import * as T from './vendor/three.module.js';

// Beneath the board skirt, outside picking/navigation and camera-fit bounds.
// Fog merges the matte surface into the sky before a distant edge can show.
export function createHorizon(far=1600){
 const plane=new T.Mesh(new T.PlaneGeometry(far*8,far*8),new T.MeshBasicMaterial({color:'#d6ddcd',fog:true}));
 plane.name='Quiet horizon';plane.rotation.x=-Math.PI/2;plane.position.y=-2.08;
 plane.userData.environment=true;plane.raycast=()=>{};return plane;
}
