"""Measured game-scene drawings sourced from the same design.json as Blender."""
import json,math,os
os.environ.setdefault("MPLCONFIGDIR","/private/tmp/rooftop-architecture-mpl")
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon,Rectangle,Circle,Ellipse,Arc
from matplotlib.collections import LineCollection
ROOT=Path(__file__).resolve().parent;D=json.loads((ROOT/'design.json').read_text());A=D['alcove'];R=D['roof'];F=D['deck'];T=D['tree']
ink='#293b41';muted='#647277';paper='#f6f3ed';wood='#ddd6c8';rose='#dfc4c7';tree='#c9ceca';blue='#27768a';red='#a86d51'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'text.color':ink,'axes.labelcolor':ink,'svg.fonttype':'none'})
fig=plt.figure(figsize=(18,13),facecolor=paper)
gs=fig.add_gridspec(2,2,left=.045,right=.965,top=.87,bottom=.12,wspace=.18,hspace=.23,width_ratios=[1,1.1])
plan=fig.add_subplot(gs[0,0]);section=fig.add_subplot(gs[1,0]);clay=fig.add_subplot(gs[0,1]);elev=fig.add_subplot(gs[1,1])
for ax in [plan,section,elev]:ax.set_aspect('equal');ax.set_facecolor(paper);ax.axis('off')
def line(ax,a,b,**kw):ax.plot([a[0],b[0]],[a[1],b[1]],color=kw.pop('color',ink),lw=kw.pop('lw',1),**kw)
def dim(ax,a,b,offset,label,vertical=False):
 a=np.array(a,dtype=float);b=np.array(b,dtype=float);v=np.array([offset,0]) if vertical else np.array([0,offset]);aa=a+v;bb=b+v
 line(ax,a,aa,lw=.5,color=muted);line(ax,b,bb,lw=.5,color=muted);ax.annotate('',xy=aa,xytext=bb,arrowprops={'arrowstyle':'|-|','lw':.7,'color':muted})
 mid=(aa+bb)/2;ax.text(mid[0]+(.09 if vertical else 0),mid[1]+(0 if vertical else .08),label,ha='left' if vertical else 'center',va='center' if vertical else 'bottom',rotation=90 if vertical else 0,fontsize=8,bbox={'facecolor':paper,'edgecolor':'none','pad':1})
def box(ax,xy,w,h,fc=wood,ec=ink,lw=.9):ax.add_patch(Rectangle(xy,w,h,facecolor=fc,edgecolor=ec,lw=lw))
def title(ax,n,name,sub):
 ax.text(0,1.08,n+'   '+name,transform=ax.transAxes,fontsize=13,weight='bold');ax.text(0,1.02,sub,transform=ax.transAxes,fontsize=8,color=muted)
angle=math.radians(A['yaw_degrees']);rot=np.array([[math.cos(angle),-math.sin(angle)],[math.sin(angle),math.cos(angle)]]);orig=np.array(A['origin'][:2])
def xy(u,v):return orig+rot@np.array([u,v])
def rotated_rect(ax,u,v,w,d,**kw):
 pts=[xy(u-w/2,v-d/2),xy(u+w/2,v-d/2),xy(u+w/2,v+d/2),xy(u-w/2,v+d/2)];ax.add_patch(Polygon(pts,**kw))

# Plan: boards/rail are visible; framing is shown in a separate clear direction key.
outline=np.array(F['outline']);patch=Polygon(outline,facecolor='#ebe6dd',edgecolor=ink,lw=1.6);plan.add_patch(patch)
for x in np.arange(-3.4,3.41,F['board_width']):
 ymax=min(2.6,x+3);line(plan,(x,-2.6),(x,ymax),color='#a99e8b',lw=.45)
for points in [D['railing']['reference_run'],D['railing']['return_run']]:
 a,b=np.array(points);line(plan,a,b,lw=3,color=blue)
 count=math.ceil(np.linalg.norm(b-a)/D['railing']['bay_spacing'])
 for t in np.linspace(0,1,count+1):
  p=a+(b-a)*t;box(plan,p-.06,.12,.12,fc=ink)
# Exact right-angle relationship between rear and side guard runs.
c=np.array(D['railing']['reference_run'][1]);line(plan,c+[-.30,0],c+[-.30,-.30],color=blue,lw=1.4);line(plan,c+[-.30,-.30],c+[0,-.30],color=blue,lw=1.4)
plan.text(2.62,1.90,'90°',color=blue,fontsize=10,weight='bold')
# Tree envelope at deck, cut opening removed in its plan footprint.
theta=np.linspace(-math.pi/4,5*math.pi/4,100);outer=np.array([xy(2.3*math.cos(a),.85+1.55*math.sin(a)) for a in theta]);inner=np.array([xy(2.0*math.cos(a),.85+1.25*math.sin(a)) for a in theta[::-1]])
plan.add_patch(Polygon(np.vstack([outer,inner]),facecolor=tree,edgecolor=muted,lw=1))
rotated_rect(plan,0,A['panel_v'],A['panel_width'],.14,facecolor=rose,edgecolor=ink)
for u in A['post_centers_u']:rotated_rect(plan,u,A['post_v'],.18,.22,facecolor=ink,edgecolor=ink)
rotated_rect(plan,0,A['bench_v'],A['bench_width'],A['bench_depth'],facecolor=wood,edgecolor=ink)
rotated_rect(plan,0,(R['front_v']+R['rear_v'])/2,R['u_max']-R['u_min'],R['rear_v']-R['front_v'],facecolor='none',edgecolor=red,lw=1,linestyle=(0,(5,3)))
base=xy(*T['fork_path_uvz'][1][:2]);plan.add_patch(Circle(base,.61,facecolor=paper,edgecolor=muted,lw=.8,zorder=3));plan.add_patch(Circle(base,.49,facecolor=tree,edgecolor=ink,lw=.8,zorder=4))
sx,sy,_=D['seat']['center'];box(plan,(sx-D['seat']['width']/2,sy-D['seat']['length']/2),.88,2.3,rose)
# A-A passes through the right post and both roof beams.
aa=xy(1.32,-2.3);ab=xy(1.32,.6);line(plan,aa,ab,color=red,ls='-.',lw=1.1)
plan.text(aa[0]+.1,aa[1]-.15,'A',color=red,weight='bold');plan.text(ab[0]+.1,ab[1]+.06,'A',color=red,weight='bold')
plan.annotate('boards + side rail\nparallel (Y)',xy=(1.7,-.8),xytext=(.40,-2.1),ha='center',fontsize=8,color=blue,arrowprops={'arrowstyle':'->','color':blue,'lw':.9})
plan.annotate('rear rail crosses boards (X)',xy=(1.4,2.49),xytext=(1.25,3.4),ha='center',fontsize=8,color=blue,arrowprops={'arrowstyle':'->','color':blue,'lw':.9})
plan.annotate('canopy above\n(dashed)',xy=xy(-.8,-1.9),xytext=(-4.08,-1.75),fontsize=8,color=red,arrowprops={'arrowstyle':'-','color':red,'lw':.7})
dim(plan,(-3.4,-2.6),(3.4,-2.6),-.48,'6.80 m overall');dim(plan,(3.4,-2.6),(3.4,2.6),.46,'5.20 m',True)
plan.set_xlim(-4.4,4.4);plan.set_ylim(-3.6,4.0);title(plan,'01','DECK PLAN','Boards: Y  •  rear guard: X  •  return guard: Y  •  only the trunk recess is chamfered')

# Section in the actual alcove V-Z plane through a roof-bearing post.
slope=R['slope_dz_per_minus_v'];cos=math.cos(math.atan(slope))
def bottom(v):return R['rear_beam_bottom']+slope*(R['rear_beam_v']-v)
def upper(v):return bottom(v)+R['beam_depth']-.045+R['rafter_depth']/cos
v0=R['front_v'];v1=R['rear_v'];pv=A['post_v'];bw=R['beam_width']
box(section,(-2.6,-.055),3.3,.055);box(section,(-2.6,-.275),3.3,.22,fc='#e8e3d9',ec=muted)
box(section,(pv-.09,-.575),.18,.30,fc=wood)
box(section,(pv-A['post_depth']/2,0),A['post_depth'],A['header_bottom'])
for v in [R['front_beam_v'],R['rear_beam_v']]:box(section,(v-bw/2,bottom(v)),bw,R['beam_depth'])
# Rafter seats use the same polygon profile as the Blender builder.
prof=[(v0,bottom(v0)+R['beam_depth']-.045)]
for v in sorted([R['front_beam_v'],R['rear_beam_v']]):
 lo=v-bw/2;hi=v+bw/2;prof.extend([(lo,bottom(lo)+R['beam_depth']-.045),(lo,bottom(v)+R['beam_depth']),(hi,bottom(v)+R['beam_depth']),(hi,bottom(hi)+R['beam_depth']-.045)])
prof.extend([(v1,bottom(v1)+R['beam_depth']-.045),(v1,upper(v1)),(v0,upper(v0))]);section.add_patch(Polygon(prof,facecolor=wood,edgecolor=ink,lw=1))
section.add_patch(Polygon([(v0,upper(v0)),(v1,upper(v1)),(v1,upper(v1)+.045/cos),(v0,upper(v0)+.045/cos)],facecolor=rose,edgecolor=ink,lw=.8))
a=np.array([pv,R['brace_post_z']]);b=np.array([R['front_beam_v'],bottom(R['front_beam_v'])]);normal=np.array([-(b-a)[1],(b-a)[0]]);normal=normal/np.linalg.norm(normal)*R['brace_width']/2;section.add_patch(Polygon([a+normal,b+normal,b-normal,a-normal],facecolor=wood,edgecolor=ink,lw=.9))
# Window/bench seen beyond the section cut, thin grey lines.
box(section,(A['panel_v']-.07,0),.14,A['panel_top'],fc='none',ec=muted,lw=.6);box(section,(A['bench_v']-.24,.32),.48,.11,fc='none',ec=muted,lw=.6)
for text,point,label in [('boarding',(-1.28,upper(-1.28)+.035),(.4,4.0)),('rafter seat',(-.36,3.49),(.4,3.58)),('post → ledger',(-.36,1.75),(.4,1.75)),('brace carries\nfront beam',(-1.05,2.92),(-2.95,2.70))]:
 section.annotate(text,xy=point,xytext=label,fontsize=8,arrowprops={'arrowstyle':'-','lw':.7,'color':muted})
dim(section,(v0,4.1),(v1,4.1),.32,'1.75 m canopy projection');dim(section,(-.36,0),(-.36,3.25),.77,'3.25 m rear headroom',True)
section.text(-2.85,-.87,'Section A–A at post U = +1.32 m\nRoof pitch 14.6° • fitted rafter seats • deck datum Z = 0',fontsize=8,color=muted)
section.set_xlim(-3.12,1.3);section.set_ylim(-1.0,4.8);title(section,'02','CANOPY BEARING SECTION','Roof → rafters → beams → posts / braces → deck framing')

# Neutral model with tree masses suppressed, keeping all timber in its assembled location.
clay.set_facecolor(paper);clay.axis('off');clay.imshow(plt.imread(ROOT/'A03-frame-cutaway.png'));clay.set_xlim(110,1360);clay.set_ylim(1090,270);title(clay,'03','ASSEMBLED TIMBER FRAME','Actual Blender render • tree hidden for inspection • no parts moved')

# Front elevation looking normal to the alcove. No perspective distortion.
box(elev,(-1.62,3.25),3.24,.24)
for u in A['post_centers_u']:box(elev,(u-.09,0),.18,3.25)
box(elev,(-A['panel_width']/2,0),A['panel_width'],3.25,rose)
for u in A['post_centers_u']:box(elev,(u-.09,0),.18,3.25)
box(elev,(-1.43,.91),2.86,.14)
elev.add_patch(Circle((0,A['window_center_z']),A['window_outer_radius'],facecolor=wood,edgecolor=ink));elev.add_patch(Circle((0,A['window_center_z']),A['window_inner_radius'],facecolor=paper,edgecolor=ink,lw=.75))
for x in [-.23,0,.23]:
 e=math.sqrt(.52**2-x*x);box(elev,(x-.0225,A['window_center_z']-e),.045,2*e)
for z in [-.16,.16]:
 e=math.sqrt(.52**2-z*z);box(elev,(-e,A['window_center_z']+z-.0225),2*e,.045)
box(elev,(-1.15,.32),2.30,.11)
for x in [-.98,.98]:box(elev,(x-.055,0),.11,.32)
line(elev,(-1.8,0),(1.8,0),lw=1.4)
dim(elev,(-1.23,.02),(1.23,.02),-.42,'2.46 m clear recess');dim(elev,(1.41,0),(1.41,3.25),.44,'3.25 m',True)
elev.annotate('Ø 1.22 m timber surround',xy=(.56,2.55),xytext=(2.08,2.70),fontsize=8,arrowprops={'arrowstyle':'-','color':muted,'lw':.7})
elev.annotate('430 mm bench height',xy=(.98,.43),xytext=(2.08,.67),fontsize=8,arrowprops={'arrowstyle':'-','color':muted,'lw':.7})
elev.text(2.08,1.63,'FIXED WINDOW RECESS\nThe reference shows a bench below it.\nA walk-through doorway and its\ncirculation remain undesigned.',fontsize=8,color=muted,linespacing=1.5)
elev.set_xlim(-2.2,5.2);elev.set_ylim(-.75,3.85);title(elev,'04','ALCOVE ELEVATION','A separate, square timber frame recessed within the hollow trunk')
fig.text(.045,.952,'ROOFTOP LOOKOUT',fontsize=23,weight='bold');fig.text(.045,.912,'A01  /  Architectural basis',fontsize=15,color=blue)
fig.text(.965,.947,'GAME-SCENE DESIGN\nAdopted dimensions in metres\n28 September 2026',ha='right',va='top',fontsize=10,color=muted,linespacing=1.6)
fig.text(.045,.067,'CONSTRUCTION GRID',fontsize=9,weight='bold',color=blue);fig.text(.045,.043,'Boards Y  |  joists X  |  primary girders Y  |  rear railing X  |  side railing Y',fontsize=10)
fig.text(.59,.068,'Observed: deck, railing, window recess, overhead timber.\nDesigned: corner plan, hollow trunk and bearing arrangement.\nOpen: tree joint detail, hidden circulation and final reference camera.',fontsize=8,color=muted,linespacing=1.55)
fig.savefig(ROOT/'A01-architecture-sheet.png',dpi=145,facecolor=paper);fig.savefig(ROOT/'A01-architecture-sheet.svg',facecolor=paper)
plt.close(fig)

# Separate framing plan makes the board/joist/girder relationship easy to verify.
fig,ax=plt.subplots(figsize=(10,8),facecolor=paper);ax.set_aspect('equal');ax.axis('off');ax.set_facecolor(paper)
ax.add_patch(Polygon(outline,facecolor='#eeebe5',edgecolor=ink,lw=1.3))
for x in np.arange(-3.4,3.41,F['board_width']):line(ax,(x,-2.6),(x,min(2.6,x+3)),color='#cfc6b6',lw=.45)
footprints=json.loads((ROOT/'framing-footprints.json').read_text())
for part in sorted(footprints,key=lambda p:0 if 'girder' in p['id'] else 1):
 lo=part['min'];hi=part['max'];girder='girder' in part['id']
 box(ax,(lo[0],lo[1]),hi[0]-lo[0],hi[1]-lo[1],fc='#82998d' if girder else '#8fb6c2',ec='#516e60' if girder else blue,lw=.5)
base=xy(*T['fork_path_uvz'][1][:2]);circle=Circle(base,D['deck']['tree_opening_clear_radius'],facecolor=paper,edgecolor=red,lw=1,zorder=3);ax.add_patch(circle)
ax.annotate('Framed tree opening',xy=(base[0]+.61,base[1]),xytext=(-2.45,-.14),fontsize=9,color=red,arrowprops={'arrowstyle':'-','color':red,'lw':.7})
for pts in [D['railing']['reference_run'],D['railing']['return_run']]:line(ax,*pts,color=ink,lw=3)
for x,y,text,color in [(-3.35,3.3,'DECK BOARDS  •  Y',red),(-.15,3.3,'JOISTS  •  X',blue),(2.10,3.3,'GIRDERS  •  Y','#516e60')]:ax.text(x,y,text,color=color,fontsize=10,weight='bold')
ax.annotate('',xy=(1,-.8),xytext=(1,-1.8),arrowprops={'arrowstyle':'->','color':red,'lw':2});ax.annotate('',xy=(1.9,-.85),xytext=(.1,-.85),arrowprops={'arrowstyle':'->','color':blue,'lw':2})
ax.text(.2,-2.12,'Boards cross joists at 90°',color=blue,fontsize=11,bbox={'facecolor':paper,'edgecolor':'none','pad':4})
ax.set_xlim(-3.9,3.95);ax.set_ylim(-3.1,3.6);fig.text(.07,.956,'A01  /  DECK FRAMING GRID',fontsize=18,weight='bold',color=ink);fig.text(.07,.035,'Actual Blender framing footprints. The tree opening has doubled trimmers and a header; chamfer ledger omitted.',fontsize=9,color=muted)
fig.savefig(ROOT/'A04-deck-grid.png',dpi=160,facecolor=paper);fig.savefig(ROOT/'A04-deck-grid.svg',facecolor=paper)
print('ARCHITECTURE_DRAWINGS_SAVED')
