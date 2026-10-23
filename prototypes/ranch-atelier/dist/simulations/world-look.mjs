// World look: one switch between the looks a place can be drawn in. Developer tools only, never the player HUD.
//   const WL = worldLook(T, {scene, renderer, wash})      wash = the page's watercolourDistance (optional)
//   WL.set('comic-ink')   WL.id   WL.list   WL.refresh()   (after adding meshes, call refresh so new things get their look)
//   mountWorldLookPanel(WL)    the "World look" row in the developer panel (shown only with ?dev or aw-developer=1)
// The three looks, named:
//   storybook   Storybook      the town's own: the world as drawn, with Watercolour distance painting what is far away
//   sunday      Sunday toon    the Ranch's original: soft three-band toon light, warm rim, no wash (simulations/toon-kit.mjs)
//   comic-ink   Comic ink      thick black cartoon outlines round everything, flat two-band light, no wash
// Style only. Outlines are a presentation of the drawing, drawn as shells on the objects themselves, so they are the same
// width on screen at any distance (a pen line, not a model).
import {toonify, untoonify, toonUniforms, setToonLook, TOON_LOOKS} from './toon-kit.mjs';
import {weldNormals} from './painted-brush.mjs';

export const WORLD_LOOKS = {
  storybook: {name: 'Storybook', note: "the town's own look, with the painted distance", toon: null, ink: 0, wash: true},
  sunday: {name: 'Sunday toon', note: "the Ranch's original soft toon light", toon: 'sunday', ink: 0, wash: false},
  'comic-ink': {name: 'Comic ink', note: 'thick black cartoon outlines, flat bands of light', toon: 'ink', ink: 3.2, inkCol: '#0b0a0d', wash: false},
};
const MAX_VERTS = 120000; // the land itself is not outlined; things standing on it are

export function worldLook(T, {scene, renderer, wash, initial = 'storybook'} = {}) {
  const U = toonUniforms(T, TOON_LOOKS.sunday), inkU = {uPx: {value: 3}, uFar: {value: 3500}, uInk: {value: new T.Color('#0b0a0d')}, uView: {value: new T.Vector2(1, 1)}};
  const mat = new T.ShaderMaterial({uniforms: inkU, side: T.BackSide, vertexShader: `#include <common>
#include <logdepthbuf_pars_vertex>
uniform float uPx, uFar; uniform vec2 uView; attribute vec3 aSmoothN;
void main(){
 vec4 p = vec4(position, 1.);
 #ifdef USE_INSTANCING
 p = instanceMatrix * p; vec3 n = mat3(instanceMatrix) * aSmoothN;
 #else
 vec3 n = aSmoothN;
 #endif
 vec4 mv = modelViewMatrix * p; vec3 vn = normalize(normalMatrix * n);
 vec4 c = projectionMatrix * mv; vec2 d = normalize((projectionMatrix * vec4(vn, 0.)).xy + 1e-6);
 float far = clamp(1.6 - c.w / uFar, .18, 1.); // a pen line thins with distance, so a far town is not a cloud of dots
 c.xy += d * uPx * far * 2. / uView * c.w; gl_Position = c;
 #include <logdepthbuf_vertex>
}`,
    fragmentShader: `#include <logdepthbuf_pars_fragment>
uniform vec3 uInk; void main(){
 #include <logdepthbuf_fragment>
 gl_FragColor = vec4(uInk, 1.);
 #include <colorspace_fragment>
 }`});
  const hulls = []; let id = null, timer = 0;
  const skip = o => !o.isMesh || o.userData.ink || o.userData.noInk || o.userData.layer === 'presentation' || o.isSkinnedMesh || !o.geometry?.attributes.normal
    || o.geometry.attributes.position.count > MAX_VERTS || [].concat(o.material).some(m => m.transparent || m.isShaderMaterial || m.isMeshBasicMaterial);
  function addInk() {
    const seen = new Set(hulls.map(h => h.userData.of));
    const todo = []; scene.traverse(o => { if (!seen.has(o) && !skip(o)) todo.push(o); });
    for (const o of todo) {
      weldNormals(T, o.geometry);
      const h = o.isInstancedMesh ? new T.InstancedMesh(o.geometry, mat, o.count) : new T.Mesh(o.geometry, mat);
      if (o.isInstancedMesh) { h.instanceMatrix = o.instanceMatrix; h.frustumCulled = false; }
      h.userData.ink = true; h.userData.of = o; h.castShadow = h.receiveShadow = false; h.raycast = () => {};
      o.add(h); hulls.push(h);
    }
  }
  function removeInk() { for (const h of hulls) h.parent?.remove(h); hulls.length = 0; }
  function size() { if (!renderer) return; const v = renderer.getDrawingBufferSize(new T.Vector2()); inkU.uView.value.copy(v); }
  const api = {
    list: Object.entries(WORLD_LOOKS).map(([k, v]) => ({id: k, name: v.name, note: v.note})),
    get id() { return id; },
    set(next) {
      const L = WORLD_LOOKS[next]; if (!L) throw new Error('unknown world look: ' + next);
      if (next === id) return id;
      id = next; clearInterval(timer); removeInk(); untoonify(scene);
      if (L.toon) { setToonLook(T, U, TOON_LOOKS[L.toon]); toonify(T, scene, TOON_LOOKS[L.toon], U); }
      if (L.ink) { inkU.uPx.value = L.ink; inkU.uInk.value.set(L.inkCol); size(); addInk(); timer = setInterval(() => { size(); addInk(); }, 2000); }
      if (wash) { wash.enabled = L.wash; }
      return id;
    },
    refresh() { if (WORLD_LOOKS[id]?.toon) toonify(T, scene, TOON_LOOKS[WORLD_LOOKS[id].toon], U); if (WORLD_LOOKS[id]?.ink) { size(); addInk(); } },
    dispose() { clearInterval(timer); removeInk(); untoonify(scene); mat.dispose(); },
    hulls,
  };
  api.set(initial);
  return api;
}

export const isDeveloper = () => { try { return /[?&]dev\b/.test(location.search) || localStorage.getItem('aw-developer') === '1'; } catch { return false; } };

// a small row in the developer corner, labelled "World look". Not built at all unless developer mode is on.
export function mountWorldLookPanel(WL, {parent, isDev = isDeveloper} = {}) {
  if (!isDev()) return null;
  const box = document.createElement('div');
  box.setAttribute('data-developer', 'world-look');
  box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:60;background:#fffdf6ee;border:1px solid #2a3236;border-radius:10px;padding:8px 10px;font:12px/1.3 system-ui,sans-serif;color:#2a3236;box-shadow:0 2px 10px #0003';
  box.innerHTML = '<b style="display:block;margin-bottom:4px">World look</b>';
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap'; box.append(row);
  const btns = WL.list.map(l => { const b = document.createElement('button'); b.textContent = l.name; b.title = l.note; b.style.cssText = 'font:inherit;padding:4px 8px;border-radius:7px;border:1px solid #2a3236;background:#fff;cursor:pointer'; b.onclick = () => { WL.set(l.id); paint(); }; row.append(b); return [l.id, b]; });
  const paint = () => { for (const [k, b] of btns) { b.style.background = k === WL.id ? '#2a3236' : '#fff'; b.style.color = k === WL.id ? '#fff' : '#2a3236'; } };
  paint(); (parent || document.body).append(box); return box;
}
