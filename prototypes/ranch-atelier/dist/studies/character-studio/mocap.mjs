// AW-STUDY-0037 realism pass: real motion capture played on the studio skeleton.
// The clips are CMU Graphics Lab motion capture (free for all uses), retargeted offline by
// tools/character-studio/mocap/retarget.py into per-frame bone turns from our rest A-pose (rig.mjs pose.q).
//   loadMocap(T, base)  -> {moveId: move} with fn(t) returning a pose, len, loop, travel, speed, source
// Loops were cut on a matching pair of frames one cycle apart; one-shots blend their last 0.35 s into the first
// frame, so every move can repeat on the stage.
export async function loadMocap(T, base) {
 const idx = await fetch(new URL('mocap/index.json', base)).then(r => r.json());
 const bones = idx.bones, out = {};
 await Promise.all(Object.entries(idx.clips).map(async ([id, c]) => {
  const clip = await fetch(new URL('mocap/' + c.file, base)).then(r => r.json());
  const F = clip.frames.map(fr => ({q: bones.map((b, i) => new T.Quaternion(...fr[i])), r: fr[bones.length]}));
  const n = F.length, len = n / clip.fps, blend = clip.loop ? 0 : Math.min(.35, len * .2);
  const qa = new T.Quaternion(), qb = new T.Quaternion();
  const sample = (t, k) => {
   const x = Math.min(Math.max(t * clip.fps, 0), n - 1), i = Math.floor(x), j = clip.loop ? (i + 1) % n : Math.min(i + 1, n - 1), u = x - i;
   const q = qa.copy(F[i].q[k]).slerp(F[j].q[k], u);
   return q;
  };
  const fn = t => {
   t = ((t % len) + len) % len;
   const pose = {q: {}, root: [0, 0, 0]};
   const fade = blend && t > len - blend ? (t - (len - blend)) / blend : 0, e = fade * fade * (3 - 2 * fade);
   bones.forEach((b, k) => {
    const q = sample(t, k).clone();
    if (e) q.slerp(qb.copy(F[0].q[k]), e);
    pose.q[b] = q;
   });
   const x = Math.min(t * clip.fps, n - 1), i = Math.floor(x), j = Math.min(i + 1, n - 1), u = x - i;
   const r = [0, 1, 2].map(a => F[i].r[a] + (F[j].r[a] - F[i].r[a]) * u);
   pose.root = e ? r.map((v, a) => v + (F[0].r[a] - v) * e) : r;
   if (c.lift) pose.root[1] += c.lift;
   return pose;
  };
  fn.len = len;
  out[id] = {fn, len, loop: clip.loop, speed: clip.speed || 0, travel: clip.speed > .05, source: c.source, what: c.what};
 }));
 return out;
}
