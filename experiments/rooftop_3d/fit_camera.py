import numpy as np,json
from scipy.optimize import least_squares
from pathlib import Path
root=Path(__file__).resolve().parent
# Source-plate normalized landmarks, origin at upper left. Camera fitting only, no image projection.
anchors=[('jamb_l_top',(-3.16,2.43,3.60),(.142,.245),'door'),('jamb_r_top',(-.8,2.43,3.60),(.37,.244),'door'),('jamb_l_sill',(-3.16,2.43,1.075),(.144,.519),'door'),('jamb_r_sill',(-.8,2.43,1.075),(.37,.513),'door'),('jamb_r_foot',(-.8,2.43,.03),(.378,.643),'door'),('window',(-1.99,2.342,2.64),(.245,.367),'door'),('rail_start',(-.64,2.62,1.35),(.401,.513),'door'),('rail_end',(3.23,2.62,1.35),(.943,.611),'rail'),('rail_end_base',(3.23,2.62,.1),(.938,.779),'rail')]
def project(p,loc,target,lens):
 f=(target-loc);f=f/np.linalg.norm(f);r=np.cross(f,[0,0,1]);r/=np.linalg.norm(r);u=np.cross(r,f);q=p-loc;d=q@f
 return np.array([.5+(q@r)/d*lens/36,.5-(q@u)/d*lens/27])
def values(v,report=False):
 cx,cy,cz,tx,shift,lens,yaw,dx,dy,rail_y=v
 loc=np.array([cx,cy,cz]);target=np.array([tx,1,cz]);a=np.deg2rad(yaw);rot=np.array([[np.cos(a),-np.sin(a),0],[np.sin(a),np.cos(a),0],[0,0,1]])
 outputs={};errors=[]
 for name,pt,uv,kind in anchors:
  p=np.array(pt)
  if kind=='door':p=rot@(p-np.array([-1.99,2.5,0]))+np.array([-1.99+dx,2.5+dy,0])
  else:p[1]=rail_y
  q=project(p,loc,target,lens)+np.array([0,shift]);outputs[name]={'world':p.tolist(),'projected':q.tolist(),'source':uv};errors.extend((q-np.array(uv))*[1,.75])
 # Keep the solution staged at useful dimensions and sensible architectural relationships.
 errors.extend([dx*.006,dy*.006,(lens-45)*.0002,(yaw-35)*.0002])
 return outputs if report else errors
v0=[7,-10,4.0,-.35,-.3,45,35,0,0,2.62]
r=least_squares(values,v0,bounds=([2,-17,2,-2,-.6,30,0,-3,-3,0],[15,-3,4.2,3,.2,65,80,3,3,7]),max_nfev=1500)
names=['cx','cy','cz','tx','vertical_image_shift','lens','door_yaw','door_dx','door_dy','rail_end_y'];result={'parameters':dict(zip(names,r.x)),'landmarks':values(r.x,True),'rms_normalized':float(np.sqrt(np.mean(np.array(values(r.x)[:18])**2)))}
(root/'camera-fit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
