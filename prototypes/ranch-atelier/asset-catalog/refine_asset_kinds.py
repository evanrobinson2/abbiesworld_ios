"""Migration 001: distinguish an individual asset's kind from its thematic pack."""
from pathlib import Path
import sqlite3,json,csv
root=Path(__file__).parent;db=sqlite3.connect(root/'civilization-assets.sqlite');db.execute('PRAGMA foreign_keys=ON')
if 'asset_kind' in [r[1] for r in db.execute('PRAGMA table_info(assets)')]:raise SystemExit('Migration already applied')
db.execute("ALTER TABLE assets ADD COLUMN asset_kind TEXT NOT NULL DEFAULT 'unclassified'")
packs=[]
for line in (root/'catalog-seeds.txt').read_text().splitlines():
 if line.startswith('['):
  p,t,k=line[1:-1].split('|');packs.append((p,k,[]))
 elif line.strip():packs[-1][2].extend(x.strip() for x in line.split(','))
for p,group,names in packs:
 for i,name in enumerate(names):
  kind=group
  if p=='ranch-life':kind='actor' if i<40 else 'prop'
  if p=='ranch-buildings':kind='building' if i<20 else 'module' if 30<=i<40 else 'prop'
  if p in ['plants','ground-flora','crops'] or p=='early-land' and i<10:kind='plant'
  if p=='water-and-sail':kind='vehicle' if i<30 else 'module'
  if p=='air-travel':kind='vehicle' if i<30 else 'infrastructure'
  if p=='robotics':kind='actor' if i<30 else 'module'
  if p=='orbital-access':kind='vehicle' if i<10 or 30<=i<40 else 'infrastructure' if i<20 else 'module'
  if p=='planetary-exploration':kind='vehicle' if i<20 else 'prop'
  if p=='interplanetary-ships':kind='vehicle' if i<30 else 'module'
  if p=='planetary-settlements' and 30<=i<40:kind='module'
  ident=db.execute('SELECT id FROM assets WHERE name=?',(name,)).fetchone()[0]
  db.execute('UPDATE assets SET asset_kind=? WHERE id=?',(kind,ident))
  if kind not in ['building','infrastructure']:
   db.execute("DELETE FROM asset_state_profiles WHERE asset_id=? AND profile_id='construction'",(ident,))
   if group=='building':db.execute("DELETE FROM asset_affordances WHERE asset_id=? AND affordance_id='build'",(ident,))
  if kind=='plant':
   db.execute("DELETE FROM asset_state_profiles WHERE asset_id=? AND profile_id='organism'",(ident,))
   db.execute("INSERT OR IGNORE INTO asset_state_profiles VALUES(?,'plant')",(ident,))
  if kind=='module':db.execute("UPDATE representations SET role='part' WHERE asset_id=? AND production_status='planned'",(ident,))
db.execute('DROP VIEW catalog')
db.execute('CREATE VIEW catalog AS SELECT a.id,a.name,p.title AS pack,p.design_family,a.asset_kind,a.priority,a.mechanics_status,a.speculative,r.production_status,r.uri FROM assets a JOIN packs p ON p.id=a.pack_id JOIN representations r ON r.asset_id=a.id')
db.execute("INSERT INTO metadata VALUES('migration_001','Individual asset kind separated from pack family; removed inappropriate construction contracts from care props.')")
db.commit();assert not db.execute('PRAGMA foreign_key_check').fetchall();assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
db.row_factory=sqlite3.Row
rows=[dict(r) for r in db.execute('SELECT * FROM catalog ORDER BY priority,pack,name')]
for row in rows:
 for field,table,col in [('eras','asset_eras','era_id'),('state_profiles','asset_state_profiles','profile_id'),('affordances','asset_affordances','affordance_id')]:row[field]=[r[0] for r in db.execute(f'SELECT {col} FROM {table} WHERE asset_id=?',(row['id'],))]
metadata=dict(db.execute('SELECT key,value FROM metadata'))
(root/'civilization-assets.json').write_text(json.dumps(dict(metadata=metadata,assets=rows),indent=2),encoding='utf-8')
with (root/'civilization-assets.csv').open('w',newline='',encoding='utf-8-sig') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows({k:'; '.join(v) if isinstance(v,list) else v for k,v in r.items()} for r in rows)
assert len(rows)==2000 and len({r['id'] for r in rows})==2000
assert db.execute("SELECT asset_kind FROM assets WHERE name='Water bucket'").fetchone()[0]=='prop'
assert not db.execute("SELECT 1 FROM asset_state_profiles s JOIN assets a ON a.id=s.asset_id WHERE a.name='Water bucket' AND s.profile_id='construction'").fetchone()
print(json.dumps({'assets':len(rows),'integrity':'ok','foreign_keys':'ok','prop_contracts':'checked','kinds':dict(db.execute('SELECT asset_kind,count(*) FROM assets GROUP BY asset_kind'))},indent=2))
db.close()
