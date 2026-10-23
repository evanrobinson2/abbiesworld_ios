// Worlds in orbs (AW-STUDY-0045, Evan's pick: "a fun unlock to a new world"). Cocoon-style: a world you carry as a glass orb,
// and step into. The orb is the key: earn one, it sits in the player inventory, tap it to hold it up, tap again to step in.
//   const orb = createOrb(T, {world, radius: .6, glow: '#ffe2b0', onInside, onOutside});   world: a Group, built at its own
//                                                            real size around (0,0,0); it is shown tiny inside the glass
//   scene.add(orb.group); orb.group.position.set(...)      the orb carries its tiny live world, so nothing is baked
//   orb.enter() / orb.leave()                              grow the world to full size around the orb (the caller moves the
//                                                          camera into it while orb.progress rises), then onInside fires;
//                                                          leave() shrinks it back into the glass and fires onOutside
//   orb.update(dt)                                         every frame: the glow breathes, the world turns slowly, enter/leave advance
//   orb.setGlow(hex)                                       the glow is the world's mood, so it shows the weather and time of day
//                                                          inside before you step in
// orb.state is 'idle' | 'entering' | 'inside' | 'leaving'; orb.progress runs 0 (a small orb) to 1 (you are in the world).
const ease = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

const VERT = `varying vec3 vN;varying vec3 vW;void main(){vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const FRAG = `uniform vec3 uCol;uniform float uAlpha,uPulse;varying vec3 vN;varying vec3 vW;
void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(cameraPosition-vW))),2.5);gl_FragColor=vec4(uCol*(f*.5+.04)*uAlpha*uPulse,1.);
#include <colorspace_fragment>
}`;

export function createOrb(T, {world, radius = .6, glow = '#ffe2b0', inner = .2, speed = 1.4, onInside, onOutside} = {}) {
 const group = new T.Group(), glass = new T.Mesh(new T.SphereGeometry(radius, 48, 32), new T.ShaderMaterial({
  transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.FrontSide,
  uniforms: {uCol: {value: new T.Color(glow)}, uAlpha: {value: 1}, uPulse: {value: 1}}, vertexShader: VERT, fragmentShader: FRAG}));
 glass.name = 'orb glass'; group.name = 'orb';
 // the world fits the glass: its own size is the reference, whatever units it was built in
 const holder = new T.Group(); holder.name = 'orb world';
 let fit = 1;
 if (world) {
  holder.add(world); world.updateWorldMatrix(true, true);
  const b = new T.Box3().setFromObject(world), s = b.getSize(new T.Vector3()), r = Math.max(s.x, s.y, s.z) / 2 || 1;
  fit = (radius * .82 * inner / .2) / r; // the world's largest half-extent fills 82% of the glass at the default inner scale
  const c = b.getCenter(new T.Vector3()); world.position.sub(c); // centre it in the glass
 }
 holder.scale.setScalar(fit);
 group.add(holder, glass);
 const orb = {
  group, glass, holder, state: 'idle', progress: 0, glow,
  setGlow(hex) { glass.material.uniforms.uCol.value.set(hex); orb.glow = hex; },
  enter() { if (orb.state === 'idle' || orb.state === 'leaving') orb.state = 'entering'; return orb; },
  leave() { if (orb.state === 'inside' || orb.state === 'entering') orb.state = 'leaving'; return orb; },
  update(dt, seconds = 0) {
   if (orb.state === 'entering') { orb.progress = Math.min(1, orb.progress + dt / speed); if (orb.progress >= 1) { orb.state = 'inside'; onInside?.(orb); } }
   else if (orb.state === 'leaving') { orb.progress = Math.max(0, orb.progress - dt / speed); if (orb.progress <= 0) { orb.state = 'idle'; onOutside?.(orb); } }
   const e = ease(orb.progress), u = glass.material.uniforms;
   // the world grows from the glass to its real size; the glass swells and fades away as you pass through
   holder.scale.setScalar(fit + (1 - fit) * e);
   glass.scale.setScalar(1 + 5 * e); u.uAlpha.value = 1 - e; u.uPulse.value = .9 + .1 * Math.sin(seconds * 2.2);
   glass.visible = e < .999;
   if (orb.state === 'idle') holder.rotation.y = seconds * .25; else if (orb.state === 'inside') holder.rotation.y = 0;
   return orb;
  },
  dispose() { glass.geometry.dispose(); glass.material.dispose(); },
 };
 return orb;
}
