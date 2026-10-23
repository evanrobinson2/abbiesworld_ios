// Presentation-only solver. Shared Sandbox gestures remain authoritative.
// points are corners of visible, known subjects' WORLD bounds (including labels).
export function fitEncounter({points, backward={x:.2,y:.85,z:1}, fov=45, aspect,
  safe={left:-.85,right:.85,bottom:-.6,top:.72}, minDistance=.1, preferredDistance=0, maxDistance=Infinity, near=.01}) {
  if (!points.length || !(aspect>0) || !(fov>0 && fov<179) ||
      !(safe.right>safe.left && safe.top>safe.bottom)) throw new Error('Invalid encounter framing inputs');
  const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
  const norm=v=>{const n=Math.hypot(v.x,v.y,v.z);if(!n)throw new Error('Invalid camera direction');return {x:v.x/n,y:v.y/n,z:v.z/n};};
  const back=norm(backward), right=norm({x:back.z,y:0,z:-back.x});
  const up={x:back.y*right.z-back.z*right.y,y:back.z*right.x-back.x*right.z,z:back.x*right.y-back.y*right.x};
  const lows={x:Infinity,y:Infinity,z:Infinity}, highs={x:-Infinity,y:-Infinity,z:-Infinity};
  for(const p of points)for(const k of ['x','y','z']){if(!Number.isFinite(p[k]))throw new Error('Invalid subject bounds');lows[k]=Math.min(lows[k],p[k]);highs[k]=Math.max(highs[k],p[k]);}
  const center={x:(lows.x+highs.x)/2,y:(lows.y+highs.y)/2,z:(lows.z+highs.z)/2};
  const ty=Math.tan(fov*Math.PI/360),tx=ty*aspect;
  const cx=(safe.left+safe.right)/2,cy=(safe.bottom+safe.top)/2;
  let required=minDistance;
  for(const p of points){
    const q={x:p.x-center.x,y:p.y-center.y,z:p.z-center.z};
    const x=dot(q,right),y=dot(q,up),z=dot(q,back);
    required=Math.max(required,z+near,
      (x+safe.right*tx*z)/((safe.right-cx)*tx),
      (-x-safe.left*tx*z)/((cx-safe.left)*tx),
      (y+safe.top*ty*z)/((safe.top-cy)*ty),
      (-y-safe.bottom*ty*z)/((cy-safe.bottom)*ty));
  }
  const distance=Math.min(Math.max(required,preferredDistance),maxDistance);
  const target={};const position={};
  for(const k of ['x','y','z']){target[k]=center[k]-right[k]*cx*distance*tx-up[k]*cy*distance*ty;position[k]=target[k]+back[k]*distance;}
  return {position,target,distance,requiredDistance:required,fits:required<=maxDistance};
}

// Elevation above the ground plane. All presets share an azimuth so switching
// height does not reverse the player's spatial map. Distances use renderer units.
export const ENCOUNTER_ANGLES=Object.freeze({tactical:35,overview:55,street:25});
export function encounterDirection(preset='tactical',azimuth=Math.atan2(.2,1)){
  if(!Object.hasOwn(ENCOUNTER_ANGLES,preset)||!Number.isFinite(azimuth))throw new Error('Invalid encounter camera angle');
  const pitch=ENCOUNTER_ANGLES[preset]*Math.PI/180;
  return {x:Math.sin(azimuth)*Math.cos(pitch),y:Math.sin(pitch),z:Math.cos(azimuth)*Math.cos(pitch)};
}

// Reserve measured DOM overlays, not hard-coded device guesses. Call on resize
// and panel changes; top/bottom are viewport-relative HUD edges.
export function safeFrame({rect,top=rect.top,bottom=rect.bottom,left=rect.left,right=rect.right,padding=24}){
  const x0=Math.max(rect.left,left)+padding,x1=Math.min(rect.right,right)-padding;
  const y0=Math.max(rect.top,top)+padding,y1=Math.min(rect.bottom,bottom)-padding;
  if(x1<=x0 || y1<=y0)return null; // Compact HUD first; do not silently hide actors.
  return {left:(x0-rect.left)/rect.width*2-1,right:(x1-rect.left)/rect.width*2-1,
    top:1-(y0-rect.top)/rect.height*2,bottom:1-(y1-rect.top)/rect.height*2};
}

export function boundsCorners(min,max){
  const points=[];
  for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])points.push({x,y,z});
  return points;
}
