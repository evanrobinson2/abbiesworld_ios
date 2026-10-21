from pathlib import Path
import json
r=Path(__file__).parent
old=json.loads((r/'pre-camera-check.json').read_text());new=json.loads((r/'expanded-corrected.json').read_text())
assert len(new['results'])==6,'Expanded pairs incomplete'
for k in old['manifest'].keys() & new['manifest'].keys():assert old['manifest'][k]==new['manifest'][k], 'Pinned source changed: '+k
rows=[x for x in old['results'] if x['scenario']['populationKey'].startswith('single-')]+new['results']
assert len(rows)==14
for row in rows:assert not row.get('failure'),row.get('failure')
for key in ['expanded-520','expanded-760','expanded-1000']:
 a,b=[x for x in new['results'] if x['scenario']['populationKey']==key]
 assert a['before']['camera']==b['before']['camera'],key+' camera mismatch'
 assert a['after']['activeAnimals']==b['after']['activeAnimals'],key+' population mismatch'
old.update(results=rows,manifest={**old['manifest'],**new['manifest']},expandedCameraMatched=True)
(r/'paired.json').write_text(json.dumps(old,indent=2))
print('All 7 renderer pairs complete; matching expanded cameras and populations verified')
