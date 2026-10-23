# AW-STUDY-0042 Abbie's Town round 2: the translucent real-map overlay and the time lapse's years.
# Same inputs as extract_land.py. Writes (1) overlay.png: every real street (all classes), every building footprint
# and the water, as shapes only, 4 m per pixel; (2) history.json: the assessor's year built for the buildings in each
# hectare (a flat sorted list plus offsets) and a count per decade. No owners, addresses or parcel ids are written.
# Run: python3 -I extract_overlay.py prototypes/ranch-atelier/dist/simulations/abbietown
import shapefile,json,sys,collections,os
import numpy as np
from PIL import Image,ImageDraw
from shapely.geometry import shape,box,LineString
from shapely.strtree import STRtree
M='/tmp/claude-0/massgis/'
X0,Y0,X1,Y1=225400,909400,232200,914200;DC=100;PX=4
W,Hh=(X1-X0)//PX,(Y1-Y0)//PX
def reader(p):
  r=shapefile.Reader(p)
  for i in range(len(r)):
    try:sh=r.shape(i,bbox=(X0-400,Y0-400,X1+400,Y1+400))
    except Exception:continue
    if sh is None or sh.shapeType==0 or not sh.points:continue
    yield sh,r.record(i)
P=lambda x,y:((x-X0)/PX,(Hh-(y-Y0)/PX))  # image y runs down: north is up
img=Image.new('RGBA',(W,Hh),(0,0,0,0));d=ImageDraw.Draw(img)
def rings(sh):
  g=shape(sh.__geo_interface__)
  for q in getattr(g,'geoms',[g]):
    if q.geom_type=='Polygon':yield q
for s,r in reader(M+'hydro25k/HYDRO25K_POLY.shp'):
  for q in rings(s):
    if q.area>1500:d.polygon([P(*c) for c in q.exterior.coords],fill=(120,190,235,150))
W_={1:(9,'#fff3c4'),2:(7,'#fff3c4'),3:(6,'#fff3c4'),4:(5,'#fff3c4'),5:(3,'#ffffff'),6:(2,'#ffffff')}
roads=[]
for s,r in reader(M+'MassDOT_Roads_SHP/EOTROADS_ARC.shp'):
  roads.append((r['CLASS'],[P(*p) for p in s.points]))
for c,pts in sorted(roads,key=lambda t:-t[0]):  # small streets first, big roads on top
  w,col=W_.get(c,(2,'#ffffff'))
  if len(pts)>1:d.line(pts,fill=(255,243,196,235) if c<=4 else (255,255,255,215),width=max(1,w//2+1),joint='curve')
# parcels give year built; footprints are drawn
pars=[];ploc=[]
for s,r in reader(M+'L3_SHP_M344_WINCHESTER/L3_SHP_M344_Winchester/M344TaxPar_CY26_FY26.shp'):
  try:g=shape(s.__geo_interface__).buffer(0)
  except Exception:continue
  pars.append(g);ploc.append(r['LOC_ID'])
tree=STRtree(pars);A={}
for r in shapefile.Reader(M+'L3_SHP_M344_WINCHESTER/L3_SHP_M344_Winchester/M344Assess_CY26_FY26.dbf').iterRecords():
  if r['LOC_ID']:A.setdefault(r['LOC_ID'],r.as_dict())
dnx,dny=(X1-X0)//DC,(Y1-Y0)//DC
by=collections.defaultdict(list);dec=collections.Counter();missing=0
for s,r in reader(M+'structures_poly_344/structures_poly_344.shp'):
  g=shape(s.__geo_interface__)
  if g.area<25:continue
  for q in rings(s):d.polygon([P(*c) for c in q.exterior.coords],fill=(236,112,99,235))
  c=g.centroid;i,j=int((c.y-Y0)//DC),int((c.x-X0)//DC)
  if not(0<=i<dny and 0<=j<dnx) or g.area<60:continue
  yr=0
  for k in tree.query(c,predicate='within'):
    rec=A.get(ploc[k]);yr=int(rec['YEAR_BUILT'] or 0) if rec else 0;break
  if 1650<=yr<=2026:by[i*dnx+j].append(yr);dec[yr//10*10]+=1
  else:missing+=1;by[i*dnx+j].append(0)
off=[0];flat=[]
for k in range(dnx*dny):
  ys=sorted(by.get(k,[]));flat+=ys;off.append(len(flat))
out=sys.argv[1]
img.save(os.path.join(out,'overlay.png'),optimize=True)
json.dump({'dc':DC,'dnx':dnx,'dny':dny,'off':off,'y':flat,'decades':{str(k):v for k,v in sorted(dec.items())},'unknown':missing,
 'px':PX,'w':W,'h':Hh,'note':'MassGIS assessor year built; 0 = not recorded (filled from the hectare at use). No owners, addresses or parcel ids.'},open(os.path.join(out,'history.json'),'w'),separators=(',',':'))
print('overlay',img.size,os.path.getsize(os.path.join(out,'overlay.png')),'years',len(flat),'unknown',missing,sorted(dec.items())[:8])
