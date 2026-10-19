"""Build the authored planning catalog. Does not create models or gameplay rules."""
from pathlib import Path
import sqlite3, json, csv, re, hashlib
ROOT=Path(__file__).parent
def slug(text): return re.sub(r'[^a-z0-9]+','-',text.lower()).strip('-')
packs=[]
for line in (ROOT/'catalog-seeds.txt').read_text(encoding='utf-8').splitlines():
 if line.startswith('['):
  ident,title,kind=line[1:-1].split('|');packs.append(dict(id=ident,title=title,kind=kind,names=[]))
 elif line.strip():packs[-1]['names'].extend(x.strip() for x in line.split(','))
assert len(packs)==40 and all(len(p['names'])==50 for p in packs)
names=[n for p in packs for n in p['names']]
assert len(set(n.casefold() for n in names))==2000
dbfile=ROOT/'civilization-assets.sqlite'
# Preserve an existing catalog: generation is a one-time seed operation.
if dbfile.exists(): raise SystemExit('Catalog already exists; use a migration rather than overwriting reviewed data.')
db=sqlite3.connect(dbfile);db.execute('PRAGMA foreign_keys=ON')
db.executescript('''
CREATE TABLE metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE packs(id TEXT PRIMARY KEY,title TEXT NOT NULL,design_family TEXT NOT NULL,proposed_scale TEXT NOT NULL);
CREATE TABLE styles(id TEXT PRIMARY KEY,name TEXT NOT NULL,selected INTEGER NOT NULL CHECK(selected IN(0,1)),guidance TEXT NOT NULL);
CREATE TABLE eras(id TEXT PRIMARY KEY,label TEXT NOT NULL,interpretation TEXT NOT NULL);
CREATE TABLE assets(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,pack_id TEXT NOT NULL REFERENCES packs(id),style_id TEXT NOT NULL REFERENCES styles(id),priority INTEGER NOT NULL CHECK(priority BETWEEN 0 AND 3),record_status TEXT NOT NULL CHECK(record_status IN('candidate','reviewed','deferred')),mechanics_status TEXT NOT NULL CHECK(mechanics_status IN('proposed','source-supported','decorative')),speculative INTEGER NOT NULL CHECK(speculative IN(0,1)),concept_note TEXT NOT NULL,dimensions_m_json TEXT,physical_scale_reviewed INTEGER NOT NULL DEFAULT 0 CHECK(physical_scale_reviewed IN(0,1)));
CREATE INDEX assets_pack ON assets(pack_id);CREATE INDEX assets_priority ON assets(priority);CREATE INDEX assets_status ON assets(mechanics_status);
CREATE TABLE asset_eras(asset_id TEXT REFERENCES assets(id),era_id TEXT REFERENCES eras(id),PRIMARY KEY(asset_id,era_id));
CREATE TABLE representations(id TEXT PRIMARY KEY,asset_id TEXT NOT NULL REFERENCES assets(id),role TEXT NOT NULL CHECK(role IN('base','part','state','lod','icon')),production_status TEXT NOT NULL CHECK(production_status IN('planned','study','modeled','reviewed','integrated')),format TEXT,uri TEXT,triangles INTEGER,bytes INTEGER,rig_status TEXT NOT NULL DEFAULT 'not-designed',acceptance TEXT NOT NULL DEFAULT 'unreviewed');
CREATE TABLE state_profiles(id TEXT PRIMARY KEY,scope TEXT NOT NULL);
CREATE TABLE visual_states(profile_id TEXT REFERENCES state_profiles(id),name TEXT,driver_contract TEXT NOT NULL,implementation_status TEXT NOT NULL DEFAULT 'proposed',PRIMARY KEY(profile_id,name));
CREATE TABLE asset_state_profiles(asset_id TEXT REFERENCES assets(id),profile_id TEXT REFERENCES state_profiles(id),PRIMARY KEY(asset_id,profile_id));
CREATE TABLE affordances(id TEXT PRIMARY KEY,intent TEXT NOT NULL,validator_requirement TEXT NOT NULL,event_requirement TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN('proposed','source-supported')));
CREATE TABLE asset_affordances(asset_id TEXT REFERENCES assets(id),affordance_id TEXT REFERENCES affordances(id),PRIMARY KEY(asset_id,affordance_id));
CREATE TABLE relationships(subject_id TEXT REFERENCES assets(id),predicate TEXT NOT NULL,object_id TEXT REFERENCES assets(id),status TEXT NOT NULL DEFAULT 'proposed',PRIMARY KEY(subject_id,predicate,object_id));
CREATE TABLE scenarios(id TEXT PRIMARY KEY,label TEXT NOT NULL,goal TEXT NOT NULL,status TEXT NOT NULL);
CREATE TABLE scenario_assets(scenario_id TEXT REFERENCES scenarios(id),asset_id TEXT REFERENCES assets(id),purpose TEXT NOT NULL,PRIMARY KEY(scenario_id,asset_id));
CREATE TABLE evidence(id TEXT PRIMARY KEY,kind TEXT NOT NULL,locator TEXT NOT NULL,observation TEXT NOT NULL);
CREATE TABLE bindings(asset_id TEXT REFERENCES assets(id),system TEXT NOT NULL,state_path TEXT NOT NULL,evidence_id TEXT REFERENCES evidence(id),status TEXT NOT NULL,note TEXT NOT NULL,PRIMARY KEY(asset_id,system,state_path));
CREATE TABLE production_batches(id TEXT PRIMARY KEY,status TEXT NOT NULL,authoring_seconds REAL,geometry_seconds REAL,export_seconds REAL,process_seconds REAL,review_seconds REAL,note TEXT NOT NULL);
CREATE TABLE batch_assets(batch_id TEXT REFERENCES production_batches(id),asset_name TEXT,PRIMARY KEY(batch_id,asset_name));
''')
meta={
 'schema_version':'1','catalog_version':'2026-10-18-draft-1','asset_count_definition':'2000 named candidate concepts; includes complete objects and modular parts. Visual states, LODs, palettes and instances are excluded from this count.',
 'scope':'Planning database from emergent life to speculative intergalactic civilization. Not a scientific chronology, evolutionary model, game engine or finished asset library.',
 'era_policy':'Era tags describe possible settings, not unlock dates or an inevitable ladder of evolution or cultural development. Assets may coexist across tags.',
 'style_selection':'User selected Soft toy on 2026-10-18. Fluffy appearance means rounded silhouette here; no fur simulation or strand requirement.',
 'materials':'Small independently recolorable palette; matte rough surfaces; no image textures required. Prefer shared materials.',
 'production_policy':'Model in batches of ten by function; inspect silhouettes at phone scale. Creature rigs, colliders, LODs, animation, dimensions and engine integration need separate review.',
 'state_authority':'Simulator owns inventory, actions, position, construction, care and consequences. Art and narration cannot manufacture completed actions.',
 'coverage_limit':'Breadth-first candidate list. Regional and cultural specificity, accessibility, interiors, animation and ecological relationships remain incomplete. Not 2000 approved distinct silhouettes.',
 'review_result':'Current simulation has physical hauling, construction, care, cleaning, trail wear and timed horse activities. Crop sales and persistent pair bonds remain proposed; no economy or bond implementation claimed.',
 'seed_sha256':hashlib.sha256((ROOT/'catalog-seeds.txt').read_bytes()).hexdigest()
}
db.executemany('INSERT INTO metadata VALUES(?,?)',meta.items())
db.execute('INSERT INTO styles VALUES(?,?,?,?)',('soft-toy','Soft toy',1,'Rounded low-detail forms, beveled edges, clear silhouettes, separate simple color regions; no fur, photoreal texture maps or baked lighting required.'))
era_defs=[('emergence','Emergent life'),('ecosystems','Ecosystems and deep time'),('foraging','Foraging communities'),('agriculture','Agricultural settlements'),('craft-cities','Craft and civic settlements'),('industrial','Industrial societies'),('modern','Modern technological societies'),('orbital','Orbital civilization'),('planetary','Multi-world civilization'),('stellar','Interstellar concepts'),('galactic','Galactic and intergalactic concepts')]
db.executemany('INSERT INTO eras VALUES(?,?,?)',[(i,t,'Scenario tag; not a validated date, prerequisite or universal progression.') for i,t in era_defs])
era_map={
 'emergent-life':['emergence','ecosystems'],'cellular-life':['emergence','ecosystems','modern'],
 'marine-life':['ecosystems'],'aquatic-vertebrates':['ecosystems'],'early-land':['ecosystems'],'deep-time-fauna':['ecosystems'],
 'plants':['ecosystems','agriculture','modern'],'ground-flora':['ecosystems','agriculture'],'wildlife':['ecosystems'],'birds-reptiles':['ecosystems'],
 'landscape':['ecosystems','agriculture','planetary'],'geology-resources':['ecosystems','industrial','planetary'],
 'foraging':['foraging'],'ranch-life':['agriculture','industrial','modern'],'ranch-buildings':['agriculture','industrial','modern'],'crops':['agriculture','modern','planetary'],
 'farming-tools':['agriculture','industrial','modern'],'early-settlements':['agriculture','craft-cities'],'crafts':['craft-cities','industrial'],'water-and-sail':['craft-cities','industrial','modern'],
 'civic-life':['craft-cities','industrial','modern'],'domestic-life':['craft-cities','industrial','modern'],'construction-kit':['craft-cities','industrial','modern'],
 'roads-and-logistics':['industrial','modern'],'industrial-production':['industrial','modern'],'land-vehicles':['industrial','modern'],'air-travel':['modern'],
 'energy-water':['industrial','modern','planetary'],'science-medicine':['modern','orbital'],'information-culture':['craft-cities','industrial','modern'],'robotics':['modern','planetary'],
 'orbital-access':['orbital'],'space-habitats':['orbital'],'planetary-exploration':['planetary'],'planetary-settlements':['planetary'],
 'space-industry':['orbital','planetary'],'interplanetary-ships':['planetary'],'stellar-frontier':['stellar'],'galactic-civilization':['galactic'],'alien-ecologies':['stellar','galactic']}
profiles={
 'organism':('Living organisms, as applicable',[('resting','Recorded activity'),('moving','Recorded position and velocity'),('feeding','Validated consumption event')]),
 'plant':('Plants and crops',[('young','Growth stage, if a growth system exists'),('mature','Growth stage'),('harvested','Successful harvest event; proposed')]),
 'micro':('Cellular forms',[('intact','Cell state'),('dividing','Validated division process; proposed')]),
 'construction':('Constructed objects',[('planned','Construction job accepted'),('foundation','Recorded construction progress'),('frame','Recorded construction progress'),('complete','Construction completion event')]),
 'container':('Resource containers',[('empty','Inventory quantity equals zero'),('part-filled','Inventory fraction'),('full','Inventory equals capacity')]),
 'machine':('Machines and vehicles',[('idle','Activity state'),('operating','Validated job running'),('maintenance','Condition state, if implemented')])}
for ident,(scope,states) in profiles.items():
 db.execute('INSERT INTO state_profiles VALUES(?,?)',(ident,scope))
 db.executemany('INSERT INTO visual_states VALUES(?,?,?,?)',[(ident,n,driver,'proposed') for n,driver in states])
affordances=[
 ('carry','Carry a resource','Check stock, capacity, reachability and pickup location','Pickup and delivery events','source-supported'),
 ('build','Assemble at a site','Check materials, work time and worker location','Progress and completion events','source-supported'),
 ('feed','Supply animal food','Check depot stock, cargo and destination','Care delivery and consumption events','source-supported'),
 ('water','Supply animal water','Check stock, cargo and water point','Care delivery and consumption events','source-supported'),
 ('clean','Clean habitat','Check dirt quantity and worker position','Cleaning collection and compost delivery','source-supported'),
 ('ride','Ride with a horse','Check human and horse availability and approach path','Horse activity started and completed','source-supported'),
 ('plant','Plant a crop','Check seed stock, soil, labor and plot occupancy','Planting event','proposed'),
 ('harvest','Harvest produce','Check crop maturity, yield and carrier capacity','Yield debit and cargo credit','proposed'),
 ('sell','Sell delivered produce','Check ownership, market location, inventory and price','Inventory debit and monetary credit','proposed'),
 ('bond','Develop a persistent pair relationship','Check actual interaction quality and pair identity','Pair-specific relationship delta with causal event','proposed'),
 ('manufacture','Transform inputs into outputs','Check recipe, energy, inventory and work time','Material-conserving production event','proposed'),
 ('transport','Transport cargo or passengers','Check payload, route, fuel or energy and time','Departure, movement and arrival events','proposed')]
db.executemany('INSERT INTO affordances VALUES(?,?,?,?,?)',affordances)
notes={
 'micro':'Schematic enlarged microscopic representation; physical size and internal anatomy require review.',
 'organism':'Recognizable silhouette first; locomotion, life stage and anatomy need subject review.',
 'environment':'Reusable terrain form; fit to generated geography rather than scatter randomly.',
 'resource':'Distinguishable resource representation; yields and extraction mechanics are not supplied by this catalog.',
 'prop':'Simple graspable or placeable form; define interaction anchors before integration.',
 'actor':'Distinct silhouette and independently colored regions; rigging and action permissions are separate.',
 'building':'Readable entrance, footprint and structural volumes; dimensions and navigation clearance need review.',
 'module':'Reusable connection geometry; define sockets and compatibility before assembly.',
 'infrastructure':'Connect to actual routes, resources or services; no implied operational simulation.',
 'machine':'Separate moving parts and input/output anchors; operation rules remain external.',
 'vehicle':'Separate chassis, cargo and moving parts; route and propulsion rules remain external.',
 'speculative':'Invented design concept; technology, biology and feasibility are not established.'}
by_name={};records=[]
for pack in packs:
 pid=pack['id'];scale='microscopic-display' if pack['kind']=='micro' else 'astronomical-display' if pid in ['stellar-frontier','galactic-civilization'] else 'scene-display'
 db.execute('INSERT INTO packs VALUES(?,?,?,?)',(pid,pack['title'],pack['kind'],scale))
 for name in pack['names']:
  ident=pid+'.'+slug(name);by_name[name]=ident
  speculative=pack['kind']=='speculative' or 'concept' in name.lower()
  priority=1 if pid in ['ranch-life','ranch-buildings','crops','farming-tools'] else 2 if pid in ['plants','ground-flora','landscape','construction-kit','domestic-life'] else 3
  db.execute('INSERT INTO assets VALUES(?,?,?,?,?,?,?,?,?,?,?)',(ident,name,pid,'soft-toy',priority,'candidate','proposed',int(speculative),notes[pack['kind']],None,0))
  db.executemany('INSERT INTO asset_eras VALUES(?,?)',[(ident,e) for e in era_map[pid]])
  role='part' if pack['kind']=='module' else 'base'
  db.execute('INSERT INTO representations(id,asset_id,role,production_status) VALUES(?,?,?,?)',(ident+'.soft-toy',ident,role,'planned'))
  profile='plant' if pid in ['plants','ground-flora','crops'] else 'micro' if pack['kind']=='micro' else 'organism' if pack['kind']=='organism' or pid=='ranch-life' and name in pack['names'][:40] else 'construction' if pack['kind']=='building' else 'machine' if pack['kind'] in ['vehicle','machine'] else None
  if profile:db.execute('INSERT INTO asset_state_profiles VALUES(?,?)',(ident,profile))
  if pid=='crops':db.executemany('INSERT INTO asset_affordances VALUES(?,?)',[(ident,a) for a in ['plant','harvest']])
  if pack['kind']=='building':db.execute('INSERT INTO asset_affordances VALUES(?,?)',(ident,'build'))
  records.append(dict(id=ident,name=name,pack=pid,design_family=pack['kind'],style='soft-toy',priority=priority,record_status='candidate',mechanics_status='proposed',speculative=bool(speculative),eras=era_map[pid],representation_status='planned'))
evidence=[
 ('procedural-chat','chat','codex:01a1509b-179b-77f1-bead-58c58a8bad24','Reviewed simulation implementation, replay, editable character colors and 1920s ranch direction.'),
 ('procedural-2-chat','chat','codex:01a150fb-1341-7c31-b755-c8687470ce16','Reviewed crop-sales objective, simulator authority, map rerolls, and requested emergent bonds.'),
 ('worker-source','source','../dist/simulation-worker.js','Source inspected: workers carry stock, build, deliver care, clean; frames expose progress and inventory.'),
 ('horse-source','source',"C:/Users/Evan Robinson/OneDrive/Documents/ChatGPT/Abbie's Overland Map Generator/work/ranch-sim/horse-activities.cjs",'Timed ride and horse-play events exist. Affinity tag exists; persistent pair relationship growth not found in inspected implementation.'),
 ('style-choice','user','current chat, 2026-10-18','User selected soft toy; cheap assets with simple textures and colors.')]
db.executemany('INSERT INTO evidence VALUES(?,?,?,?)',evidence)
bindings={
 'Ranch horse':('animals','animals[].species=horse','horse-source'),
 'Abbie':('workers','workers[].id=abbie','worker-source'),'Ani':('workers','workers[].id=ani','worker-source'),
 'Mommy':('workers','workers[].id=mommy','worker-source'),'Daddy':('workers','workers[].id=daddy','worker-source'),
 'Jeff':('workers','workers[].id=jeff','worker-source'),'Alexis':('workers','workers[].id=alexis','worker-source'),'Pearl':('workers','workers[].id=pearl','worker-source'),'Marley':('workers','workers[].id=marley','worker-source'),
 'Water trough':('care','habitats[].waterStock','worker-source'),'Feed tub':('care','habitats[].foodStock','worker-source'),
 'Compost bay':('cleaning','compost','worker-source'),'Timber pile':('materials','sources[].stock','worker-source'),
 'Equine shelter':('construction','buildings[].progress; link.species=horse','worker-source')}
for name,(system,path,eid) in bindings.items():
 ident=by_name[name];db.execute('UPDATE assets SET mechanics_status=?,priority=0 WHERE id=?',('source-supported',ident))
 db.execute('INSERT INTO bindings VALUES(?,?,?,?,?,?)',(ident,system,path,eid,'source-reviewed-not-integrated','Mapping proposal grounded in inspected source. This catalog has not been wired into the renderer.'))
for name,actions in {'Ranch horse':['ride','bond'],'Abbie':['carry','build','feed','water','clean','ride','bond'],'Ani':['carry','build','feed','water','clean','ride','bond'],'Marley':['carry'],'Water bucket':['carry','water'],'Feed sack':['carry','feed'],'Compost bay':['clean'],'Market seller':['sell'],'Harvest crate':['carry','sell'],'Produce wagon':['transport']}.items():
 for action in actions:db.execute('INSERT OR IGNORE INTO asset_affordances VALUES(?,?)',(by_name[name],action))
for name in ['Water trough','Feed tub','Water bucket','Feed sack','Harvest crate','Grain sack','Water tank','Compost bay']:
 db.execute('INSERT OR IGNORE INTO asset_state_profiles VALUES(?,?)',(by_name[name],'container'))
relations=[('Ranch horse','uses','Equine shelter'),('Ranch horse','uses','Water trough'),('Ranch horse','uses','Hay rack'),('Saddle','attaches-to','Ranch horse'),('Riding helmet','worn-by','Abbie'),('Riding helmet','worn-by','Ani'),('Chicken','uses','Secure coop'),('Chicken','uses','Chicken feeder'),('Chicken','uses','Poultry drinker'),('Goat','uses','Goat shelter'),('Feed sack','stored-in','Feed store'),('Hay bale','stored-in','Hay loft'),('Harvest crate','transported-by','Produce wagon'),('Market seller','uses','Farm stall'),('Robot gripper','part-of','Mobile manipulator'),('Station radiator','part-of','Station hub'),('Ship engine module','part-of','Interplanetary freighter'),('Stellar collector petal','part-of','Dyson swarm satellite')]
db.executemany('INSERT INTO relationships VALUES(?,?,?,?)',[(by_name[a],p,by_name[b],'proposed') for a,p,b in relations])
db.execute('INSERT INTO scenarios VALUES(?,?,?,?)',('ranch-1920s','1920s ranch starter','Represent existing care and construction; later grow, harvest and sell $1000 of crops in a proposed 20-minute play session.','care-source-supported; crop-economy-proposed'))
for p in packs:
 if p['id'] in ['ranch-life','ranch-buildings','crops','farming-tools']:
  for name in p['names']:db.execute('INSERT INTO scenario_assets VALUES(?,?,?)',('ranch-1920s',by_name[name],'Candidate only: crop selection, technology fit and care roles need review.'))
# Only two catalog concepts have an existing matching style study; do not count generic tree as a reviewed species.
manifest=json.loads((ROOT.parent/'dist/asset-studies/manifest.json').read_text())
for name,mid in [('Ranch horse','horse-soft-toy'),('Equine shelter','shelter-soft-toy')]:
 m=next(m for m in manifest if m['id']==mid);db.execute('UPDATE representations SET production_status=?,format=?,uri=?,triangles=?,bytes=?,rig_status=?,acceptance=? WHERE asset_id=?',('study','glb','/asset-studies/'+mid+'.glb',m['triangles'],m['bytes'],'unrigged','style-selected; asset-not-approved',by_name[name]))
timings=json.loads((ROOT.parent/'benchmark-soft-toy/timings.json').read_text())
db.execute('INSERT INTO production_batches VALUES(?,?,?,?,?,?,?,?)',('soft-toy-benchmark-10','timed-not-visually-approved',None,timings['model_seconds'],timings['export_seconds'],5.6509144,None,'Ten static subjects; three reused builders, seven newly scripted simple props. Authoring and visual review were not timed. Runtime is not production turnaround.'))
db.executemany('INSERT INTO batch_assets VALUES(?,?)',[('soft-toy-benchmark-10',a['name']) for a in timings['assets']])
db.execute('CREATE VIEW catalog AS SELECT a.id,a.name,p.title AS pack,p.design_family,a.priority,a.mechanics_status,a.speculative,r.production_status,r.uri FROM assets a JOIN packs p ON p.id=a.pack_id JOIN representations r ON r.asset_id=a.id')
db.commit()
assert db.execute('SELECT COUNT(*) FROM assets').fetchone()[0]==2000
assert not db.execute('PRAGMA foreign_key_check').fetchall()
assert db.execute('PRAGMA integrity_check').fetchone()[0]=='ok'
db.row_factory=sqlite3.Row
export=[dict(r) for r in db.execute('SELECT * FROM catalog ORDER BY priority,pack,name')]
for r in export:
 r['eras']=[x[0] for x in db.execute('SELECT era_id FROM asset_eras WHERE asset_id=?',(r['id'],))]
 r['state_profiles']=[x[0] for x in db.execute('SELECT profile_id FROM asset_state_profiles WHERE asset_id=?',(r['id'],))]
 r['affordances']=[x[0] for x in db.execute('SELECT affordance_id FROM asset_affordances WHERE asset_id=?',(r['id'],))]
(ROOT/'civilization-assets.json').write_text(json.dumps({'metadata':meta,'assets':export},indent=2),encoding='utf-8')
with (ROOT/'civilization-assets.csv').open('w',newline='',encoding='utf-8-sig') as f:
 writer=csv.DictWriter(f,fieldnames=list(export[0]));writer.writeheader()
 writer.writerows({k:'; '.join(v) if isinstance(v,list) else v for k,v in row.items()} for row in export)
summary={'assets':len(export),'packs':len(packs),'representations':db.execute('SELECT COUNT(*) FROM representations').fetchone()[0],'model_statuses':dict(db.execute('SELECT production_status,COUNT(*) FROM representations GROUP BY production_status')),'mechanics_statuses':dict(db.execute('SELECT mechanics_status,COUNT(*) FROM assets GROUP BY mechanics_status')),'foreign_key_errors':0,'integrity':'ok','future_speculative':db.execute('SELECT COUNT(*) FROM assets WHERE speculative=1').fetchone()[0]}
(ROOT/'validation.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary,indent=2));db.close()
