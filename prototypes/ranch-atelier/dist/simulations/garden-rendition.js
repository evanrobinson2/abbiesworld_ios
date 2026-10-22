import {ObjectLoader} from './vendor/three.module.js';
// Restore working geometry from the immutable card, never from today's catalog.
export function gardenRenditionItems(rendition){
 const items=new Map();new ObjectLoader().parse(rendition).traverse(o=>{if(o.userData.gardenItemId)items.set(o.userData.gardenItemId,o);});
 return id=>{const item=items.get(id);if(!item)throw Error('Saved garden rendition is missing '+id);return item.clone(true);};
}
