# usage: rep.sh N  -> builds repN, repNs, rest GLBs, page images and glb.txt
set -e; cd "$(dirname "$0")"; N=$1
python3 -c "import sys; sys.argv=['b','$PWD/rep$N']; exec(open('build.py').read())" >/dev/null 2>&1
SMOOTH=1 python3 -c "import sys; sys.argv=['b','$PWD/rep${N}s']; exec(open('build.py').read())" >/dev/null 2>&1
REST=1 python3 -c "import sys; sys.argv=['b','$PWD/rest']; exec(open('build.py').read())" >/dev/null 2>&1
REST=1 SMOOTH=1 python3 -c "import sys; sys.argv=['b','$PWD/rest_smooth']; exec(open('build.py').read())" >/dev/null 2>&1
echo "low $(python3 score.py rep$N)  smooth $(python3 score.py rep${N}s)"
python3 -c "
from PIL import Image
box=(120,270,800,1150)
for a,b in (('rep$N','rep$N'),('rep${N}s','smooth')):
  Image.open(a+'_shaded.png').convert('RGB').crop(box).save('../page/img/'+b+'-shaded.jpg',quality=85)
  Image.open(a+'_overlay.png').convert('RGB').crop(box).save('../page/img/'+b+'-overlay.jpg',quality=85)"
base64 -w0 rep$N.glb > ../page/model/mannequin.glb.txt; base64 -w0 rep${N}s.glb > ../page/model/smooth.glb.txt
