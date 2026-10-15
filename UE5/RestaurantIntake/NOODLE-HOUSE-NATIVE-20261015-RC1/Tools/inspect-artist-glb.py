"""Inspect artist GLB exports without modifying their original bytes."""
import argparse, hashlib, json, struct
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('files',nargs='+');p.add_argument('--out',required=True);args=p.parse_args()
results=[]
for name in args.files:
 path=Path(name);raw=path.read_bytes();magic,version,length=struct.unpack_from('<III',raw)
 assert magic==0x46546c67 and version==2 and length==len(raw),f'Invalid GLB: {path}'
 offset=12;doc=None
 while offset<len(raw):
  size,kind=struct.unpack_from('<II',raw,offset);offset+=8
  if kind==0x4e4f534a:doc=json.loads(raw[offset:offset+size].decode('utf-8').rstrip('\x00 '))
  offset+=size
 assert doc and doc.get('meshes'),f'No meshes: {path}'
 meshes=[]
 for mesh in doc['meshes']:
  primitives=[]
  for pr in mesh['primitives']:
   ac=doc['accessors'][pr['attributes']['POSITION']]
   ind=doc['accessors'][pr['indices']]['count'] if 'indices' in pr else ac['count']
   primitives.append({'vertices':ac['count'],'triangles':ind//3 if pr.get('mode',4)==4 else None,'position_min':ac.get('min'),'position_max':ac.get('max'),'material':pr.get('material')})
  meshes.append({'name':mesh.get('name'),'primitives':primitives})
 results.append({'path':str(path.resolve()),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'meshes':meshes,'materials':len(doc.get('materials',[])),'images':len(doc.get('images',[])),'skins':len(doc.get('skins',[])),'animations':len(doc.get('animations',[])),'nodes':doc.get('nodes',[]),'note':'Accessor bounds are mesh-local, not world-space; visual axes and ground/worktop/carry anchors require inspection.'})
Path(args.out).write_text(json.dumps(results,indent=2),encoding='utf-8')
print(json.dumps([{'file':r['path'],'sha256':r['sha256'],'meshes':len(r['meshes']),'skins':r['skins'],'animations':r['animations']} for r in results]))
