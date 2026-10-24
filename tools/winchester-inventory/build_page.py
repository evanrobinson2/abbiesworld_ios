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
C=collections.Counter((r['cat'],r['status']) for r in out)
tot=collections.Counter(r['status'] for r in out)
# ---- pipeline request
def budget(size,cat,name):
    n=name.lower()
    if cat=='PLACES': return (3000,9000) if size>=8 else (1500,4000)
    if cat=='PEOPLE': return (2500,6000)
    if cat=='ANIMALS': return (600,1500) if size<.5 else (1500,4000)
    if size>=6: return (2500,7000)
    return (500,2000) if size<1.5 else (1200,3500)
need=[r for r in out if r['status'] in('missing','adapt')]
need.sort(key=lambda r:(r['pri'],r['id']))
lines=[]
for r in need:
    s1,s2=budget(r['size'],r['cat'],r['name'])
    tag='ADAPT' if r['status']=='adapt' else 'NEW'
    lines.append(f"{r['id']} | P{r['pri']} | {tag} | {r['cat']} | {r['name']} | longest side {r['size']} m | tris S1<={s1}, S2<={s2}"+(f" | note: {r['note']}" if r['note'] else ''))
PIPE=f"""ROLE
You are the 3D modeler for Abbie's World, a kids' game (PG, friendly, never scary). The game is a toy-table version of Winchester, Massachusetts, a New England town of brick shops, white clapboard houses, maples and a lake. You will model the {len(need)} items listed at the end, in priority order (P1 first). Do P1 completely before starting P2.

THE TWO-STAGE PROCESS (use it for every item)
Stage 1, low poly: build the silhouette and the named parts with the fewest triangles that still read, as flat-colour materials, no textures. Export <ID>_<slug>_s1.glb.
Stage 2, upgrade pass: keep the same parts, same pivot and same size. Add bevels, small silhouette details, a baked normal or bump map and a baked ambient occlusion in the base colour (one 1024x1024 map at most per item). Export <ID>_<slug>_s2.glb. Never change the proportions between stages; stage 2 is the same object, better made.

STYLE LINE
Chunky, warm, storybook toy-miniature in the spirit of Tiny Glade and Dorfromantik: soft bevels, slightly oversized silhouettes, rich saturated colour blocks, gentle wear, late-afternoon New England light. Chunky silhouettes beat fine detail: details under 3 % of the object's size are not seen in the game. No brand names, logos, readable real signs, house numbers, licence plates or real people's likenesses.

TECHNICAL SPEC (every item)
- Format: binary glTF (.glb), glTF 2.0, one mesh per named part, no animation (the game poses models itself), no lights, no cameras.
- Units: metres. Z-up in the modelling tool is fine, but the exported GLB must be Y-up with +Y up and the front of the object facing +Z.
- Pivot (origin) on the floor at the centre of the footprint, y = 0 is the ground, the object sits on it.
- Size: the item's "longest side" below, in metres, real-world scale (the game rescales to its own sizes, so proportions matter more than the absolute value).
- Triangles: S1 and S2 budgets are per item in the list, because the game draws many copies. Fewer is better if it still reads.
- Materials: flat base colours. Name every material starting with its shading role: Timber, Plank, Roof, Shingle, Plaster, Stone, Brick, Metal, Iron, Glass, Water, Clay, Cloth, Fur, Hair, Feather, Bark, Leaf, Stem, Flower, Fruit, Soil, Paint. Examples: Roof_Slate, Brick_Red, Leaf_Light, Fur_Chestnut. Anything with Leaf, Needle, Grass, Stem or Flower in the name is recoloured by the seasons, so use those words only for plants.
- Parts: name every mesh by what it is (Door, Awning, Wheel_FL, Head, Tail), never Cube.001.
- People: A-pose, neutral and friendly, about 1.7 m adult, 1.2 m child, skin tones varied, simple clothes by role, no logos, no weapons. Faces simple and kind; never a real person.
- Animals: standing idle pose, head up, legs separate parts so the game can animate them later.
- Buildings: one door facing +Z, windows as separate parts, roof as its own part, no interior unless the item says so.
- ADAPT items: a close model already exists in the game library; make a new variant that fits the description instead of starting from nothing, and say which library model you adapted.

FOR EVERY ITEM, DELIVER
1. <ID>_<slug>_s1.glb and <ID>_<slug>_s2.glb
2. <ID>_<slug>_turntable.png: a 3 x 1 contact sheet (front, side, three-quarter) of stage 2 on a plain light background
3. one line in manifest.json: {{"id","name","slug","stage1_tris","stage2_tris","height_m","longest_m","materials":[...],"parts":[...],"source":"chatgpt","notes"}}

HAND-BACK TO THE LIBRARY
Zip the batch as winchester-batch-<NN>.zip containing the GLBs, the PNGs and manifest.json, at most 25 items per zip, P1 first. Give the zip to Evan. He drops it to Claude, who will: place each item at models/winchester/<ID>-<slug>/ in the repo (evanrobinson2/abbiesworld_ios) with model.glb (stage 2), stage1.glb, render.jpg and provenance.json (the prompt, the date, the model, the stage notes), add it to dist/models/library.json as a new "Winchester inventory" collection with pass "Original" for stage 1 and "Upgrade" for stage 2, and tag it with a decorator role in props-catalogue.json. If a file fails the checks (pivot, scale, triangle budget, material names), it will come back to you with the reason.

HOW TO WORK
Do one item at a time. After each stage 1, check the silhouette from the front and side against the description before spending the upgrade pass. Report anything you could not do, and anything you changed, in the notes field. Do not skip items quietly.

THE ITEMS (id | priority | NEW or ADAPT | category | what | size | triangle budgets)
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
