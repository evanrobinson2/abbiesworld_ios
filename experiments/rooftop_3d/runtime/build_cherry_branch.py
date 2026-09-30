"""Authored branching sprays with whole cupped five-petal flowers, not alpha cards.
Units/meters, Y-up. Each spray remains independently movable in the game.
"""
import math, random, struct, json
from pathlib import Path
import numpy as np
OUT=Path('abbies.world.ios/abbies.world.ios/Resources/RooftopLightingProof')
OUT.mkdir(parents=True,exist_ok=True)
rng=random.Random(2419)
def unit(v):
 v=np.array(v,dtype=float); return v/max(1e-8,np.linalg.norm(v))
def export(name,v,f):
 with (OUT/(name+'.rtmesh')).open('wb') as out:
  out.write(struct.pack('<4sII',b'RTM1',len(v),len(f)))
  for rec in v: out.write(struct.pack('<8f',*rec))
  out.write(struct.pack('<%dI'%len(f),*f))
 return {'name':name,'mesh':name+'.rtmesh','vertices':len(v),'triangles':len(f)//3}
bv=[];bf=[]
def branch(points,radius):
 points=[np.array(p,dtype=float) for p in points]
 # Smooth the centerline so the supporting limb bends instead of showing polygon elbows.
 if len(points)>3:
  padded=[points[0]]+points+[points[-1]];smooth=[]
  for i in range(1,len(padded)-2):
   p0,p1,p2,p3=padded[i-1:i+3]
   for j in range(6):
    t=j/6;smooth.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
  points=smooth+[points[-1]]
 start=len(bv)
 for i,p in enumerate(points):
  tangent=unit(points[min(i+1,len(points)-1)]-points[max(0,i-1)])
  a=unit(np.cross(tangent,[0,1,0]));b=unit(np.cross(tangent,a))
  r=radius*(1-i/(len(points)-1)*.92)
  for j in range(8):
   n=a*math.cos(j*math.tau/8)+b*math.sin(j*math.tau/8)
   bv.append(tuple(p+n*r)+tuple(n)+(j/8,i/len(points)))
  if i:
   for j in range(8):
    x=start+(i-1)*8+j;y=start+(i-1)*8+(j+1)%8
    bf.extend([x,y,y+8,x,y+8,x+8])

def flower(v,f,center,size,normal,rotation):
 n=unit(normal);u=unit(np.cross(n,[0,1,0]));w=unit(np.cross(n,u))
 for petal in range(5):
  angle=rotation+petal*math.tau/5;axis=u*math.cos(angle)+w*math.sin(angle);side=-u*math.sin(angle)+w*math.cos(angle)
  # Petal fans have rounded outer lobes, a shallow notch, and a cupped rim.
  contour=[(0,0),(-.22,.27),(-.48,.67),(-.43,.96),(-.19,1.08),(0,1.01),(.19,1.08),(.43,.96),(.48,.67),(.22,.27)]
  start=len(v)
  middle=center+axis*size*.52+n*size*.02
  v.append(tuple(middle)+tuple(n)+(0.5,.52))
  for x,y in contour:
   z=.13*y*y+.12*abs(x)
   p=center+(axis*y+side*x+n*z)*size
   shading=unit(n-side*x*.35-axis*y*.15)
   v.append(tuple(p)+tuple(shading)+(x+.5,y))
  for j in range(len(contour)):f.extend([start,start+1+(j+1)%len(contour),start+1+j])

# Four irregular overlapping sprays; branch bases join the great foreground tree.
paths=[
 [(-3.55,3.65,.05),(-2.4,3.85,-.2),(-.7,3.55,-.7),(1.1,3.45,-1),(3.2,3.65,-1.2)],
 [(-3.35,3.6,-.2),(-2,3.55,-1.3),(-.3,3.5,-2.2),(1.3,3.6,-2.6),(3.4,3.25,-2.9)],
 [(-3.4,3.55,.05),(-2.3,3.1,-.15),(-1.1,3.2,-.1),(.3,3.0,-.3),(1.4,2.8,-.6)],
 [(-3.55,4.25,-.5),(-1.6,4.4,-1.5),(.8,4.35,-2.5),(3.2,4.05,-3),(5.5,3.65,-3.1)],
 [(-3.55,4.2,-.5),(-1.8,4.4,-.3),(.5,4.15,-.1),(2.5,3.8,-.8),(4.4,3.9,-1.3)],
 [(-3.7,.18,2.6),(-3.9,.32,1.7),(-3.8,.52,.6),(-3.85,.65,-.5),(-3.9,.95,-1.4)],
 [(-.7,.12,-2.5),(.4,.20,-1.65),(1.5,.15,-.55),(2.6,.22,.5),(3.5,.18,1.4)],
 [(-1.2,.4,-2.9),(-1.25,1.2,-3.0),(-1.25,2.1,-3.0),(-1.6,3.0,-2.9),(-2.5,3.5,-2.7)],
 [(-3.95,.7,1.3),(-4.0,1.5,.8),(-3.95,2.5,.3),(-3.5,3.5,-.1),(-2.0,4.0,-.4)]
]
parts=[]
lv=[];lf=[]
for gi,path in enumerate(paths):
 branch(path,.055 if gi<5 else .038)
 v=[];f=[]
 for si in range(1,len(path)):
  a=np.array(path[si-1]);b=np.array(path[si])
  for spray in range(11 if gi<5 else 9):
   t=(spray+.3+rng.random()*.4)/(11 if gi<5 else 9)
   p=a*(1-t)+b*t
   end=p+np.array([rng.uniform(-.3,.4),rng.uniform(-.42,.24),rng.uniform(-.48,.48)])
   branch([p,(p+end)*.5+np.array([0,.04,0]),end],.014)
   for bloom in range(14 if gi<5 else 11):
    center=end+np.array([rng.gauss(0,.25),rng.gauss(0,.16),rng.gauss(0,.20)])
    # Variation breaks identical spheres, while whole flowers remain readable near camera.
    normal=[rng.uniform(-.9,.9),rng.uniform(-.8,.9),rng.uniform(.3,1)]
    flower(v,f,center,rng.uniform(.085,.14) if gi<5 else rng.uniform(.095,.155),normal,rng.random()*math.tau)
   # Large folded burgundy leaves sit behind the flowers and close gaps in the canopy.
   for leaf in range(3):
    center=end+np.array([rng.gauss(0,.19),rng.gauss(0,.12),rng.gauss(0,.18)])
    n=unit([rng.uniform(-1,1),rng.uniform(-.4,.8),rng.uniform(.4,1)])
    u=unit(np.cross(n,[0,1,0]));w=unit(np.cross(n,u));length=rng.uniform(.24,.4)
    # Rounded lanceolate boundary with a raised central vein, not a diamond card.
    outline=[(0,0),(.22,.18),(.39,.40),(.40,.62),(.28,.83),(0,1),(-.28,.83),(-.40,.62),(-.39,.40),(-.22,.18)]
    start=len(lv)
    lv.append(tuple(center+w*length*.5+n*.025)+tuple(n)+(.5,.5))
    for x,y in outline:
     pos=center+u*length*x+w*length*y+n*(.012*math.sin(y*math.pi)-abs(x)*.065)
     normal=unit(n+u*x*.65-w*(y-.5)*.2)
     lv.append(tuple(pos)+tuple(normal)+(x+.5,y))
    for k in range(len(outline)):lf.extend([start,start+1+k,start+1+(k+1)%len(outline)])
 # Per-spray local coordinates ensure GPU wind bends from the branch base.
 pivot=path[0]
 v=[tuple(np.array(rec[:3])-pivot)+rec[3:] for rec in v]
 info=export('rooftop-proof-cherry-'+str(gi),v,f);info['pivot']=list(pivot);parts.append(info)
parts.append(export('rooftop-proof-cherry-leaves',lv,lf))
parts.append(export('rooftop-proof-cherry-twigs',bv,bf))
(OUT/'rooftop-proof-cherry.json').write_text(json.dumps(parts,indent=2))
print(json.dumps(parts,indent=2))
