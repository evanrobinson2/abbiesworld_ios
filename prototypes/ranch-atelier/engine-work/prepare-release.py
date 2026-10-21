from pathlib import Path
import json,subprocess,base64,hashlib
root=Path(__file__).resolve().parent;team='team_oyQ4CUAshGOCQbr5KHu1jYec';domain='abbies-ranch-atelier.vercel.app';out=root/'release-baseline';out.mkdir(exist_ok=True)
def api(path):
 r=subprocess.run(['/opt/homebrew/bin/vercel','api',path+'?teamId='+team,'--method','GET'],capture_output=True,text=True,check=True);return json.loads(r.stdout)
did=api('/v4/aliases/'+domain)['deployment']['id'];files={}
def walk(xs,prefix=''):
 for x in xs:
  name=prefix+x['name']
  if x['type']=='directory':walk(x.get('children',[]),'' if name=='src' else name+'/')
  else:files[name]=x['uid']
walk([x for x in api('/v6/deployments/'+did+'/files') if x['name']=='src'])
for name in ['simulations/lab.mjs','simulations/ranch-life.mjs','simulations/ranch-ecology.mjs','scripts/build.cjs','scripts/check-character-motion.mjs','simulation-performance.html']:
 d=api('/v8/deployments/'+did+'/files/'+files[name]);raw=base64.b64decode(d['data']);assert hashlib.sha1(raw).hexdigest()==files[name];p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
(out/'manifest.json').write_text(json.dumps({'deployment':did,'files':files}));print(did,len(files))
