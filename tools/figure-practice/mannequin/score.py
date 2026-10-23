import sys; from PIL import Image; import numpy as np
n=sys.argv[1]
r=np.asarray(Image.open('../ref/mask_raw.png'))>127
m=np.asarray(Image.open(n+'_sil.png').convert('L'))>127
print('IoU', round((r&m).sum()/(r|m).sum(),3))
ov=np.zeros(r.shape+(3,),np.uint8)+255
ov[r&~m]=(230,120,60); ov[m&~r]=(60,110,220); ov[r&m]=(150,150,150)
Image.fromarray(ov).save(n+'_overlay.png')
