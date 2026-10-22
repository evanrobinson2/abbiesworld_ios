"""Validate finished manifests and atomically assemble the browser catalog."""
from pathlib import Path
import json, math
root=Path(__file__).parent/'dist'
records=[]
for manifest in sorted((root/'simulation-assets').glob('*/manifest.json')):
    for r in json.loads(manifest.read_text()):
        for key in ['json','glb']:
            p=root/r[key].lstrip('/')
            assert p.is_file(),p
        parts=json.loads((root/r['json'].lstrip('/')).read_text())
        total=0
        for p in parts:
            assert len(p['positions'])%9==0
            assert len(p['positions'])==len(p['normals'])
            assert all(math.isfinite(n) for n in p['positions']+p['normals'])
            total+=len(p['positions'])//9
        assert total==r['triangles'],r['id']
        records.append(r)
assert len({r['id'] for r in records})==len(records),'Duplicate IDs'
target=root/'simulation-assets/catalog.json'
temp=target.with_suffix('.tmp');temp.write_text(json.dumps(records,indent=2));temp.replace(target)
print(f'{len(records)} validated states across {len(set(r["subject"] for r in records))} families')
