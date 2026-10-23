// Raycaster includes invisible objects; interaction must match the rendered scene.
export function firstVisibleHit(ray,root){return ray.intersectObject(root,true).find(hit=>{for(let o=hit.object;o;o=o.parent)if(!o.visible)return false;const materials=Array.isArray(hit.object.material)?hit.object.material:[hit.object.material];return materials.some(m=>m?.visible!==false);});}
