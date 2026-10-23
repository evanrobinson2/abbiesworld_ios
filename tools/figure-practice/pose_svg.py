import math, json
# Pose B: joints read off Evan's photo (image px). Pose A: anticipation crouch, as angle changes.
J = dict(hc=(262,640), hR=(232,650), hL=(292,645),
 kR=(213,845), aR=(195,1045), tR=(160,1112),
 kL=(205,820), aL=(350,955), tL=(392,1000),
 waist=(318,505), neck=(418,398), crown=(492,326),
 sR=(332,420), eR=(283,372), wR=(268,332), fR=(266,303),
 sL=(445,436), eL=(575,408), wL=(705,370), fL=(768,336))
# bone: name, parent, from, to, shape
B = [("abdomen",None,"hc","waist"),("chest","abdomen","waist","neck"),("head","chest","neck","crown"),
 ("uarmR","chest","sR","eR"),("farmR","uarmR","eR","wR"),("handR","farmR","wR","fR"),
 ("uarmL","chest","sL","eL"),("farmL","uarmL","eL","wL"),("handL","farmL","wL","fL"),
 ("thighR",None,"hR","kR"),("shinR","thighR","kR","aR"),("footR","shinR","aR","tR"),
 ("thighL",None,"hL","kL"),("shinL","thighL","kL","aL"),("footL","shinL","aL","tL")]
def ang(v): return math.degrees(math.atan2(-v[0], v[1]))  # rotate(t) maps (0,1) to v
def sub(a,b): return (a[0]-b[0],a[1]-b[1])
def rot(v,t):
    t=math.radians(t); c,s=math.cos(t),math.sin(t); return (c*v[0]-s*v[1], s*v[0]+c*v[1])
W={}; L={}
for n,p,a,b in B:
    v=sub(J[b],J[a]); W[n]=ang(v); L[n]=math.hypot(*v)
# offsets in parent local frame (root frame = image frame at hc)
OFF={}
for n,p,a,b in B:
    if p is None: OFF[n]=sub(J[a],J["hc"])
    else: OFF[n]=rot(sub(J[a],J[[x for x in B if x[0]==p][0][2]]), -W[p])
LOC_B={n:(W[n]-(W[p] if p else 0)) for n,p,a,b in B}
# Pose A: crouched wind-up before the leap (world-angle changes from B, degrees; + swings toward screen left)
dA = dict(abdomen=+30, chest=+40, head=+45, uarmR=+150, farmR=+120, handR=+120, uarmL=+100, farmL=+95, handL=+90,
          thighR=-55, shinR=+40, footR=+70, thighL=-80, shinL=+60, footL=+20)
WA=dict(abdomen=-140,chest=-128,head=-140,uarmR=35,farmR=20,handR=15,uarmL=25,farmL=10,handL=5,
         thighR=-105,shinR=22,footR=-88,thighL=-95,shinL=12,footL=-85)
LOC_A={n:(WA[n]-(WA[p] if p else 0)) for n,p,a,b in B}
json.dump(dict(W=W,L=L,OFF=OFF,LOC_A=LOC_A,LOC_B=LOC_B,B=B),open("rig.json","w"),indent=1)
