#!/usr/bin/env python3
"""Validate the committed offline artifact, its asset contract, and source syntax."""
from pathlib import Path
import base64, hashlib, json, re, subprocess, tempfile
root=Path(__file__).resolve().parents[2]
resources=root/'abbies.world.ios/abbies.world.ios/Resources/AmberShallows'
html=(resources/'amber-shallows.html').read_text()
record=json.loads((resources/'amber-shallows-registry.json').read_text())
assert record['gameKey']=='amber-shallows' and record['key']=='runtime/microscope'
assert record['source']=={'type':'bundled','bundleName':'amber-shallows.html'}
assert hashlib.sha256(html.encode()).hexdigest()==record['sha256']
assert not re.search(r'<(?:script|link)\b[^>]*(?:src|href)=',html)
assert 'window.amberStorage' in html and 'window.amberActive' in html
# Every packaged glTF dependency is embedded too, not just its top-level JSON.
documents=[]
for payload in re.findall(r'data:[^;"\s]+;base64,([A-Za-z0-9+/=]+)',html):
 try:documents.append(json.loads(base64.b64decode(payload)))
 except (ValueError,UnicodeError):pass
assert any('positions' in doc for doc in documents)
gltf=next(doc for doc in documents if isinstance(doc,dict) and 'asset' in doc and 'buffers' in doc)
assert all(item['uri'].startswith('data:') for item in gltf['buffers']+gltf.get('images',[]))
js=re.search(r'<script type="module">(.*?)</script>',html,re.S).group(1).replace('<\\/script','</script')
with tempfile.TemporaryDirectory() as tmp:
 module=Path(tmp)/'bundle.mjs';module.write_text(js)
 subprocess.run(['node','--check',str(module)],check=True)
print('PASS: registry hash, offline imports, embedded sculpt/glTF/textures, native hooks, JavaScript syntax')
