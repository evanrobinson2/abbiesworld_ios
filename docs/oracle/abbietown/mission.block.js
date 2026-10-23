// ---------- the Moon Mission plays here (AW-STUDY-0036; Evan 2026-10-23 3:33 PM: "fully integrated into the winchester diorama") ----------
// The mission side is simulations/moonmission/town-mount.mjs: it mounts on AbbieTown.stage. This is the town side: the black
// truck parked at the café curb is the door ('town:truck' in simulations/abbietown/entrances.mjs), the 'abbietown:enter' event
// for module 'moon-mission' starts it (the truck or 'town:launch'), and /town?mission opens straight on it (?beat=<id> jumps).
const MM_BASE = '/*MMBASE*/';
let mmMod = null, mmTruck = null, mmBusy = false;
async function mmStart() {
 if (mmBusy) return; mmBusy = true; if (!viewDio) setView(true);
 try { mmMod = mmMod || await import(MM_BASE + 'town-mount.mjs'); mmMod.start(window.AbbieTown, {quiet: /[?&]quiet\b/.test(location.search)}); if (mmTruck) mmTruck.visible = false; } // the mission brings its own truck
 catch (err) { console.warn('Moon Mission not reachable here', err); } // the claude.ai preview cannot load it: the town stays as it is
 mmBusy = false;
}
addEventListener('abbietown:enter', e => { if (e.detail && e.detail.module === 'moon-mission') mmStart(); });
// the truck: black, a yellow band, a red light on the cab, parked in Main Street outside the café (in-fiction, so anyone can see it)
function mmParkTruck() {
 const cs = dioTiles.downtown?.spots.cafe; if (!cs || !cs.out) return; const t = dioTiles.downtown, o = cs.out, st = cs.street;
 const g = new THREE.Group(), part = (w, h, d, c, x, y, z, e) => { const m = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({color: c, roughness: .6, ...(e ? {emissive: c, emissiveIntensity: .8} : {})})); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = true; g.add(m); return m; };
 part(5.4, 1.6, 2.2, '#15171c', 0, .5, 0); part(1.9, 1.3, 2.1, '#15171c', 2.6, 1.9, 0); part(.9, .55, 2.14, '#7fb4ff', 3.05, 2.2, 0); part(5.42, .28, 2.24, '#ffc94a', 0, 1.3, 0); g.beacon = part(.32, .14, 1.2, '#ff4a4a', 2.6, 3.2, 0, true);
 for (const x of [-1.7, 1.9]) for (const z of [-1.1, 1.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .4, 12), new THREE.MeshStandardMaterial({color: '#0a0a0c'})); w.rotation.x = Math.PI / 2; w.position.set(x, .55, z); g.add(w); }
 const lx = cs.x + st.dirX * -8 + o.dirX * 10.6, lz = cs.z + st.dirZ * -8 + o.dirZ * 10.6; // in the street, a little up from the shop
 g.position.set(t.group.position.x + lx, t.hf(lx, -lz) + .1, t.group.position.z + lz); g.rotation.y = Math.atan2(-st.dirZ, st.dirX); g.scale.setScalar(.9); dioGroup.add(g); mmTruck = g;
}
stageFrames.push((dt, t) => {
 if (!mmTruck) { if (viewDio) mmParkTruck(); return; }
 mmTruck.beacon.visible = Math.sin(t * 6) > 0;
 if (!mmTruck.visible && !mmBusy && document.querySelector('.hud[role=toolbar]').style.display !== 'none') mmTruck.visible = true; // the mission ended: the truck is back at the curb
});
canvas.addEventListener('pointerup', e => {
 if (!mmTruck || !mmTruck.visible || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return; const r = canvas.getBoundingClientRect();
 ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera);
 if (ray.intersectObject(mmTruck, true)[0]) window.AbbieTown.go('town:truck', {crew: true});
});
if (/[?&](mission|beat=)/.test(location.search)) setTimeout(() => window.AbbieTown.go('town:truck', {crew: true}), 300);
