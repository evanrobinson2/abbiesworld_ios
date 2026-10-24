import {GLTFLoader} from '/sandbox2-runtime/vendor/loaders/GLTFLoader.js';

// The Meshy animation set (AW-STUDY-0043) on any hero: 83 clips cut to the hero rig's 20 bone names, listed in
// /studies/moon-mission/heroes/anims/index.json. The clips were made on an adult reference rig, so only their joint
// turns are kept: their bone positions (adult limb lengths) would stretch a child, and the hips' travel is scaled to
// this hero's own hip height, or a child floats a third of a metre up.
// const clip = await heroClip('walking_woman', hero); mixer.clipAction(clip).play()
export const ANIMS = '/studies/moon-mission/heroes/anims/';
const loader = new GLTFLoader(), files = new Map();

export const heroAnimIndex = () => fetch(ANIMS + 'index.json').then(r => r.json());

export async function heroClip(name, hero) {
 if (!files.has(name)) files.set(name, loader.loadAsync(ANIMS + name + '.glb'));
 const gltf = await files.get(name), clip = gltf.animations[0].clone();
 const from = gltf.scene.getObjectByName('hips'), to = hero.getObjectByName('hips');
 const k = from && to ? to.position.length() / from.position.length() : 1;
 clip.tracks = clip.tracks.filter(t => t.name.endsWith('.quaternion') || t.name === 'hips.position');
 for (const t of clip.tracks) if (t.name === 'hips.position') t.values = t.values.map(v => v * k);
 return clip;
}
