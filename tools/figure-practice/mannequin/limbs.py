# Per-limb miss: label every pixel by its nearest bone, count photo-only and model-only pixels.
import sys; from PIL import Image; import numpy as np
r=np.asarray(Image.open('../ref/mask_raw.png'))>127
m=np.asarray(Image.open(sys.argv[1]+'_sil.png').convert('L'))>127
J={'hR':(232,650),'hL':(292,645),'kR':(213,845),'aR':(195,1045),'tR':(160,1112),'kL':(205,820),'aL':(350,955),'tL':(392,1000),'hc':(262,640),'waist':(322,500),'neck':(420,396),'crown':(494,324),'sR':(332,422),'eR':(283,372),'wR':(268,332),'fR':(266,300),'sL':(445,436),'eL':(575,408),'wL':(705,370),'fL':(770,334)}
segs={'head':('neck','crown'),'chest':('waist','neck'),'abdomen':('hc','waist'),'uarmR':('sR','eR'),'farmR':('eR','wR'),'handR':('wR','fR'),'uarmL':('sL','eL'),'farmL':('eL','wL'),'handL':('wL','fL'),'thighR':('hR','kR'),'shinR':('kR','aR'),'footR':('aR','tR'),'thighL':('hL','kL'),'shinL':('kL','aL'),'footL':('aL','tL')}
ys,xs=np.mgrid[0:r.shape[0],0:r.shape[1]]
def sd(a,b):
    a=np.array(a,float);b=np.array(b,float);d=b-a;t=np.clip(((xs-a[0])*d[0]+(ys-a[1])*d[1])/(d@d),0,1)
    return np.hypot(xs-(a[0]+t*d[0]),ys-(a[1]+t*d[1]))
lab=np.stack([sd(J[a],J[b]) for a,b in segs.values()]).argmin(0); names=list(segs); miss=r^m
for i in np.argsort([-(miss&(lab==k)).sum() for k in range(len(names))])[:8]:
    k=lab==i; print(names[i],'photo-only',(r&~m&k).sum(),'model-only',(m&~r&k).sum())
