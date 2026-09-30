import json,math
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
ROOT=Path(__file__).resolve().parent
D=json.loads((ROOT/'design.json').read_text());A=D['alcove'];ang=math.radians(A['yaw_degrees']);rot=np.array([[math.cos(ang),-math.sin(ang),0],[math.sin(ang),math.cos(ang),0],[0,0,1]])
def local(p):return np.array(A['origin'])+rot@p
C=json.loads((ROOT/'observer-camera.json').read_text());anchors=C['landmarks']
extra=[('Near cushion front',[-2.17,-2.30,.48],[.25,.84]),('Far cushion back',[-2.5,-.38,.85],[.13,.625]),('Foreground trunk low',local([-2.7,-.85,-.1]),[.14,.87]),('Foreground trunk middle',local([-2.90,-.95,2.35]),[.105,.32]),('Overhead living arm',local([-1.25,-1.2,4.5]),[.33,.055])]
for label,p,uv in extra:anchors.append({'label':label,'world':list(p),'target':uv})
P=np.array([a['world'] for a in anchors]);T=np.array([a['target'] for a in anchors]);weights=np.array([2,1,1,1,1,1,1,1.5,1,1,1.5,1.5,2.5,2,2,2,1])[:,None]
def proj(v):
 x,y,z,yaw,pitch,lens,cx,cy=v;yaw,pitch=np.radians([yaw,pitch]);f=np.array([-np.sin(yaw)*np.cos(pitch),np.cos(yaw)*np.cos(pitch),np.sin(pitch)]);r=np.cross(f,[0,0,1]);r/=np.linalg.norm(r);u=np.cross(r,f);q=P-[x,y,z];depth=q@f
 return np.column_stack([cx+(q@r)/depth*lens/36,cy-(q@u)/depth*lens/(36*771/1024)]),depth,f
lo=[-3,-16,1.5,-30,-25,20,.35,.35];hi=[5,-2,4.2,55,10,65,.65,.70]
def loss(v):
 uv,d,_=proj(v);return np.r_[((uv-T)*weights).ravel(),np.minimum(d-.7,0)*5,(v[6]-.5)*.08,(v[7]-.5)*.08]
best=None
for x,y in [(-2,-6),(-1,-10),(1,-8),(3,-6)]:
 f=least_squares(loss,[x,y,2.5,10,-6,30,.5,.5],bounds=(lo,hi),max_nfev=1500)
 if best is None or np.linalg.norm(f.fun)<np.linalg.norm(best.fun):best=f
v=best.x;uv,d,f=proj(v)
for a,p in zip(anchors,uv):a['projected']=p.tolist()
C={'source':'A06 whole-frame composition study; tripod metaphor, no literal height constraint','location':v[:3].tolist(),'direction':f.tolist(),'lens_mm':float(v[5]),'shift_x':float(.5-v[6]),'shift_y':float((v[7]-.5)*(771/1024)),'aspect':1024/771,'landmark_rms_fraction':float(np.sqrt(np.mean((uv-T)**2))),'landmarks':anchors,'geometry_changes':False,'user_direction':'Viewer beside the foreground tree near the couch, looking toward the door and mountains. Tripod is a metaphor, not a height measurement.'}
(ROOT/'observer-composition-camera.json').write_text(json.dumps(C,indent=2)+'\n');print(json.dumps({k:v for k,v in C.items() if k!='landmarks'},indent=2));print('LANDMARKS');print('\n'.join(f"{a['label']}: {np.round(p,3)} target {a['target']}" for a,p in zip(anchors,uv)))
