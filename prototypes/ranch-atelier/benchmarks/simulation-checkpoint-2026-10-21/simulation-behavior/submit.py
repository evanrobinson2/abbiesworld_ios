from pathlib import Path
import subprocess,json
r=Path(__file__).parent;team='team_oyQ4CUAshGOCQbr5KHu1jYec'
a=json.loads(subprocess.run(['vercel','api','/v4/aliases/abbies-ranch-atelier.vercel.app?teamId='+team,'--method','GET'],capture_output=True,text=True,check=True).stdout)
assert a['deployment']['id']==json.loads((r/'deployment-baseline.json').read_text())['id'],'Production moved; rebase again'
p=subprocess.run(['vercel','api','/v13/deployments?teamId='+team,'--method','POST','--input',str(r/'deployment-input.json')],capture_output=True,text=True,check=True)
(r/'deployment.json').write_text(p.stdout);d=json.loads(p.stdout);print(d['id'],d.get('readyState'))
