"""Turns the tray renders (render.cjs, tray-<id>.png) into hand-card art (<id>.webp): fills the see-through grass pixels
from the opaque ground around them, crops a 55:52 window around each tile's heart and lifts colour a little."""
import sys
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
# Crop windows in a 1024 px render; scaled to the render's size (2048 since Evan asked for cards sharp up close).
F={'ranch':(404,500,380),'garden':(760,662,380),'meadow':(512,600,620)}  # moon is staged by moon-sky.py
src,out=sys.argv[1],sys.argv[2]
G=lambda a,r:np.array(Image.fromarray(np.clip(a,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)
for k,(cx,cy,s) in F.items():
  src_im=Image.open(f'{src}/tray-{k}.png').convert('RGBA');q=src_im.width/1024;cx,cy,s=round(cx*q),round(cy*q),round(s*q)
  arr=np.array(src_im).astype(np.float32)
  m=(arr[:,:,3]>=250).astype(np.float32);rgb=arr[:,:,:3]
  den=G(m*255,5*q)
  fill=np.stack([G(rgb[:,:,i]*m,5*q) for i in range(3)],-1)/np.maximum(den,1)[:,:,None]*255
  res=np.where(m[:,:,None]>0,rgb,fill)
  im=Image.fromarray(np.clip(res,0,255).astype(np.uint8))
  h=s//2;hh=int(h*52/55);c=im.crop((cx-h,cy-hh,cx+h,cy+hh))
  c=ImageEnhance.Contrast(ImageEnhance.Color(c).enhance(1.2)).enhance(1.08)
  c.resize((1440,round(c.height*1440/c.width)),Image.LANCZOS).save(f'{out}/{k}.webp',quality=86)
  print(k,(cx-h,cy-hh,cx+h,cy+hh))
