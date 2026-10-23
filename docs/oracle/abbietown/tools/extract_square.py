# AW-STUDY-0042: the shape of the town square from public footprints (MassGIS building outlines and open space).
# Writes square.json: shapes only, in metres east and north of the common's centre. No owners, addresses or parcel ids.
# Run: python3 -I extract_square.py prototypes/ranch-atelier/dist/simulations/abbietown
import shapefile,json,sys,glob
from shapely.geometry import shape,Point
from shapely.ops import unary_union
M='/tmp/claude-0/massgis/';out=sys.argv[1]
land=json.load(open(out+'/land.json'));cx,cy=land['spots']['common'];W,D=6800,4800
X0,Y0=225400,909400
wx,wy=X0+cx,Y0+cy  # state-plane metres of the common (local y runs north)
R=170
P=Point(wx,wy)
def rd(p):
  r=shapefile.Reader(p)
  for i in range(len(r)):
    try:sh=r.shape(i,bbox=(wx-R-100,wy-R-100,wx+R+100,wy+R+100))
    except Exception:continue
    if sh is None or sh.shapeType==0 or not sh.points:continue
    yield shape(sh.__geo_interface__),r.record(i)
def local(c):return [round(c[0]-wx,1),round(c[1]-wy,1)]
b=[]
for g,r in rd(glob.glob(M+'structures_poly_344/*.shp')[0]):
  for q in getattr(g,'geoms',[g]):
    if q.geom_type=='Polygon' and q.area>25 and q.distance(P)<R:
      s=q.simplify(.8);b.append({'p':[local(c) for c in s.exterior.coords][:-1],'a':round(q.area)})
sp=[]
for g,r in rd(M+'openspace/OPENSPACE_ARC.shp'):pass
print(len(b),'buildings')
json.dump({'note':'footprints around the common, metres east/north of its centre','buildings':b[:160]},open(out+'/square.json','w'),separators=(',',':'))
