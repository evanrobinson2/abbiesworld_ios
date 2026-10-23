// The first placeholder suit (kept for the before/after, AW-STUDY-0036). Superseded by suit.mjs.
import * as THREE from 'three';
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({color: c, flatShading: true, roughness: .85, metalness: 0, ...o});
const cyl = (rt, rb, h, c, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
export function heroBefore({trim, skin, h}) {
 const g = new THREE.Group(), k = h / 1.8, suit = 0xffffff;
 const body = at(cyl(.22 * k, .26 * k, .8 * k, suit, 8), 0, 1.0 * k, 0), belt = at(cyl(.27 * k, .27 * k, .08 * k, trim, 8), 0, .8 * k, 0);
 const head = at(new THREE.Mesh(new THREE.IcosahedronGeometry(.2 * k, 1), mat(skin)), 0, 1.6 * k, 0);
 const legs = [-.1, .1].map(x => at(cyl(.09 * k, .09 * k, .6 * k, suit, 6), x * k, .3 * k, 0));
 const arms = [-.3, .3].map(x => at(cyl(.07 * k, .07 * k, .6 * k, suit, 6), x * k, 1.05 * k, 0));
 const hl = at(new THREE.Mesh(new THREE.SphereGeometry(.26 * k, 12, 10), mat(0xbfe4ff, {transparent: true, opacity: .35, roughness: .1})), 0, 1.6 * k, 0);
 [body, belt, head, ...legs, ...arms, hl].forEach(o => g.add(o)); return g;
}
