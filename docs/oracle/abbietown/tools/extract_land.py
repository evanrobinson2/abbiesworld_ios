# AW-STUDY-0042 Abbie's Town: measure the real land and the town's character from MassGIS public data.
# The terrain, water and main roads are kept at true scale; local streets and buildings are reduced to counts and
# per-hectare density and style mix, so the town that grows on the land is inspired by Winchester, not a map of it.
# Assessor fields used: style, use code, year built. No owners, addresses or parcel ids leave this script.
# Inputs (downloaded from s3.us-east-1.amazonaws.com/download.massgis.digital.mass.gov/shapefiles/): contours5k
# hp344/347/284/176/10/155, l3parcels L3_SHP_M344_WINCHESTER, structures_poly_344, hydro25k, MassDOT roads,
# state trains, state schools, state openspace, state towns.
# Run: python3 -I extract_land.py prototypes/ranch-atelier/dist/simulations/abbietown/land.json
import shapefile,json,base64,math,collections,sys
import numpy as np
from shapely.geometry import shape,box,LineString,Point
from shapely.strtree import STRtree
from scipy.interpolate import griddata
from scipy.ndimage import gaussian_filter
M='/tmp/claude-0/massgis/';M2='/tmp/claude-0/massgis2/'
X0,Y0,X1,Y1=225400,909400,232200,914200; CELL=20
nx,ny=(X1-X0)//CELL,(Y1-Y0)//CELL
BB=box(X0,Y0,X1,Y1)
def L(x,y):return [round(x-X0,1),round(y-Y0,1)]
def reader(p):
  r=shapefile.Reader(p)
  for i in range(len(r)):
    try:sh=r.shape(i,bbox=(X0-400,Y0-400,X1+400,Y1+400))
    except Exception:continue
    if sh is None or sh.shapeType==0 or not sh.points:continue
    yield sh,r.record(i)
inb=lambda s:s.bbox[2]>X0 and s.bbox[0]<X1 and s.bbox[3]>Y0 and s.bbox[1]<Y1
# 1 terrain from contours
P=[];Z=[]
for f in [M+'hp344/hp344.shp']+[M2+f'hp{n}/hp{n}.shp' for n in (347,284,176,10,155)]:
  for s,r in reader(f):
    if not inb(s):continue
    g=LineString(s.points)
    if g.length<1:continue
    for d in np.arange(0,g.length,8):
      p=g.interpolate(d)
      if X0-300<p.x<X1+300 and Y0-300<p.y<Y1+300:P.append((p.x,p.y));Z.append(r['ELEV_M'])
P=np.array(P);Z=np.array(Z,float);print('contour pts',len(P),Z.min(),Z.max())
gx,gy=np.meshgrid(X0+CELL/2+np.arange(nx)*CELL,Y0+CELL/2+np.arange(ny)*CELL)
H=griddata(P,Z,(gx,gy),method='linear')
Hn=griddata(P,Z,(gx,gy),method='nearest');H=np.where(np.isnan(H),Hn,H)
H=gaussian_filter(H,1.0)
# 2 water
water=[]
wpolys=[]
for s,r in reader(M+'hydro25k/HYDRO25K_POLY.shp'):
  if not inb(s):continue
  g=shape(s.__geo_interface__).buffer(0).intersection(BB)
  if g.is_empty or g.area<1500:continue
  # POLY_CODE: 1 lake/pond? keep all water polygons
  wpolys.append((g,r['NAME'].strip(),r['POLY_CODE']))
mask=np.zeros(H.shape,bool)
from shapely import contains_xy
for g,n,c in wpolys:
  inside=contains_xy(g,gx,gy)
  b=g.boundary;pts=[b.interpolate(d) for d in np.arange(0,b.length,20)]
  rim=[H[min(ny-1,max(0,int((p.y-Y0)//CELL))),min(nx-1,max(0,int((p.x-X0)//CELL)))] for p in pts]
  lvl=float(np.percentile(rim,10)) if rim else float(H[inside].min())
  H[inside]=np.minimum(H[inside],lvl-1.5);mask|=inside
  gs=g.simplify(6)
  polys=list(gs.geoms) if gs.geom_type=='MultiPolygon' else [gs]
  for q in polys:
    if q.geom_type!='Polygon' or q.area<1500:continue
    water.append({'n':n,'lvl':round(lvl,1),'a':round(q.area),'ring':[L(*c) for c in q.exterior.coords]})
print('water',len(water),sorted([(w['n'],w['a'],w['lvl']) for w in water],key=lambda w:-w[1])[:12])
streams=[]
for s,r in reader(M+'hydro25k/HYDRO25K_ARC.shp'):
  if not inb(s) or r['ARC_CODE'] not in (4,5):continue  # stream centre lines
  g=LineString(s.points).intersection(BB)
  for q in getattr(g,'geoms',[g]):
    if q.geom_type=='LineString' and q.length>40:streams.append({'n':r['NAME'].strip(),'p':[L(*c) for c in q.simplify(6).coords]})
print('streams',len(streams),collections.Counter(s['n'] for s in streams).most_common(6))
rail=[]
for s,r in reader(M2+'trains/TRAINS_ARC.shp'):
  if not inb(s):continue
  g=LineString(s.points).intersection(BB)
  for q in getattr(g,'geoms',[g]):
    if q.geom_type=='LineString' and q.length>20:rail.append([L(*c) for c in q.simplify(4).coords])
print('rail',len(rail))
roads=[];rlen=collections.Counter();ends=collections.Counter()
for s,r in reader(M+'MassDOT_Roads_SHP/EOTROADS_ARC.shp'):
  if not inb(s):continue
  g=LineString(s.points).intersection(BB)
  for q in getattr(g,'geoms',[g]):
    if q.geom_type!='LineString' or q.length<5:continue
    c=r['CLASS'];rlen[c]+=q.length
    for e in (q.coords[0],q.coords[-1]):ends[(round(e[0]),round(e[1]))]+=1
    if c<=4:roads.append({'c':c,'p':[L(*cc) for cc in q.simplify(4).coords]})  # local streets are counted, not kept: the town grows its own lanes
inter=sum(1 for k,v in ends.items() if v>=3)
print('roads',len(roads),{k:round(v) for k,v in rlen.items()},'intersections',inter)
# 3 the town's character: building density and style per 100 m cell, from footprints joined to assessor style
pars=[];ploc=[]
for s,r in reader(M+'L3_SHP_M344_WINCHESTER/L3_SHP_M344_Winchester/M344TaxPar_CY26_FY26.shp'):
  try:g=shape(s.__geo_interface__).buffer(0)
  except Exception:continue
  pars.append(g);ploc.append(r['LOC_ID'])
tree=STRtree(pars)
A={}
for r in shapefile.Reader(M+'L3_SHP_M344_WINCHESTER/L3_SHP_M344_Winchester/M344Assess_CY26_FY26.dbf').iterRecords():
  if r['LOC_ID']:A.setdefault(r['LOC_ID'],r.as_dict())
def family(st,uc):
  st=st.upper()
  if uc.startswith('3') or st in('OFFICE','STORE','COMM BLOCK','WAREHOUSE','CONDO-OFC'):return 'shop'
  if uc.startswith('9') or st in('CHURCH/SYN','SCHOOL'):return 'civic'
  if 'CONDO' in st or 'MULTI' in st or uc in('111','112','105','104'):return 'multi'
  if 'CAPE' in st or 'BUNGALOW' in st:return 'cape'
  if 'RANCH' in st or 'SPLIT' in st or 'CONTEMP' in st:return 'ranch'
  if 'VICTORIAN' in st or 'OLD STYLE' in st or 'TUDOR' in st:return 'victorian'
  return 'colonial'
FAM=['colonial','cape','ranch','victorian','multi','shop','civic']
DC=100; dnx,dny=(X1-X0)//DC,(Y1-Y0)//DC
dens=np.zeros((dny,dnx),int);fam=np.zeros((dny,dnx,len(FAM)),int);area=np.zeros((dny,dnx));era=np.zeros((dny,dnx))
bcount=collections.Counter();sizes=[];yrs=[]
for s,r in reader(M+'structures_poly_344/structures_poly_344.shp'):
  g=shape(s.__geo_interface__)
  if g.area<25:continue  # sheds under 25 m2 skipped (counted below)
  c=g.centroid;i,j=int((c.y-Y0)//DC),int((c.x-X0)//DC)
  if not(0<=i<dny and 0<=j<dnx):continue
  rec=None
  for k in tree.query(c,predicate='within'):
    rec=A.get(ploc[k]);break
  f=family(rec['STYLE'] if rec else '',rec['USE_CODE'] if rec else '101') if rec else 'colonial'
  if g.area<60 and f=='colonial':f='garage'
  bcount[f]+=1
  if f=='garage':continue
  dens[i,j]+=1;fam[i,j,FAM.index(f)]+=1;area[i,j]+=g.area;sizes.append(g.area)
  if rec and rec['YEAR_BUILT']:era[i,j]+=rec['YEAR_BUILT']
print('buildings',dict(bcount),'median footprint',np.median(sizes))
# spots: from public school points and open space names
spots={}
for s,r in reader(M+'schools/Schools/SCHOOLS_PT.shp'):
  if r['TOWN']=='WINCHESTER' and r['NAME'].startswith('Muraco'):spots['muraco']=L(*s.points[0])
for s,r in reader(M+'openspace/OPENSPACE_POLY.shp'):
  n=(r['SITE_NAME'] or '').strip()
  key={'Leonard Field and Beach':'leonard','Ginn Field':'ginn','Winchester Town Common':'common','Mill Pond':'millpond','Wedge Pond Park':'wedge'}.get(n)
  if key and key not in spots:spots[key]=L(*shape(s.__geo_interface__).centroid.coords[0])
# Horn Pond: the biggest water polygon whose name says so
hp=[w for w in water if 'HORN' in w['n'].upper()]
print('horn names',[(w['n'],w['a']) for w in water if w['n']][:30])
out={'source':'MassGIS (public): 1:5,000 contours, Hydrography 1:25,000, MassDOT roads, trains, structures, L3 parcels + assessor (style, use, year only; no owners or addresses), schools, open space',
 'origin':[X0,Y0],'cell':CELL,'nx':nx,'ny':ny,
 'h':base64.b64encode(np.round(H*10).astype('<i2').tobytes()).decode(),
 'water':water,'streams':streams,'rail':rail,'roads':roads,
 'dc':DC,'dnx':dnx,'dny':dny,'dens':dens.flatten().tolist(),'fam':FAM,'mix':fam.reshape(-1,len(FAM)).tolist(),
 'era':[int(e/d) if d else 0 for e,d in zip(era.flatten(),dens.flatten())],
 'spots':spots,'stats':{'roads_m':{k:round(v) for k,v in rlen.items()},'intersections':inter,'buildings':dict(bcount),'median_footprint':float(np.median(sizes)),'hmin':float(H.min()),'hmax':float(H.max())}}
json.dump(out,open(sys.argv[1],'w'),separators=(',',':'))
print('spots',spots)
