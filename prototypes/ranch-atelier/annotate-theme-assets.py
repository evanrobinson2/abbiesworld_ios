"""Recover named GLB surfaces by geometry bounds + triangle count; ambiguity stays unmapped."""
import json, struct, pathlib, math, hashlib
from theme_metadata import surface_metadata
ROOT=pathlib.Path(__file__).parent/'dist/simulation-assets'
def bounds(points):
    return [min(points[i::3]) for i in range(3)]+[max(points[i::3]) for i in range(3)]
def glb_surfaces(path):
    b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];d=json.loads(b[20:20+n]);binary=b[28+n:]
    def accessor(i):
        a=d['accessors'][i];v=d['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC3':3}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];step=struct.calcsize(fmt)*size;offset=v.get('byteOffset',0)+a.get('byteOffset',0)
        return [struct.unpack_from('<'+fmt*size,binary,offset+j*v.get('byteStride',step)) for j in range(a['count'])]
    out=[]
    for node in d['nodes']:
        if 'mesh' not in node or node.get('children') or 'matrix' in node: continue
        t=node.get('translation',[0,0,0]);sc=node.get('scale',[1,1,1]);x,y,z,w=node.get('rotation',[0,0,0,1])
        m=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
        for prim in d['meshes'][node['mesh']]['primitives']:
            pts=[]
            for v in accessor(prim['attributes']['POSITION']): pts.extend([sum(m[i][j]*v[j]*sc[j] for j in range(3))+t[i] for i in range(3)])
            mat=d['materials'][prim['material']]
            out.append((node['name'],mat['name'],bounds(pts),d['accessors'][prim['indices']]['count']))
    return out
stats={'files':0,'parts':0,'mapped':0,'unmapped':0,'geometryMatched':0}
for path in ROOT.glob('*/*.json'):
    parts=json.loads(path.read_text())
    if not isinstance(parts,list) or not parts or not isinstance(parts[0],dict) or 'positions' not in parts[0]:continue
    surfaces=glb_surfaces(path.with_suffix('.glb'));before=[(p['positions'],p.get('normals'),p['color']) for p in parts]
    for p in parts:
        box=bounds(p['positions']);matches=[s for s in surfaces if s[3]==len(p['positions'])//3 and max(abs(a-b) for a,b in zip(box,s[2]))<.0001 and ('name' not in p or p['name']==s[0])]
        if len(matches)==1:
            name,mat,_,_=matches[0];p.update(surface_metadata(path.parent.name,mat,name,p['color']));stats['geometryMatched']+=1
        else:p.update(role='unmapped',defaultColor=list(p['color']),roleSource='unmapped-ambiguous-or-missing-glb-surface')
        stats['parts']+=1;stats['mapped' if p['role']!='unmapped' else 'unmapped']+=1
    assert before==[(p['positions'],p.get('normals'),p['color']) for p in parts]
    path.write_text(json.dumps(parts,separators=(',',':')));stats['files']+=1
print(json.dumps(stats))
