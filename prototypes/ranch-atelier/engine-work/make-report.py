import json,hashlib,math
from pathlib import Path
root=Path(__file__).parent
data=json.loads((root/'fps-results.json').read_text())
counts={'single-100':100,'single-250':220,'single-500':306,'single-1000':395,'expanded-520':520,'expanded-760':760,'expanded-1000':1000}
expected={(f,m,v,i) for f in counts for m in (['overview','close','away'] if f in ['single-100','expanded-520','expanded-1000'] else ['overview']) for v in ['base','candidate'] for i in range(3)}
actual={(r['fixture'],r['mode'],r['variant'],r['rep']) for r in data['results']}
assert actual==expected and len(data['results'])==len(expected),'Incomplete or duplicate benchmark cells'
for r in data['results']:
 assert math.isfinite(r['fps']) and r['fps']>0 and not r['errors']
 assert r['after']['animals']==counts[r['fixture']]
 assert r['durationSeconds']>=data['method']['sampleSeconds']*.95
 assert all(abs(value-r['before']['balances'][k])<1e-5 for k,value in r['after']['balances'].items())
for f,m,v,i in expected:
 a=next(r for r in data['results'] if (r['fixture'],r['mode'],r['variant'],r['rep'])==(f,m,v,i))
 b=next(r for r in data['results'] if (r['fixture'],r['mode'],r['variant'],r['rep'])==(f,m,'base' if v=='candidate' else 'candidate',i))
 assert a['before']['position']==b['before']['position'] and a['before']['target']==b['before']['target']
old=json.loads((root/'../benchmarks/simulation-checkpoint-2026-10-21/simulation-third-report/source/simulation-renderer-population-results.json').read_text())
third={r['scenario']['populationKey']:r['fps'] for r in old['thirdAttempt']['measurements']['results']}
data['history']=[{'units':p['units'],'before':p['before']['fps'],'after':p['after']['fps'],'third':third[p['scenario']]} for p in old['pairs']]
data['method']['candidateCommit']='7be0ce2'
data['method']['headless']=True
data['method']['residentScenes']=2
data['method']['residentScenesNote']='Both paired scenes stay allocated; only the measured page renders. Absolute FPS applies to this harness and device.'
data['historyCaveat']='Separate sessions, different load and 30 FPS display ceiling; not a controlled comparison with the current runs.'
data['fixtureHashes']={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'../benchmarks/simulation-checkpoint-2026-10-21/simulation-paired').glob('*.json') if p.stem in {r['fixture'] for r in data['results']}}
(root/'../dist/simulation-core-results.json').write_text(json.dumps(data,separators=(',',':')))
print('Wrote',len(data['results']),'samples and',len(data['history']),'historical points')
