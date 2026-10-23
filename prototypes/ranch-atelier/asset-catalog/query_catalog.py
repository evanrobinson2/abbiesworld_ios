"""Read-only search: python query_catalog.py --search horse --era agriculture"""
import argparse,sqlite3,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--search',default='');p.add_argument('--era');p.add_argument('--pack');p.add_argument('--limit',type=int,default=30);p.add_argument('--stats',action='store_true');args=p.parse_args()
db=sqlite3.connect((Path(__file__).parent/'civilization-assets.sqlite').as_uri()+'?mode=ro',uri=True);db.row_factory=sqlite3.Row
if args.stats:
 result={key:[dict(r) for r in db.execute(sql)] for key,sql in {'packs':'SELECT pack,COUNT(*) AS count FROM catalog GROUP BY pack','production':'SELECT production_status,COUNT(*) AS count FROM catalog GROUP BY production_status','mechanics':'SELECT mechanics_status,COUNT(*) AS count FROM catalog GROUP BY mechanics_status'}.items()}
else:
 sql='SELECT * FROM catalog WHERE name LIKE ?';values=['%'+args.search+'%']
 if args.era:sql+=' AND id IN(SELECT asset_id FROM asset_eras WHERE era_id=?)';values.append(args.era)
 if args.pack:sql+=' AND pack LIKE ?';values.append('%'+args.pack+'%')
 sql+=' ORDER BY priority,name LIMIT ?';values.append(max(1,min(2000,args.limit)));result=[dict(r) for r in db.execute(sql,values)]
print(json.dumps(result,indent=2));db.close()
