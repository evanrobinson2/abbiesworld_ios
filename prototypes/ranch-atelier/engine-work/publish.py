from pathlib import Path
import subprocess,json,hashlib,base64,sys,urllib.request
root=Path(__file__).resolve().parent;dist=root.parent/'dist';team='team_oyQ4CUAshGOCQbr5KHu1jYec';domain='abbies-ranch-atelier.vercel.app';project='prj_BVnIsSnrYu2TkFgLpWiJrLW6NfzI'
# Kept outside the repository: this contains the full Vercel submission payload.
out=Path('/private/tmp/ranch-engine-release');out.mkdir(exist_ok=True)
def api(path,method='GET',payload=None):
 args=['/opt/homebrew/bin/vercel','api',path+'?teamId='+team,'--method',method]
 if payload:args+=['--input',str(payload)]
 return json.loads(subprocess.run(args,capture_output=True,text=True,check=True).stdout)
baseline=json.loads((root/'release-baseline/manifest.json').read_text());did=api('/v4/aliases/'+domain)['deployment']['id'];files={}
def walk(xs,prefix=''):
 for x in xs:
  name=prefix+x['name']
  if x['type']=='directory':walk(x.get('children',[]),'' if name=='src' else name+'/')
  else:files[name]={'file':name,'sha':x['uid']}
walk([x for x in api('/v6/deployments/'+did+'/files') if x['name']=='src']);assert len(files)>3000
names=['simulations/lab.mjs','simulations/ranch-life.mjs','simulations/ranch-ecology.mjs','scripts/build.cjs','scripts/check-character-motion.mjs','scripts/check-navigation-build.mjs','simulation-performance.html','simulation-core-results.json']
names += ['tests/ranch-engine.test.cjs'] + [str(p.relative_to(dist)) for p in (dist/'tests/ranch-engine').iterdir() if p.is_file()]
names += ['simulations/simulation/'+n for n in ['actor-state.mjs','ranch-core.mjs','ranch-animal-core.mjs','ranch-people-core.mjs','ranch-ecology-core.mjs','ranch-headless.mjs']]
names += [str(p.relative_to(dist)) for p in (dist/'simulations/simulation/compiled').iterdir() if p.is_file()]
for name in names:
 expected=baseline['files'].get(name);actual=files.get(name,{}).get('sha');assert actual==expected,f'Concurrent edit to {name}; rebase first'
 p=root/'release-source'/name if name=='simulations/lab.mjs' else dist/name
 raw=p.read_bytes();files[name]={'file':name,'data':base64.b64encode(raw).decode(),'encoding':'base64'}
with urllib.request.urlopen('https://'+domain+'/api/ai-compose') as response: ai_enabled=json.load(response).get('enabled',False)
payload={'name':'abbies-ranch-atelier','project':project,'target':'production','files':list(files.values()),'projectSettings':{'framework':None,'buildCommand':'npm run build','outputDirectory':'public-build'},'env':{'AI_COMPOSITION_ENABLED':'true' if ai_enabled else 'false'},'meta':{'feature':'ranch-core-fps','baseline':did}}
(out/'deployment-input.json').write_text(json.dumps(payload));(root/'release-baseline/overlay.json').write_text(json.dumps({'baseline':did,'files':names,'sourceHashes':{name:hashlib.sha1((root/'release-source'/name if name=='simulations/lab.mjs' else dist/name).read_bytes()).hexdigest() for name in names}},indent=2));print('Prepared',len(files),'files from',did,'with',len(names),'overlays')
if '--submit' in sys.argv:
 assert api('/v4/aliases/'+domain)['deployment']['id']==did,'Production moved; rebase first'
 result=api('/v13/deployments','POST',out/'deployment-input.json');(out/'deployment.json').write_text(json.dumps(result));print(result['id'],result.get('readyState'))
