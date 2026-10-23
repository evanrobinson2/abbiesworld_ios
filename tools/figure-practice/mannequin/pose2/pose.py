# Pose 2: standing wooden mannequin, front view (Wikimedia Commons File:Wooden_Mannequin.jpg, 500x750 thumb).
# Joints read off the picture in its own px, then mapped into the leap's camera frame so part sizes carry over:
# scale 1.47 makes the thigh its true 198 px; offsets centre the figure in the 866x1290 frame.
import json, os
K, OX, OY = 1.47, 65, 94
RAW = dict(crown=(252,40), neck=(252,150), waist=(250,258), hc=(250,350),
  hR=(227,352), hL=(272,352), kR=(222,490), kL=(265,490), aR=(219,632), aL=(262,632), tR=(215,668), tL=(270,668),
  sR=(190,172), sL=(314,176), eR=(178,277), eL=(328,283), wR=(170,372), wL=(323,383), fR=(178,428), fL=(316,436))
J2 = {k:(round(x*K+OX,1), round(y*K+OY,1)) for k,(x,y) in RAW.items()}
# head centre sits at t=0.52 between neck and crown: push crown so the 58 px half-length head lands on the picture's head
hcY=82*K+OY; J2['crown']=(J2['crown'][0], round(J2['neck'][1]-(J2['neck'][1]-hcY)/0.52,1))
for k in ('hR','kR','aR','tR','hL','kL','aL','tL'): J2[k]=(round(J2[k][0]-4,1),J2[k][1])   # rep 3: both legs sit 4 px left of where I read them
for k in ('aL','tL'): J2[k]=(round(J2[k][0]+10,1),J2[k][1])   # rep 4: the viewer-right ankle sits further right, so that shin leans out
def L(a,b): return ((J2[b][0]-J2[a][0])**2+(J2[b][1]-J2[a][1])**2)**0.5
CHAINS=[[a,b,round(L(a,b),1),0] for a,b in (("sR","eR"),("eR","wR"),("wR","fR"),("sL","eL"),("eL","wL"),("wL","fL"),
        ("hR","kR"),("kR","aR"),("hL","kL"),("kL","aL"))]
CHAINS+= [["aR","tR",78,-1],["aL","tL",78,-1]]   # feet point at the camera: true length 78, the rest is depth
SIZES=dict(head=(70,56,52), chest=(86,78,52), chest_taper=0.4)   # rep 2: a real mannequin's head and chest are bigger, and the chest is a shield (wide at the shoulders)
json.dump(dict(sizes=SIZES, J2=J2, DEPTH=dict(hR=0,hL=0,hc=0,waist=0,neck=0,crown=0,sR=0,sL=0), CHAINS=CHAINS, upright=True, cut_y=round(640*K+OY)), open(os.path.join(os.path.dirname(__file__),'pose.json'),'w'), indent=1)
