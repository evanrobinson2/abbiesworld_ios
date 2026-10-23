# Artifacts do not serve .glb, so the study page loads glTF JSON with the buffer embedded.
# python glb2gltf.py tools/figure-practice/mannequin/mannequin-rest-smooth.glb models/mannequin.json
# python glb2gltf.py prototypes/ranch-atelier/dist/studies/brute-fight/red/fighter.glb models/brute.json
import json,struct,base64,sys
src,dst=sys.argv[1:3];b=open(src,'rb').read();jl=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+jl])
o=20+jl;bl=struct.unpack('<I',b[o:o+4])[0];binc=b[o+8:o+8+bl]
j['buffers'][0]['uri']='data:application/octet-stream;base64,'+base64.b64encode(binc).decode()
open(dst,'w').write(json.dumps(j,separators=(',',':')))
