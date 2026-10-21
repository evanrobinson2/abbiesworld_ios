from pathlib import Path
import subprocess,json,hashlib,base64,urllib.request
root=Path(__file__).parent;team='team_oyQ4CUAshGOCQbr5KHu1jYec';domain='abbies-ranch-atelier.vercel.app'
def api(path):
 result=subprocess.run(['/opt/homebrew/bin/vercel','api',path+'?teamId='+team,'--method','GET'],capture_output=True,text=True,check=True)
 return json.loads(result.stdout)
did=api('/v4/aliases/'+domain)['deployment']['id']
for name in ['ranch-life.mjs','ranch-navigation.mjs']:
 current=urllib.request.urlopen('https://'+domain+'/simulations/'+name).read()
 assert hashlib.sha256(current).digest()==hashlib.sha256((root/'base'/name).read_bytes()).digest(),'Runtime moved: '+name
files={}
def walk(xs,prefix=''):
 for x in xs:
  name=prefix+x['name']
  if x['type']=='directory':walk(x.get('children',[]),'' if name=='src' else name+'/')
  else:files[name]={'file':name,'sha':x['uid']}
walk([x for x in api('/v6/deployments/'+did+'/files') if x['name']=='src']);assert len(files)>2000
for f in (root/'source').rglob('*'):
 if f.is_file():
  n=str(f.relative_to(root/'source'));files[n]={'file':n,'data':base64.b64encode(f.read_bytes()).decode(),'encoding':'base64'}
assert api('/v4/aliases/'+domain)['deployment']['id']==did,'Concurrent deployment'
payload={'name':'abbies-ranch-atelier','project':'prj_BVnIsSnrYu2TkFgLpWiJrLW6NfzI','target':'production','files':list(files.values()),'projectSettings':{'framework':None,'buildCommand':'npm run build','outputDirectory':'public-build'},'meta':{'feature':'conservative-neighbor-reuse','baseline':did}}
(root/'deployment-input.json').write_text(json.dumps(payload));(root/'deployment-baseline.json').write_text(json.dumps({'id':did,'files':len(files)}));print('Prepared',len(files),'files from',did)
