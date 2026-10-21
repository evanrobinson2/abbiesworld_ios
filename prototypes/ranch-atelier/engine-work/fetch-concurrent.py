from pathlib import Path
import json,subprocess,hashlib,base64
root=Path(__file__).resolve().parent;dist=root.parent/'dist';meta=json.loads((root/'release-baseline/manifest.json').read_text());old={x['file']:x['sha'] for x in json.loads(Path('/Users/evanrobinson/.codex/worktrees/4458/Test/ranch-checkpoint/manifest.json').read_text())['files']};out=root/'release-concurrent';count=0
for name,sha in meta['files'].items():
 if old.get(name)==sha:continue
 target=out/name;target.parent.mkdir(parents=True,exist_ok=True)
 local=dist/name;prepared=root/'release-baseline'/name
 if prepared.is_file() and hashlib.sha1(prepared.read_bytes()).hexdigest()==sha:raw=prepared.read_bytes()
 elif local.is_file() and hashlib.sha1(local.read_bytes()).hexdigest()==sha:raw=local.read_bytes()
 else:
  response=subprocess.run(['/opt/homebrew/bin/vercel','api','/v8/deployments/'+meta['deployment']+'/files/'+sha+'?teamId=team_oyQ4CUAshGOCQbr5KHu1jYec','--method','GET'],capture_output=True,text=True,check=True);raw=base64.b64decode(json.loads(response.stdout)['data'])
 assert hashlib.sha1(raw).hexdigest()==sha;target.write_bytes(raw);count+=1
print('Captured',count,'concurrent production files from',meta['deployment'])
