# Run only after timing: preserve current production additions in the repository,
# then keep our explicitly-owned simulation/report overlays.
from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parent;dist=root.parent/'dist';meta=json.loads((root/'release-baseline/manifest.json').read_text())
owned={'simulations/lab.mjs','simulations/ranch-life.mjs','simulations/ranch-ecology.mjs','scripts/build.cjs','scripts/check-character-motion.mjs','simulation-performance.html'}
for p in (root/'release-concurrent').rglob('*'):
 if not p.is_file():continue
 name=str(p.relative_to(root/'release-concurrent'))
 if name in owned:continue
 assert hashlib.sha1(p.read_bytes()).hexdigest()==meta['files'][name]
 target=dist/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes())
(dist/'simulations/lab.mjs').write_bytes((root/'release-source/simulations/lab.mjs').read_bytes())
print('Preserved concurrent production modules; integrated visibility hook into current lab.')
