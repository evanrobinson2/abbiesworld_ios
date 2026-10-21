from pathlib import Path
import subprocess,json
r=Path(__file__).parent;d=json.loads((r/'deployment.json').read_text());id=d['id'];team='team_oyQ4CUAshGOCQbr5KHu1jYec'
p=subprocess.run(['vercel','api','/v13/deployments/'+id+'?teamId='+team,'--method','GET'],capture_output=True,text=True,check=True);d=json.loads(p.stdout);(r/'status.json').write_text(p.stdout);print(id,d.get('readyState'),d.get('errorMessage'))
