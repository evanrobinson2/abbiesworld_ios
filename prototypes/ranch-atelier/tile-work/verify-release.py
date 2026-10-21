from pathlib import Path
import json,subprocess,hashlib,urllib.request
root=Path(__file__).resolve().parent;team='team_oyQ4CUAshGOCQbr5KHu1jYec';domain='abbies-ranch-atelier.vercel.app'
def api(path):return json.loads(subprocess.run(['/opt/homebrew/bin/vercel','api',path+'?teamId='+team,'--method','GET'],capture_output=True,text=True,check=True).stdout)
d=json.loads(Path('/private/tmp/tile-carry-release/deployment.json').read_text());status=api('/v13/deployments/'+d['id']);assert status['readyState']=='READY',status['readyState'];assert api('/v4/aliases/'+domain)['deployment']['id']==d['id'];files={}
def walk(xs,prefix=''):
 for x in xs:
  n=prefix+x['name']
  if x['type']=='directory':walk(x.get('children',[]),'' if n=='src' else n+'/')
  else:files[n]=x['uid']
walk([x for x in api('/v6/deployments/'+d['id']+'/files') if x['name']=='src'])
baseline=json.loads((root/'baseline/manifest.json').read_text());overlay=json.loads((root/'overlay.json').read_text());unchanged=0
for n,h in baseline['files'].items():
 if n not in overlay['files']:assert files.get(n)==h,n;unchanged+=1
for n,h in overlay['sourceHashes'].items():
 assert files[n]==h,n
 if not n.startswith('tests/'):
  raw=urllib.request.urlopen('https://'+domain+'/'+n).read();assert hashlib.sha1(raw).hexdigest()==h,n
receipt={'deployment':d['id'],'readyState':'READY','canonicalVerified':True,'baseline':baseline['deployment'],'unchangedFiles':unchanged,'changedFiles':overlay['files'],'publicHashesVerified':True}
(root/'release.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
