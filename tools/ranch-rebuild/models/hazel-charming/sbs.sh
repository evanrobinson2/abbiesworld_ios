#!/bin/sh
# hero | render side by side (for looking, not scoring).  usage: sh sbs.sh OUT.jpg
cd "$(dirname "$0")"
python3 -c "
from PIL import Image
a=Image.open('r/hero_mj.png').convert('RGBA'); b=Image.new('RGB',a.size,(237,230,214)); b.paste(a,(0,0),a)
t=Image.open('../../mj/hazel-charming/hero.png').convert('RGB').resize(a.size)
c=Image.open('r/hero_compare.jpg')
s=Image.new('RGB',(a.size[0]*2,a.size[1]+c.size[1]),'white'); s.paste(t,(0,0)); s.paste(b,(a.size[0],0)); s.paste(c,(0,a.size[1])); s.save('$1')"
