"""Fit only a perspective camera to reference landmarks; never edit architecture."""
import json,math
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
ROOT=Path(__file__).resolve().parent
D=json.loads((ROOT/'design.json').read_text());a=D['alcove'];ang=math.radians(a['yaw_degrees']);rot=np.array([[math.cos(ang),-math.sin(ang),0],[math.sin(ang),math.cos(ang),0],[0,0,1]])
def local(p):return np.array(a['origin'])+rot@p
anchors=[]
def add(label,p,uv,weight=1):anchors.append((label,p,uv,weight))
add('Window centre',local([0,-.08,2.28]),[.245,.367],3)
add('Window left',local([-.61,-.08,2.28]),[.19,.367],2)
add('Window right',local([.61,-.08,2.28]),[.30,.367],2)
add('Window top',local([0,-.08,2.89]),[.245,.301],2)
add('Window bottom',local([0,-.08,1.67]),[.245,.435],2)
add('Sill left',local([-1.30,-.25,1.05]),[.15,.516],1)
add('Sill right',local([1.30,-.25,1.05]),[.35,.518],1)
add('Right post foot',local([1.32,-.36,0]),[.382,.652],2)
add('Right post head',local([1.32,-.36,3.25]),[.378,.235],1)
add('Rail rear start',[-.45,2.49,1.11],[.403,.517],1)
add('Rail rear end',[3.29,2.49,1.11],[.943,.611],2)
add('Rail corner foot',[3.29,2.49,0],[.938,.779],2)
P=np.array([x[1] for x in anchors]);target=np.array([x[2] for x in anchors]);W=np.array([x[3] for x in anchors])[:,None]
# x/y/z, azimuth (0=north, positive=west), pitch up, focal length, optical centre x/y.
def project(v):
 x,y,z,yaw,pitch,lens,cx,cy=v;yaw,pitch=np.radians([yaw,pitch]);f=np.array([-np.sin(yaw)*np.cos(pitch),np.cos(yaw)*np.cos(pitch),np.sin(pitch)]);r=np.cross(f,[0,0,1]);r/=np.linalg.norm(r);u=np.cross(r,f);q=P-[x,y,z];d=q@f
 uv=np.column_stack([cx+(q@r)/d*lens/36,cy-(q@u)/d*lens/27]);return uv,d,f
lo=[-1,-12,1.7,-45,-25,22,.25,.35];hi=[7,-2,3.6,50,10,55,.75,.75]
def residual(v):
 uv,d,_=project(v)
 return np.r_[((uv-target)*W).ravel(),np.minimum(d-.8,0)*5,(v[6]-.5)*.10,(v[7]-.5)*.10,(v[5]-32)*.0004]
best=None
for xyz in [[1,-5,2.8],[3,-7,3],[0,-3,2.4],[5,-9,3.4]]:
 fit=least_squares(residual,[*xyz,10,-8,32,.5,.5],bounds=(lo,hi),max_nfev=1500)
 if best is None or np.linalg.norm(fit.fun)<np.linalg.norm(best.fun):best=fit
v=best.x;uv,dep,f=project(v)
out={'source':'A01 fixed architecture / approximate source landmark fit','location':v[:3].tolist(),'direction':f.tolist(),'lens_mm':float(v[5]),'shift_x':float(.5-v[6]),'shift_y':float((v[7]-.5)*.75),'aspect':4/3,'landmark_rms_fraction':float(np.sqrt(np.mean((uv-target)**2))),'landmarks':[{'label':row[0],'world':list(map(float,row[1])),'target':row[2],'projected':got.tolist()} for row,got in zip(anchors,uv)],'geometry_changes':False}
(ROOT/'observer-camera.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out,indent=2))
