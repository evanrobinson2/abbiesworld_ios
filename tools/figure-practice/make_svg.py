import json, math
d=json.load(open("rig.json")); B=d["B"]; Lm=d["L"]; OFF=d["OFF"]; LA=d["LOC_A"]; LB=d["LOC_B"]
TRUE=dict(Lm); TRUE.update(uarmR=130,farmR=120,handR=60,uarmL=133,farmL=125,handL=60,footR=76,footL=72)
SB={n:Lm[n]/TRUE[n] for n in Lm}   # foreshortening in the photo, as a squash along the bone
SA={n:1.0 for n in Lm}
ROOT_A=(-40,0,0); ROOT_B=(0,0,0)   # dx, dy, rotation of the hips
HC=(262,640)
kids={}
for n,p,a,b in B: kids.setdefault(p,[]).append(n)
END_CHILD={"farmR","handR","farmL","handL","shinR","footR","shinL","footL"}
WID=dict(abdomen=(30,34),chest=(44,30),head=(34,34),uarmR=(15,12),farmR=(12,9),handR=(9,8),uarmL=(15,12),farmL=(12,9),handL=(9,8),
         thighR=(22,15),shinR=(15,10),footR=(9,12),thighL=(22,15),shinL=(15,10),footL=(9,12))
def R(v,t):
    t=math.radians(t); c,s=math.cos(t),math.sin(t); return (c*v[0]-s*v[1], s*v[0]+c*v[1])
def fk(loc,sc,root):
    pos={}; W={}
    def go(n,parent_pos,parent_w,parent_n):
        if parent_n is None: o=R(OFF[n],root[2]); base=(HC[0]+root[0]+o[0],HC[1]+root[1]+o[1]); pw=root[2]
        elif n in END_CHILD: v=R((0,TRUE[parent_n]*sc[parent_n]),parent_w); base=(parent_pos[0]+v[0],parent_pos[1]+v[1]); pw=parent_w
        else: o=R(OFF[n],parent_w); base=(parent_pos[0]+o[0],parent_pos[1]+o[1]); pw=parent_w
        w=pw+loc[n]; W[n]=w; v=R((0,TRUE[n]*sc[n]),w); pos[n]=(base,(base[0]+v[0],base[1]+v[1]))
        for k in kids.get(n,[]): go(k,base,w,n)
    for n in kids[None]: go(n,None,None,None)
    return pos
PB=fk(LB,SB,ROOT_B); PA=fk(LA,SA,ROOT_A)
lowA=max(p[1] for s in PA.values() for p in s); lowB=max(p[1] for s in PB.values() for p in s)
ROOT_A=(ROOT_A[0], lowB-25-lowA, ROOT_A[2]); PA=fk(LA,SA,ROOT_A)
pts=[p for P in (PA,PB) for s in P.values() for p in s]
x0=min(p[0] for p in pts)-70; x1=max(p[0] for p in pts)+60; y0=min(p[1] for p in pts)-60; y1=max(p[1] for p in pts)+50
f=lambda v:f"{v:.1f}"
KT="0;0.15;0.42;0.75;1"; KS="0 0 1 1;0.3 0 0.15 1;0 0 1 1;0.5 0 0.5 1"
def anim(attr_type,a,b,dur="3.4s"):
    return f'<animateTransform attributeName="transform" type="{attr_type}" values="{a};{a};{b};{b};{a}" keyTimes="{KT}" calcMode="spline" keySplines="{KS}" dur="{dur}" repeatCount="indefinite" additive="sum"/>'
def shape(n):
    L=TRUE[n]; w0,w1=WID[n]
    if n=="abdomen": return f'<ellipse cx="0" cy="{f(L*0.45)}" rx="{w0}" ry="{f(L*0.42)}"/>'
    if n=="chest": return f'<path d="M -{w0} {f(L*0.1)} C -{w0+6} {f(L*0.75)}, -{w1} {f(L*1.0)}, 0 {f(L*1.02)} C {w1} {f(L*1.0)}, {w0+6} {f(L*0.75)}, {w0} {f(L*0.1)} C {w0-8} -{8}, -{w0-8} -8, -{w0} {f(L*0.1)} Z"/>'
    if n=="head": return f'<line x1="0" y1="0" x2="0" y2="{f(L*0.18)}" class="c"/><ellipse cx="0" cy="{f(L*0.6)}" rx="{w0}" ry="{f(L*0.46)}"/>'
    if n.startswith("hand"): return f'<path d="M -{w0} 2 Q -{w0+3} {f(L*0.7)} 0 {f(L)} Q {w0+3} {f(L*0.7)} {w0} 2 Z"/>'
    if n.startswith("foot"): return f'<path d="M -{w0} 0 L -{w1-4} {f(L*0.8)} Q 0 {f(L*1.08)} {w1-4} {f(L*0.8)} L {w0} 0 Z"/>'
    return f'<path d="M -{w0} 0 A {w0} {w0} 0 0 1 {w0} 0 L {w1} {f(L)} A {w1} {w1} 0 0 1 -{w1} {f(L)} Z"/><line x1="0" y1="0" x2="0" y2="{f(L)}" class="c"/>'
def bone(n,mode):
    a,b=LA[n],LB[n]
    rotv = f'transform="rotate({f(a if mode=="A" else b)})"' if mode!="anim" else ""
    s = (f'transform="scale(1 {f(SA[n] if mode=="A" else SB[n])})"' if mode!="anim" else "")
    out=f'<g {rotv}>'+(anim("rotate",f(a),f(b)) if mode=="anim" else "")
    out+=f'<g {s}>'+(anim("scale",f"1 {SA[n]:.3f}",f"1 {SB[n]:.3f}") if mode=="anim" else "")+shape(n)+'</g>'
    jr=WID[n][0]*0.62
    if n not in("abdomen","chest","head"): out+=f'<circle r="{f(jr)}" class="j"/>'
    for k in kids.get(n,[]):
        if k in END_CHILD:
            ta,tb=TRUE[n]*SA[n],TRUE[n]*SB[n]
            t=f'transform="translate(0 {f(ta if mode=="A" else tb)})"' if mode!="anim" else ""
            out+=f'<g {t}>'+(anim("translate",f"0 {ta:.1f}",f"0 {tb:.1f}") if mode=="anim" else "")+bone(k,mode)+'</g>'
        else:
            out+=f'<g transform="translate({f(OFF[k][0])} {f(OFF[k][1])})">'+bone(k,mode)+'</g>'
    return out+'</g>'
def figure(mode,cls):
    ra,rb=ROOT_A,ROOT_B
    if mode=="anim":
        root=f'<g transform="translate({HC[0]} {HC[1]})">'+anim("translate",f"{ra[0]} {ra[1]}",f"{rb[0]} {rb[1]}")+'<g>'+anim("rotate",f(ra[2]),f(rb[2]))
    else:
        r=ra if mode=="A" else rb
        root=f'<g transform="translate({HC[0]+r[0]} {HC[1]+r[1]})"><g transform="rotate({r[2]})">'
    # draw order: far leg, far arm, torso, near leg, near arm
    order=["thighR","abdomen","thighL"]
    body=""
    for n in order:
        body+=f'<g transform="translate({f(OFF[n][0])} {f(OFF[n][1])})">'+bone(n,mode)+'</g>'
        if n=="thighR": body+='<ellipse cx="0" cy="-10" rx="40" ry="32"/>'  # pelvis block
    return f'<g class="{cls}">'+root+body+'</g></g></g>'
def loa(P):  # line of action: crown -> hips -> supporting foot
    c=P["head"][1]; h=P["abdomen"][0]; t=P["footR"][1]
    ctrl=(2*h[0]-0.5*(c[0]+t[0]), 2*h[1]-0.5*(c[1]+t[1]))
    return f"M {f(c[0])} {f(c[1])} Q {f(ctrl[0])} {f(ctrl[1])} {f(t[0])} {f(t[1])}"
la,lb=loa(PA),loa(PB)
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x0)} {f(y0)} {f(x1-x0)} {f(y1-y0)}" role="img" aria-label="Wooden mannequin moving from a crouch into the leap">
<style>
.fig path,.fig ellipse,.fig circle{{fill:var(--wood-fill,#fbfcfe);stroke:var(--graphite,#2f5fb3);stroke-width:2.4;stroke-linejoin:round}}
.fig .c{{stroke:var(--graphite,#2f5fb3);stroke-width:1;stroke-dasharray:4 5;opacity:.55;fill:none}}
.fig .j{{fill:var(--wood-fill,#fbfcfe)}}
.ghost path,.ghost ellipse,.ghost circle{{fill:none;stroke:var(--graphite,#2f5fb3);stroke-width:1.2;opacity:.22}}
.ghost .c{{display:none}}
.loa{{fill:none;stroke:var(--wood,#b5762f);stroke-width:3;stroke-linecap:round;opacity:.8}}
</style>
{figure("A","ghost")}{figure("B","ghost")}
<path class="loa" d="{la}"><animate attributeName="d" values="{la};{la};{lb};{lb};{la}" keyTimes="{KT}" calcMode="spline" keySplines="{KS}" dur="3.4s" repeatCount="indefinite"/></path>
{figure("anim","fig")}
</svg>'''
open("pose-tween.svg","w").write(svg)
for m,c in (("A","fig"),("B","fig")):
    open(f"pose-{m}.svg","w").write(svg.replace(svg[svg.index('{'.join([''])) if False else 0:0],"") if False else svg.split('{figure')[0] if False else
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{f(x0)} {f(y0)} {f(x1-x0)} {f(y1-y0)}" style="background:#fff">'+svg[svg.index('<style>'):svg.index('</style>')+8]+figure(m,c)+f'<path class="loa" d="{la if m=="A" else lb}"/></svg>')
print(len(svg))
