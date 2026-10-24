"""Builds preview/winchester-inventory/index.html (AW-STUDY-0057 Winchester inventory). Run: python3 build_page.py"""
import json,sys,os,html,collections
sys.dont_write_bytecode=True
import match
rows=match.run()
HERO={1,4,6,7,8,9,10,23,24,26,32,39,40,44,46,47,55,148}
HAVE={63,64,65,66,67,69,71,72,73,74,121,122,125,140,141,152,153,159,160,161,162,163,164,173,176,204,210,213,229,230,233,239,275,276,277,278,280,287}
ADAPT={36,50,57,60,83,120,123,130,135,139,142,158,166,167,168,171,174,175,178,197,199,205,207,214,215,220,224,234,235,236,237,238,240,259,282,286}
out=[]
for r in rows:
    n=int(r['id'][1:])
    if n in HERO: r['status']='ingame';r['matches']=[]
    elif n in HAVE: r['status']='have'
    elif n in ADAPT: r['status']='adapt'
    else: r['status']='missing';r['matches']=[]
    r['matches']=r['matches'][:2]
    out.append(r)
import merge
pairs,new=merge.merged(out)
MN={'S':'Blender code','P':'Free kit','V':'Variant'}
for mine,g in pairs:
    mine['build']=MN.get(g['m'],'');mine['pri']=min(mine['pri'],g['p'])
    mine['lib']=g['st'] if g['st']!=mine['status'] and g['st']!='missing' else ''
def sz(g):
    n=g['n'].lower();c=g['g']
    if c=='PEOPLE': return 1.7
    if c=='ANIMALS': return .5
    if c=='PLACES': return 10
    if any(w in n for w in('car','truck','van','wagon','bus','kayak','sailboat')): return 4.5
    return 1.5
nid=len(out)
for g in new:
    nid+=1;ex=[w.lower() for w in g['ex'][:1]]
    ok=g['st']in('have','partial') and ex and (merge.toks(g['n'])&merge.toks(ex[0]))
    out.append(dict(id=f'W{nid:03d}',cat=g['g'],grp='From the library review',name=g['n'],size=sz(g),pri=g['p'],real=False,note=(g['note']+'; ' if g['note'] else '')+'size to be confirmed',
      status='adapt' if ok else 'missing',matches=[dict(n=g['ex'][0],k=g['th'][0].split('/')[-1].split('.')[0],c='',up=False,g='',ingame=False)] if ok and g['th'] else [],build=MN.get(g['m'],''),lib=('library review marked it '+g['st']+', match looked wrong: '+g['ex'][0]) if g['st']!='missing' and not ok else '',
      extra_thumb=g['th'][:2] if ok else []))
C=collections.Counter((r['cat'],r['status']) for r in out)
tot=collections.Counter(r['status'] for r in out)
# ---- pipeline request (same format as the 2,000-model plan: preview/asset-plan-2000, tools/asset-batches)
CLS={'prop':(300,1500),'plant':(400,2000),'animal':(1500,5000),'character':(2500,7000),'vehicle':(1500,6000),'building':(3000,12000)}
def klass(r):
    if r['cat']=='PEOPLE': return 'character'
    if r['cat']=='ANIMALS': return 'animal'
    if r['cat']=='PLACES': return 'building'
    if r['grp']=='Vehicles': return 'vehicle'
    if r['grp']=='Nature': return 'plant'
    return 'prop'
need=[r for r in out if r['status'] in('missing','adapt')]
need.sort(key=lambda r:(r['pri'],r['id']))
lines=[];batch=[]
for i,r in enumerate(need,1):
    k=klass(r);t,m=CLS[k];r['wi']=f'WI-{i:03d}';r['batch']=(i-1)//50+1
    tag='ADAPT a library model' if r['status']=='adapt' else 'NEW'
    lines.append(f"{r['wi']} | batch {r['batch']} | {k} | {r['name']} | {tag} | longest side {r['size']} m | tris aim {t} cap {m} | from {r['id']}"+(f" | note: {r['note']}" if r['note'] else ''))
nb=(len(need)-1)//50+1
PIPE=f"""# ChatGPT brief: Abbie's World, Winchester priority batches

You are the modeler for Abbie's World, a kids' game (PG, friendly, never scary): a toy-table version of Winchester, Massachusetts, a New England town of brick shops, white clapboard houses, maples, a lake and a commuter train. This request is {len(need)} items in {nb} batches of up to 50 (WI-001 to WI-{len(need):03d}), most important first. They are the Winchester slice of the wider model plan and use the same format, so the same intake check reads them. Do batch 1 completely, deliver it, then wait for the go on batch 2.

## The two stages (for every item)
Stage 1, charming low poly (file ends `-charming.glb`): the silhouette and the named parts with the fewest triangles that still read. Soft, chunky storybook proportions, a little tilt and lean, rich warm colour blocks, flat materials, no textures. Reference mood: Tiny Glade, Dorfromantik, the farmer figure with the straw hat and apple basket.
Stage 2, upgrade pass (file ends `-upgrade.glb`): the same object, same parts, same pivot and same size, built better: bevels, layered parts, plank and shingle rhythm, believable joinery, one hero detail, one baked normal or bump map and baked ambient occlusion in the base colour (one 1024 px map at most). Never change proportions between stages, and the two must read as the same object at a glance.
Late-afternoon New England light. Chunky silhouettes beat fine detail: anything under 3 % of the object's size is not seen in the game.

## Format (the acceptance checks read these)
- One GLB per model: `WI-001-charming.glb`, `WI-001-upgrade.glb`. glTF 2.0 binary, no animation, no lights, no cameras, no helper objects, no axes or ground planes.
- Units metres, +Y up, the origin on the floor at the centre of the footprint (the base sits on y = 0), the front facing +Z. Size is the item's "longest side" below at real-world scale (toys slightly toy-scaled); bounds must match within 15 percent.
- Triangles: each item gives `tris aim` and `cap` for its class (prop 300/1500, plant 400/2000, animal 1500/5000, character 2500/7000, vehicle 1500/6000, building 3000/12000). Stay under the cap; the game draws many copies.
- Parts are separate named meshes (roof, door, awning, wheel_fl, head, tail), never Cube.001. Moving parts keep their own pivots (door hinge, wheel axle).
- Materials are named by what they are, starting with a shading role: timber, plank, roof, shingle, plaster, stone, brick, metal, iron, glass, water, clay, cloth, fur, hair, feather, bark, leaf, stem, flower, fruit, soil, paint_red. Share materials. No image textures except the one baked map, no vertex colour. Words leaf, needle, grass, stem and flower are recoloured by the seasons, so use them for plants only.
- People: relaxed A-pose, friendly neutral faces, varied skin tones, simple clothes by role, no logos, no weapons, never a real person's likeness; adult about 1.7 m, child about 1.2 m. Smooth mannequin base layer under clothes. Animals: standing idle, head up, legs as separate parts. Buildings: one door facing +Z, windows as separate parts, roof its own part, no interior unless the note says so.
- No brand names, logos, readable real signs, house numbers, licence plates, or text baked onto anything.
- ADAPT items: a close model already exists in the game library; make the variant described rather than starting from nothing, and say which library model you adapted.
- A sidecar `WI-001.json` per item: id, name, from_inventory_id, style files, triangles per file, bounds in metres, pivot, anchors (feet, hands, door, seat), material roles, needed_for.
- A 1024 px preview PNG per model on a plain warm background (#fbf8f1), three-quarter view, soft shadow; it must read at 64 px.

## Acceptance checks (a batch is rejected if any fail)
1. Both GLBs load; triangles under the cap; bounds within 15 percent of the size; origin at the base.
2. No object, camera, light or helper left; no stray textures; part and material names follow the rules.
3. Charming and upgrade are the same object at a glance and visibly different in craft.
4. The silhouette reads at 64 px.
5. Nothing breaks the style rules above; the preview matches the model.

## Hand-back
Zip each batch (GLBs, sidecars, previews) and give the zip to Evan. He passes it to Claude, who opens a GitHub issue titled `Model batch WI-NN` listing the slot ids with the zip link. The intake routine checks, converts, lands the files under prototypes/ranch-atelier/dist/asset-batches/, rebuilds library.json, and opens a side-by-side review page. Failed slots come back with the reason and are redone in the next issue, never silently replaced. Report anything you could not do, or changed, in a notes line; do not skip items quietly.

## The items (id | batch | class | what | NEW or ADAPT | size | triangles | inventory id | note)
"""+"\n".join(lines)+"\n"
# ---- drone / photo checklist
HEXES={
 'Downtown (the Square)':['Town Common from 40 m, looking down the long axis','Town Hall and library fronts, straight-on at eye height','Main Street from the south end, one low drone pass along the kerb (3 m)','Shop row facades, one shot per shop, flat-on, with a ruler or person for scale','Awnings, signs (shapes only), lamp posts, benches, bins, hydrants, mailboxes: 1 close-up each','High school roof and front from 30 m','Church steeple and bell from two sides','Fire station front and bay doors'],
 'Depot and River':['Both stations: platform, canopy, clock, signs, from track-side and the car park','Railway bridge and river from above (nadir) and along the water at 5 m','Level crossing: barrier, bell, lights','River banks: stone walls, weir or dam, reeds','Footbridge, car park, parked cars (colour and shape only, never plates)'],
 'Reservoir Hills':['Lake shore from 60 m, the boat club and floats','Rowing shells on the rack, docks and ramps','Wedge Pond and the beach','Fells trailhead sign, stone walls, stile','Water tower and hilltop views: three compass shots from 40 m','A farm walk-through: barn, stand, beds, animals (public days only, ask first)'],
 'Neighbourhood Streets':['Street-level view down a typical road, both directions','One house per style (colonial, Cape, Victorian, ranch): front at eye height and a three-quarter. Crop out numbers and names','Driveways, garages, mailboxes, porches, fences, stone walls','Muraco School and playground from the street, no kids in frame','Leonard Field: backstop, dugouts, bleachers','Corner store and bus stop shelter (no people)'],
 'Pond Side':['Pond from 40 m on the compass points','Dock, boat ramp, picnic area, ducks and geese (wildlife is welcome)','Cul de sac from above (nadir) and from the entrance','Streetlamps, trees, hedges, mailboxes: the typical ones'],
 'Gingerbread Hill and Abbie\'s Yard':['Orchard or hillside rows if any, from 30 m','Backyard things (swing set, sandbox, shed, garden bed): one close-up each, no addresses, no kids\' faces','Any place that feels "secret": a stone path, a door in a bank'],
}
GENERIC=['Trees, one tall sharp shot of each species: maple, white pine, oak, birch, dogwood or cherry; plus bark, leaf and ground cover close-ups','Materials, flat and close with a hand or a coin for scale: brick, slate, clapboard, shingle, stone wall, wrought iron, wood fence, asphalt, painted sign wood','Colour card: one shot of the town in open shade with a grey card or a white sheet in frame','Sky and light: the same view at noon, golden hour and dusk for the lighting dialect','Wildlife you see: squirrel, turkey, geese, ducks, cardinal, deer (only if they stay calm; keep your distance)','Ambient things people actually do: a jogger, a dog walk, a bench chat, a commuter run (backs of heads only; no faces)']
RULES=['Fly only where you are allowed. Check the airspace in an app such as B4UFLY before every flight (Winchester sits close to Boston\'s controlled airspace; I have not checked the limits and you should), keep the drone in sight, stay under 120 m, and never fly over people, roads with traffic, or other people\'s yards.','Recreational flyers in the US need the free TRUST certificate, and the drone needs registering if it weighs 250 g or more. Check both before the first flight.','Privacy: no faces, no licence plates, no house numbers or street names that point at a home, no kids. Crop or skip. Nothing of the family\'s home goes in the repo.','Name files by hex and thing, for example downtown_townhall_front_01.jpg, and note the time. Shoot RAW or the highest-quality JPEG and keep the originals.','For each landmark: 1 wide, 1 front, 1 left, 1 right, 1 back, 1 roof/top, 3 detail close-ups, and one with a scale object. A tape measure or a 30 cm ruler is gold.','For a diorama orbit: 12 shots around the thing at 3 heights, each overlapping the last by 70 %. Overlap also makes a photogrammetry model possible later.','Take the nadir (straight down) grid over each hex at about 60 m with 70 % overlap, so the layout can be traced.']
CONTEXT=[('canon','Models library, 1,493 distinct entries, and the decorator\'s role-tagged catalogue','https://github.com/evanrobinson2/abbiesworld_ios/blob/main/prototypes/ranch-atelier/dist/models/library.json'),
('canon','Town code: townsfolk.mjs, library-props.mjs, manifest.mjs, hero places in places.block.js (what is already in the game)','https://github.com/evanrobinson2/abbiesworld_ios/tree/main/prototypes/ranch-atelier/dist/simulations/abbietown'),
('canon','AW-STUDY-0042 Abbie\'s Town and the Seven-Hex board (Winchester topology, cast, places, privacy rules)','https://github.com/evanrobinson2/abbiesworld_ios/blob/main/docs/oracle/abbietown/ABBIETOWN_STUDY.md'),
('canon','Modeler brief: material roles, triangle budgets, floor pivot, GLB','https://github.com/evanrobinson2/abbiesworld_ios/blob/main/tools/ranch-rebuild/MODELER.md'),
('canon','HUD study and Game Feel: why sounds, birds and bells are diegetic cues, not UI','https://github.com/evanrobinson2/abbiesworld_ios/blob/main/docs/oracle/hud/HUD_STUDY.md'),
('reference','Winchester, Massachusetts (Wikipedia): places, rail stations, lakes, history','https://en.wikipedia.org/wiki/Winchester,_Massachusetts'),
('reference','Things to do in Winchester, MA (travel list), checked against Wikipedia; every real place is flagged "verify on drone day"','https://www.thecrazytourist.com/15-best-things-to-do-in-winchester-ma/'),
('design','Paper Towns and Potemkin Villages (Unwinnable, 2026): game towns that feel inhabited; found by search, only the title read, not the article','https://unwinnable.com/2026/05/18/paper-towns-and-potemkin-villages/'),
('design','Wright-Locke Farm, Winchester (public pages; inspired by only), from the farm study','https://www.wlfarm.org/'),
('oracle','Game Oracle: Animal Crossing, Stardew Valley, Tiny Glade, Dorfromantik style records (not freshly consulted for this study)','https://abbies-game-oracle.vercel.app/'),
('devblog','None recorded for this draft','' ),
('tutorial','None recorded for this draft','' )]
data=dict(rows=out,tot=tot,hex=HEXES,generic=GENERIC,rules=RULES,pipe=PIPE,ctx=CONTEXT,nneed=len(need))
tpl=open('page.template.html').read()
os.makedirs('../../preview/winchester-inventory',exist_ok=True)
open('../../preview/winchester-inventory/index.html','w').write(tpl.replace('/*DATA*/null',json.dumps(data,ensure_ascii=False).replace('</','<\\/')))
open('../../docs/oracle/abbietown/WINCHESTER_INVENTORY_PIPELINE_REQUEST.md','w').write(PIPE)
print(tot,len(out),len(need))
