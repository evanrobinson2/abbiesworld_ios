# ChatGPT brief: Abbie's World, Winchester priority batches

You are the modeler for Abbie's World, a kids' game (PG, friendly, never scary): a toy-table version of Winchester, Massachusetts, a New England town of brick shops, white clapboard houses, maples, a lake and a commuter train. This request is 391 items in 8 batches of up to 50 (WI-001 to WI-391), most important first. They are the Winchester slice of the wider model plan and use the same format, so the same intake check reads them. Do batch 1 completely, deliver it, then wait for the go on batch 2.

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
WI-001 | batch 1 | building | Town Hall (brick, clock tower) | NEW | longest side 18 m | tris aim 3000 cap 12000 | from W002 | note: landmark for the opening tour
WI-002 | batch 1 | building | Public Library | NEW | longest side 16 m | tris aim 3000 cap 12000 | from W003 | note: reading nook inside; quest giver
WI-003 | batch 1 | building | Main Street shop row (brick, 3 storeys) | NEW | longest side 14 m | tris aim 3000 cap 12000 | from W005 | note: repeating 4-bay module with awnings
WI-004 | batch 1 | building | Fire station | NEW | longest side 16 m | tris aim 3000 cap 12000 | from W011 | note: big red doors, pole, engine bay
WI-005 | batch 1 | building | Church with steeple | NEW | longest side 16 m | tris aim 3000 cap 12000 | from W022 | note: bell is a diegetic time cue
WI-006 | batch 1 | building | Railway bridge over the river | NEW | longest side 20 m | tris aim 3000 cap 12000 | from W025
WI-007 | batch 1 | building | Upper Mystic Lake shore and boat club | NEW | longest side 30 m | tris aim 3000 cap 12000 | from W030 | note: rowing shells, floats
WI-008 | batch 1 | building | Muraco School and playground | NEW | longest side 26 m | tris aim 3000 cap 12000 | from W037 | note: School Jump game
WI-009 | batch 1 | building | Leonard Field with backstop | NEW | longest side 30 m | tris aim 3000 cap 12000 | from W038
WI-010 | batch 1 | building | Abbie's backyard (swing set, sandbox, trampoline) | NEW | longest side 14 m | tris aim 3000 cap 12000 | from W051 | note: no real address; generic yard
WI-011 | batch 1 | character | Teacher | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W075 | note: stand-in only
WI-012 | batch 1 | character | Librarian | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W076 | note: stand-in only
WI-013 | batch 1 | character | Postie | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W077 | note: stand-in only
WI-014 | batch 1 | character | Farmer | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W079 | note: stand-in only
WI-015 | batch 1 | character | Barista | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W080 | note: coffee shop
WI-016 | batch 1 | character | Pizza maker | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W081
WI-017 | batch 1 | character | Ice cream server | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W082
WI-018 | batch 1 | character | Shopkeeper | ADAPT a library model | longest side 1.7 m | tris aim 2500 cap 7000 | from W083
WI-019 | batch 1 | character | Firefighter | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W086
WI-020 | batch 1 | character | Crossing guard with stop sign | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W088 | note: school time cue
WI-021 | batch 1 | character | Mail carrier with satchel | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W091
WI-022 | batch 1 | character | Dog walker with three dogs | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W096
WI-023 | batch 1 | character | Kid in backpack (x6 skins) | NEW | longest side 1.2 m | tris aim 2500 cap 7000 | from W100 | note: instanced crowd with colour variants
WI-024 | batch 1 | character | Teen with skateboard | NEW | longest side 1.6 m | tris aim 2500 cap 7000 | from W102 | note: skate park
WI-025 | batch 1 | character | Jogger | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W104 | note: loops the common
WI-026 | batch 1 | character | Grandparents on a bench | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W113
WI-027 | batch 1 | character | Commuter with briefcase | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W114 | note: depot crowd
WI-028 | batch 1 | character | Trick-or-treaters (witch, ghost, dino) | NEW | longest side 1.2 m | tris aim 2500 cap 7000 | from W118 | note: Halloween waits on Evan's go
WI-029 | batch 1 | prop | Trash can | ADAPT a library model | longest side 1 m | tris aim 300 cap 1500 | from W123
WI-030 | batch 1 | prop | Fire hydrant | NEW | longest side 0.8 m | tris aim 300 cap 1500 | from W124
WI-031 | batch 1 | prop | Bus stop sign | NEW | longest side 2.5 m | tris aim 300 cap 1500 | from W127
WI-032 | batch 1 | prop | Painted street signs (name blades) | NEW | longest side 2.5 m | tris aim 300 cap 1500 | from W128 | note: painted wood, ranch dialect
WI-033 | batch 1 | prop | Planter box with flowers | ADAPT a library model | longest side 1 m | tris aim 300 cap 1500 | from W130
WI-034 | batch 1 | prop | Sandwich-board sign | NEW | longest side 1 m | tris aim 300 cap 1500 | from W132 | note: shops
WI-035 | batch 1 | prop | Cafe table and chairs outside | ADAPT a library model | longest side 1.2 m | tris aim 300 cap 1500 | from W135
WI-036 | batch 1 | vehicle | Family SUV (Subaru-like, unbranded) | ADAPT a library model | longest side 4.5 m | tris aim 1500 cap 6000 | from W139 | note: brands are inspired-by only
WI-037 | batch 1 | vehicle | School bus | ADAPT a library model | longest side 11 m | tris aim 1500 cap 6000 | from W142 | note: yellow, kids hop on
WI-038 | batch 1 | vehicle | Fire engine | NEW | longest side 9 m | tris aim 1500 cap 6000 | from W143
WI-039 | batch 1 | vehicle | Ice cream truck | NEW | longest side 6 m | tris aim 1500 cap 6000 | from W150 | note: plays a tune: diegetic cue
WI-040 | batch 1 | vehicle | Bicycle (kid and adult) | NEW | longest side 1.8 m | tris aim 1500 cap 6000 | from W154
WI-041 | batch 1 | vehicle | Scooter and skateboard | NEW | longest side 0.9 m | tris aim 1500 cap 6000 | from W155
WI-042 | batch 1 | plant | Flower beds, tulip rows | ADAPT a library model | longest side 1 m | tris aim 400 cap 2000 | from W166
WI-043 | batch 1 | plant | Hedge and shrub | ADAPT a library model | longest side 1.5 m | tris aim 400 cap 2000 | from W167
WI-044 | batch 1 | plant | Pumpkin patch | ADAPT a library model | longest side 0.6 m | tris aim 400 cap 2000 | from W168 | note: autumn
WI-045 | batch 1 | plant | Fall leaf piles | NEW | longest side 1 m | tris aim 400 cap 2000 | from W169 | note: kids jump in them
WI-046 | batch 1 | prop | Swing set | NEW | longest side 3 m | tris aim 300 cap 1500 | from W179
WI-047 | batch 1 | prop | Slide and climbing frame | NEW | longest side 3 m | tris aim 300 cap 1500 | from W180
WI-048 | batch 1 | prop | Soccer goal | NEW | longest side 3 m | tris aim 300 cap 1500 | from W184
WI-049 | batch 1 | prop | Lemonade stand | NEW | longest side 2 m | tris aim 300 cap 1500 | from W189 | note: kid shop quest
WI-050 | batch 1 | prop | Treehouse with rope ladder | NEW | longest side 4 m | tris aim 300 cap 1500 | from W190
WI-051 | batch 2 | prop | Skate ramp and rails | NEW | longest side 3 m | tris aim 300 cap 1500 | from W191
WI-052 | batch 2 | prop | Awnings (striped, 5 colours) | NEW | longest side 3 m | tris aim 300 cap 1500 | from W193
WI-053 | batch 2 | prop | Shop signs (painted wood) | NEW | longest side 2 m | tris aim 300 cap 1500 | from W194
WI-054 | batch 2 | prop | Pizza oven and boxes | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W195
WI-055 | batch 2 | prop | Ice cream cone sign | NEW | longest side 2 m | tris aim 300 cap 1500 | from W196
WI-056 | batch 2 | prop | Coffee cups and takeaway tray | ADAPT a library model | longest side 0.3 m | tris aim 300 cap 1500 | from W197 | note: cafe kit
WI-057 | batch 2 | prop | Baguette basket | NEW | longest side 0.5 m | tris aim 300 cap 1500 | from W198
WI-058 | batch 2 | prop | Market stall with crates | ADAPT a library model | longest side 3 m | tris aim 300 cap 1500 | from W199
WI-059 | batch 2 | prop | Fruit and vegetable crates | NEW | longest side 0.6 m | tris aim 300 cap 1500 | from W200
WI-060 | batch 2 | prop | Books on a rack | NEW | longest side 0.4 m | tris aim 300 cap 1500 | from W201
WI-061 | batch 2 | prop | Jack-o-lanterns and cobwebs | ADAPT a library model | longest side 0.8 m | tris aim 300 cap 1500 | from W205 | note: Halloween
WI-062 | batch 2 | prop | Barbecue grill and picnic table | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W207
WI-063 | batch 2 | prop | Weathervane (rooster) | NEW | longest side 1.2 m | tris aim 300 cap 1500 | from W212 | note: diegetic wind cue
WI-064 | batch 2 | prop | Church bell | NEW | longest side 1 m | tris aim 300 cap 1500 | from W216 | note: rings on the hour: the town clock
WI-065 | batch 2 | prop | Flagpole with flag | NEW | longest side 8 m | tris aim 300 cap 1500 | from W218
WI-066 | batch 2 | prop | Little free library box | NEW | longest side 1 m | tris aim 300 cap 1500 | from W226 | note: quest item
WI-067 | batch 2 | prop | Farm stand with honesty box | NEW | longest side 3 m | tris aim 300 cap 1500 | from W228 | note: Wright-Locke inspiration
WI-068 | batch 2 | prop | Scarecrow | NEW | longest side 2 m | tris aim 300 cap 1500 | from W231
WI-069 | batch 2 | animal | Dog (golden retriever) | ADAPT a library model | longest side 0.8 m | tris aim 1500 cap 5000 | from W234
WI-070 | batch 2 | animal | Dog (small terrier) | ADAPT a library model | longest side 0.4 m | tris aim 1500 cap 5000 | from W235
WI-071 | batch 2 | animal | Hamster and guinea pig | NEW | longest side 0.15 m | tris aim 1500 cap 5000 | from W241
WI-072 | batch 2 | animal | Grey squirrel | NEW | longest side 0.3 m | tris aim 1500 cap 5000 | from W244 | note: runs up trees
WI-073 | batch 2 | animal | White-tailed deer (doe and fawn) | NEW | longest side 1.4 m | tris aim 1500 cap 5000 | from W247 | note: Fells
WI-074 | batch 2 | animal | Wild turkey flock | NEW | longest side 0.9 m | tris aim 1500 cap 5000 | from W248 | note: famous in MA suburbs
WI-075 | batch 2 | animal | Canada goose | NEW | longest side 0.9 m | tris aim 1500 cap 5000 | from W249 | note: pond
WI-076 | batch 2 | animal | Mallard duck and ducklings | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W250
WI-077 | batch 2 | animal | Great blue heron | NEW | longest side 1.2 m | tris aim 1500 cap 5000 | from W252
WI-078 | batch 2 | animal | Cardinal | NEW | longest side 0.2 m | tris aim 1500 cap 5000 | from W255 | note: red; winter pop of colour
WI-079 | batch 2 | animal | Pigeon flock at the depot | NEW | longest side 0.3 m | tris aim 1500 cap 5000 | from W260
WI-080 | batch 2 | animal | Raccoon | NEW | longest side 0.6 m | tris aim 1500 cap 5000 | from W263 | note: night bin raider
WI-081 | batch 2 | animal | Painted turtle on a log | NEW | longest side 0.2 m | tris aim 1500 cap 5000 | from W267 | note: pond
WI-082 | batch 2 | animal | Bullfrog | NEW | longest side 0.15 m | tris aim 1500 cap 5000 | from W268 | note: sound cue at dusk
WI-083 | batch 2 | animal | Fireflies (particle) | NEW | longest side 0.05 m | tris aim 1500 cap 5000 | from W272 | note: summer night
WI-084 | batch 2 | animal | Barn cat | ADAPT a library model | longest side 0.4 m | tris aim 1500 cap 5000 | from W282
WI-085 | batch 2 | character | Skater kid | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W290 | note: skate park beside the café; size to be confirmed
WI-086 | batch 2 | character | Soccer kid in a bib | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W291 | note: size to be confirmed
WI-087 | batch 2 | character | Neighbor waving from a porch | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W313 | note: size to be confirmed
WI-088 | batch 2 | character | Kid with a lemonade stand | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W314 | note: size to be confirmed
WI-089 | batch 2 | building | Commuter rail station and platform | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W331 | note: size to be confirmed
WI-090 | batch 2 | building | Ice cream stand | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W335 | note: size to be confirmed
WI-091 | batch 2 | building | Playground with slide | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W339 | note: size to be confirmed
WI-092 | batch 2 | building | Leonard Field soccer pitch | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W340 | note: size to be confirmed
WI-093 | batch 2 | building | Horn Pond dock | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W342 | note: size to be confirmed
WI-094 | batch 2 | building | Mill pond spillway | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W345 | note: size to be confirmed
WI-095 | batch 2 | building | Stone wall lane | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W349 | note: New England signature; size to be confirmed
WI-096 | batch 2 | building | Historic colonial house | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W352 | note: 51% of town; size to be confirmed
WI-097 | batch 2 | building | Cape cod house | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W353 | note: size to be confirmed
WI-098 | batch 2 | building | Victorian with porch | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W354 | note: size to be confirmed
WI-099 | batch 2 | building | Treehouse | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W357 | note: size to be confirmed
WI-100 | batch 2 | building | Basement | ADAPT a library model | longest side 10 m | tris aim 3000 cap 12000 | from W360 | note: exists; size to be confirmed
WI-101 | batch 3 | building | Moon base airlock | ADAPT a library model | longest side 10 m | tris aim 3000 cap 12000 | from W361 | note: exists; size to be confirmed
WI-102 | batch 3 | prop | Wooden utility pole with wires | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W362 | note: look of the town; size to be confirmed
WI-103 | batch 3 | prop | Street lamp | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W363 | note: size to be confirmed
WI-104 | batch 3 | prop | Picket fence run | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W385 | note: size to be confirmed
WI-105 | batch 3 | prop | Leaf pile and rake | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W386 | note: October; size to be confirmed
WI-106 | batch 3 | prop | Pumpkin and jack-o-lantern | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W387 | note: size to be confirmed
WI-107 | batch 3 | prop | Town clock face | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W402 | note: time told by the world; size to be confirmed
WI-108 | batch 3 | prop | Floppy disk charm | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W406 | note: exists; size to be confirmed
WI-109 | batch 3 | prop | Backpack | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W407 | note: exists; size to be confirmed
WI-110 | batch 3 | prop | Moon cheese wheel | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W408 | note: exists; size to be confirmed
WI-111 | batch 3 | prop | Rocket on its pad | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W412 | note: horizon; size to be confirmed
WI-112 | batch 3 | prop | Drone (our own) | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W418 | note: Saturday project; size to be confirmed
WI-113 | batch 3 | prop | Polaroid camera | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W419 | note: exists as charm idea; size to be confirmed
WI-114 | batch 3 | prop | Mini phone | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W420 | note: floppy unlocks it; size to be confirmed
WI-115 | batch 3 | animal | Cat on a windowsill | ADAPT a library model | longest side 0.5 m | tris aim 1500 cap 5000 | from W432 | note: size to be confirmed
WI-116 | batch 3 | animal | Gray squirrel | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W433 | note: size to be confirmed
WI-117 | batch 3 | animal | Toy animals for the carwash | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W445 | note: size to be confirmed
WI-118 | batch 3 | building | Post office | NEW | longest side 12 m | tris aim 3000 cap 12000 | from W013 | note: postie quest giver home
WI-119 | batch 3 | building | Town square war memorial | NEW | longest side 4 m | tris aim 3000 cap 12000 | from W014 | note: stone plinth with wreath
WI-120 | batch 3 | building | Hardware store | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W016 | note: bins of nails, ladders outside
WI-121 | batch 3 | building | Toy shop | NEW | longest side 9 m | tris aim 3000 cap 12000 | from W017 | note: pairs with the coaster toy-car charm
WI-122 | batch 3 | building | Bookshop | NEW | longest side 9 m | tris aim 3000 cap 12000 | from W018
WI-123 | batch 3 | building | Florist | NEW | longest side 8 m | tris aim 3000 cap 12000 | from W019 | note: buckets of blooms on pavement
WI-124 | batch 3 | building | Footbridge | NEW | longest side 8 m | tris aim 3000 cap 12000 | from W027
WI-125 | batch 3 | building | Level crossing with barrier | NEW | longest side 8 m | tris aim 3000 cap 12000 | from W028 | note: bell and lights = diegetic cue
WI-126 | batch 3 | building | Wedge Pond and small beach | NEW | longest side 20 m | tris aim 3000 cap 12000 | from W031
WI-127 | batch 3 | building | Fells trailhead with wooden sign | NEW | longest side 4 m | tris aim 3000 cap 12000 | from W033 | note: Middlesex Fells edge
WI-128 | batch 3 | building | Stone wall and stile | NEW | longest side 6 m | tris aim 3000 cap 12000 | from W034 | note: New England field walls
WI-129 | batch 3 | building | Water tower on the hill | NEW | longest side 18 m | tris aim 3000 cap 12000 | from W035
WI-130 | batch 3 | building | Corner store | NEW | longest side 9 m | tris aim 3000 cap 12000 | from W041
WI-131 | batch 3 | building | Bus stop shelter | NEW | longest side 4 m | tris aim 3000 cap 12000 | from W042
WI-132 | batch 3 | building | Neighbourhood park with swings | NEW | longest side 14 m | tris aim 3000 cap 12000 | from W043
WI-133 | batch 3 | building | Garage and driveway | NEW | longest side 7 m | tris aim 3000 cap 12000 | from W045
WI-134 | batch 3 | building | Horn Pond lookout and boat ramp | NEW | longest side 18 m | tris aim 3000 cap 12000 | from W048
WI-135 | batch 3 | building | Duck pond with little dock | NEW | longest side 12 m | tris aim 3000 cap 12000 | from W049
WI-136 | batch 3 | building | Lakeside picnic area | ADAPT a library model | longest side 10 m | tris aim 3000 cap 12000 | from W050
WI-137 | batch 3 | building | Garden shed | NEW | longest side 4 m | tris aim 3000 cap 12000 | from W052
WI-138 | batch 3 | building | Vegetable garden beds | NEW | longest side 6 m | tris aim 3000 cap 12000 | from W053
WI-139 | batch 3 | building | Fire pit with chairs | NEW | longest side 3 m | tris aim 3000 cap 12000 | from W054
WI-140 | batch 3 | building | Launch Road signpost | NEW | longest side 3 m | tris aim 3000 cap 12000 | from W056
WI-141 | batch 3 | building | Orchard rows | ADAPT a library model | longest side 12 m | tris aim 3000 cap 12000 | from W057
WI-142 | batch 3 | building | Main Street cobble setts crosswalk | NEW | longest side 8 m | tris aim 3000 cap 12000 | from W058 | note: open: Main Street setts
WI-143 | batch 3 | building | Traffic light and signal pole | NEW | longest side 5 m | tris aim 3000 cap 12000 | from W059
WI-144 | batch 3 | building | Telephone pole with wires | NEW | longest side 9 m | tris aim 3000 cap 12000 | from W062 | note: wires as a thin curve prop
WI-145 | batch 3 | character | Lexi (blonde, crop top) | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W068 | note: canon
WI-146 | batch 3 | character | Georgia (teen) | NEW | longest side 1.6 m | tris aim 2500 cap 7000 | from W070 | note: canon
WI-147 | batch 3 | character | Florist | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W084
WI-148 | batch 3 | character | Police officer (friendly) | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W087 | note: PG: helps lost kids
WI-149 | batch 3 | character | Bus driver | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W089
WI-150 | batch 3 | character | Train conductor | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W090
WI-151 | batch 4 | character | Librarian at the desk | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W094
WI-152 | batch 4 | character | Lifeguard at the pond | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W095
WI-153 | batch 4 | character | Doctor / nurse | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W097
WI-154 | batch 4 | character | Principal | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W098
WI-155 | batch 4 | character | Gym teacher with whistle | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W099
WI-156 | batch 4 | character | Toddler in a stroller | NEW | longest side 1.0 m | tris aim 2500 cap 7000 | from W101
WI-157 | batch 4 | character | Marching band kid | NEW | longest side 1.5 m | tris aim 2500 cap 7000 | from W103 | note: Halloween/parade event
WI-158 | batch 4 | character | Cyclist with helmet | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W105
WI-159 | batch 4 | character | Fisher at the pond | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W106
WI-160 | batch 4 | character | Rower in a shell | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W107 | note: Mystic lake
WI-161 | batch 4 | character | Baseball players (team of 9) | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W108 | note: Leonard Field
WI-162 | batch 4 | character | Soccer players | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W109
WI-163 | batch 4 | character | Musician with guitar | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W111 | note: busker at the depot
WI-164 | batch 4 | character | Picnic family on a blanket | NEW | longest side 1.5 m | tris aim 2500 cap 7000 | from W112
WI-165 | batch 4 | character | Hiker with walking stick | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W115 | note: Fells
WI-166 | batch 4 | character | Street vendor with hot dog cart | ADAPT a library model | longest side 1.8 m | tris aim 2500 cap 7000 | from W120
WI-167 | batch 4 | prop | Bike rack with bikes | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W126
WI-168 | batch 4 | prop | Banner on a lamp post | NEW | longest side 3 m | tris aim 300 cap 1500 | from W129 | note: seasonal
WI-169 | batch 4 | prop | Umbrella over a table | NEW | longest side 2.4 m | tris aim 300 cap 1500 | from W136
WI-170 | batch 4 | prop | Town clock on a post | NEW | longest side 4 m | tris aim 300 cap 1500 | from W138 | note: time cue
WI-171 | batch 4 | vehicle | Police cruiser (friendly) | NEW | longest side 4.8 m | tris aim 1500 cap 6000 | from W144
WI-172 | batch 4 | vehicle | Postal van | NEW | longest side 5 m | tris aim 1500 cap 6000 | from W146
WI-173 | batch 4 | vehicle | Delivery van | NEW | longest side 5 m | tris aim 1500 cap 6000 | from W147
WI-174 | batch 4 | vehicle | Kayak and canoe | NEW | longest side 4 m | tris aim 1500 cap 6000 | from W151
WI-175 | batch 4 | vehicle | Stroller and wagon | NEW | longest side 1 m | tris aim 1500 cap 6000 | from W156
WI-176 | batch 4 | vehicle | Lawn mower (ride-on) | ADAPT a library model | longest side 2 m | tris aim 1500 cap 6000 | from W158
WI-177 | batch 4 | plant | Dogwood and cherry in bloom | NEW | longest side 5 m | tris aim 400 cap 2000 | from W165 | note: spring
WI-178 | batch 4 | plant | Snowman | NEW | longest side 1.6 m | tris aim 400 cap 2000 | from W170 | note: winter
WI-179 | batch 4 | plant | Reeds and cattails | ADAPT a library model | longest side 1.5 m | tris aim 400 cap 2000 | from W171 | note: waits on water query
WI-180 | batch 4 | plant | Lily pads and lotus | NEW | longest side 0.5 m | tris aim 400 cap 2000 | from W172
WI-181 | batch 4 | plant | Fallen log and stump | ADAPT a library model | longest side 1.5 m | tris aim 400 cap 2000 | from W174
WI-182 | batch 4 | plant | Mushrooms and ferns (Fells floor) | ADAPT a library model | longest side 0.4 m | tris aim 400 cap 2000 | from W175
WI-183 | batch 4 | prop | Seesaw | NEW | longest side 3 m | tris aim 300 cap 1500 | from W181
WI-184 | batch 4 | prop | Sandbox with bucket | NEW | longest side 2 m | tris aim 300 cap 1500 | from W182
WI-185 | batch 4 | prop | Trampoline | NEW | longest side 3 m | tris aim 300 cap 1500 | from W183
WI-186 | batch 4 | prop | Baseball backstop and bases | NEW | longest side 4 m | tris aim 300 cap 1500 | from W185
WI-187 | batch 4 | prop | Basketball hoop | NEW | longest side 3.5 m | tris aim 300 cap 1500 | from W186
WI-188 | batch 4 | prop | Kite | NEW | longest side 1.2 m | tris aim 300 cap 1500 | from W187 | note: wind cue
WI-189 | batch 4 | prop | Chalk drawings on pavement | NEW | longest side 2 m | tris aim 300 cap 1500 | from W188
WI-190 | batch 4 | prop | Garden gnomes (x3) | NEW | longest side 0.6 m | tris aim 300 cap 1500 | from W202
WI-191 | batch 4 | prop | Wreath and door knocker | NEW | longest side 0.6 m | tris aim 300 cap 1500 | from W203
WI-192 | batch 4 | prop | Porch swing and rocking chair | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W206
WI-193 | batch 4 | prop | Wheelbarrow and rake | NEW | longest side 1.2 m | tris aim 300 cap 1500 | from W209
WI-194 | batch 4 | prop | Chimney with smoke | NEW | longest side 2 m | tris aim 300 cap 1500 | from W211 | note: drives wind cue
WI-195 | batch 4 | prop | Stone memorial plaque | NEW | longest side 0.6 m | tris aim 300 cap 1500 | from W217
WI-196 | batch 4 | prop | Bandstand with bunting | NEW | longest side 6 m | tris aim 300 cap 1500 | from W219
WI-197 | batch 4 | prop | Railway signal and semaphore | ADAPT a library model | longest side 5 m | tris aim 300 cap 1500 | from W220
WI-198 | batch 4 | prop | Platform clock and timetable board | NEW | longest side 2 m | tris aim 300 cap 1500 | from W221
WI-199 | batch 4 | prop | Pond dock and boat ramp | NEW | longest side 6 m | tris aim 300 cap 1500 | from W222
WI-200 | batch 4 | prop | Stone bridge arch pieces | ADAPT a library model | longest side 12 m | tris aim 300 cap 1500 | from W224
WI-201 | batch 5 | animal | Dog (husky) | ADAPT a library model | longest side 0.7 m | tris aim 1500 cap 5000 | from W236
WI-202 | batch 5 | animal | Dog (corgi) | ADAPT a library model | longest side 0.5 m | tris aim 1500 cap 5000 | from W237
WI-203 | batch 5 | animal | Puppy | ADAPT a library model | longest side 0.3 m | tris aim 1500 cap 5000 | from W238
WI-204 | batch 5 | animal | Black cat | ADAPT a library model | longest side 0.4 m | tris aim 1500 cap 5000 | from W240 | note: Halloween
WI-205 | batch 5 | animal | Rabbit | NEW | longest side 0.4 m | tris aim 1500 cap 5000 | from W243
WI-206 | batch 5 | animal | Chipmunk | NEW | longest side 0.15 m | tris aim 1500 cap 5000 | from W245
WI-207 | batch 5 | animal | Cottontail rabbit | NEW | longest side 0.35 m | tris aim 1500 cap 5000 | from W246
WI-208 | batch 5 | animal | Swan | NEW | longest side 1.2 m | tris aim 1500 cap 5000 | from W251
WI-209 | batch 5 | animal | Red-tailed hawk | NEW | longest side 0.6 m | tris aim 1500 cap 5000 | from W253
WI-210 | batch 5 | animal | Barred owl | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W254 | note: night
WI-211 | batch 5 | animal | Blue jay | NEW | longest side 0.25 m | tris aim 1500 cap 5000 | from W256
WI-212 | batch 5 | animal | Robin | NEW | longest side 0.2 m | tris aim 1500 cap 5000 | from W257 | note: first sign of spring
WI-213 | batch 5 | animal | Crow | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W258
WI-214 | batch 5 | animal | Seagull at the lake | ADAPT a library model | longest side 0.5 m | tris aim 1500 cap 5000 | from W259
WI-215 | batch 5 | animal | Red fox | NEW | longest side 0.8 m | tris aim 1500 cap 5000 | from W262
WI-216 | batch 5 | animal | Skunk (cartoon-friendly) | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W264
WI-217 | batch 5 | animal | Bass and sunfish (pond) | NEW | longest side 0.4 m | tris aim 1500 cap 5000 | from W270
WI-218 | batch 5 | animal | Dragonfly and butterflies | NEW | longest side 0.1 m | tris aim 1500 cap 5000 | from W271
WI-219 | batch 5 | animal | Bat | NEW | longest side 0.2 m | tris aim 1500 cap 5000 | from W274 | note: Halloween
WI-220 | batch 5 | animal | Pig | NEW | longest side 1.2 m | tris aim 1500 cap 5000 | from W279
WI-221 | batch 5 | animal | Farm duck | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W283
WI-222 | batch 5 | animal | Rooster | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W285 | note: morning cue
WI-223 | batch 5 | animal | Sheepdog (border collie) | ADAPT a library model | longest side 0.6 m | tris aim 1500 cap 5000 | from W286
WI-224 | batch 5 | character | Deli worker at Frozen Hoagies | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W288 | note: paper hat; size to be confirmed
WI-225 | batch 5 | character | Parent with stroller | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W289 | note: size to be confirmed
WI-226 | batch 5 | character | Soccer coach with whistle | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W292 | note: size to be confirmed
WI-227 | batch 5 | character | Little league batter | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W293 | note: size to be confirmed
WI-228 | batch 5 | character | Kid on a scooter | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W295 | note: size to be confirmed
WI-229 | batch 5 | character | Toddler with a balloon | ADAPT a library model | longest side 1.7 m | tris aim 2500 cap 7000 | from W296 | note: size to be confirmed
WI-230 | batch 5 | character | Ice cream truck driver | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W300 | note: size to be confirmed
WI-231 | batch 5 | character | Farm stand seller | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W301 | note: size to be confirmed
WI-232 | batch 5 | character | Shop owner sweeping the step | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W307 | note: size to be confirmed
WI-233 | batch 5 | character | Kayaker | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W308 | note: size to be confirmed
WI-234 | batch 5 | character | Photographer with a camera | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W310 | note: drone day; size to be confirmed
WI-235 | batch 5 | character | Busker with a guitar | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W311 | note: size to be confirmed
WI-236 | batch 5 | building | Donut shop | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W334 | note: size to be confirmed
WI-237 | batch 5 | building | Baseball diamond with backstop | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W341 | note: size to be confirmed
WI-238 | batch 5 | building | Horn Pond boathouse | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W343 | note: size to be confirmed
WI-239 | batch 5 | building | Lake beach with lifeguard chair | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W344 | note: size to be confirmed
WI-240 | batch 5 | building | Farm stand | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W346 | note: size to be confirmed
WI-241 | batch 5 | building | Woodland trail head | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W350 | note: size to be confirmed
WI-242 | batch 5 | building | Triple-decker | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W355 | note: size to be confirmed
WI-243 | batch 5 | building | Garage with open door | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W356 | note: size to be confirmed
WI-244 | batch 5 | prop | Traffic light | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W364 | note: size to be confirmed
WI-245 | batch 5 | prop | Crosswalk stripes | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W365 | note: size to be confirmed
WI-246 | batch 5 | prop | Granite curb run | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W366 | note: size to be confirmed
WI-247 | batch 5 | prop | Recycling bin | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W370 | note: size to be confirmed
WI-248 | batch 5 | prop | Planter with mums | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W371 | note: size to be confirmed
WI-249 | batch 5 | prop | War memorial | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W372 | note: size to be confirmed
WI-250 | batch 5 | prop | Level crossing gates | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W374 | note: size to be confirmed
WI-251 | batch 6 | prop | Mail truck | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W376 | note: size to be confirmed
WI-252 | batch 6 | prop | Station wagon | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W377 | note: size to be confirmed
WI-253 | batch 6 | prop | Minivan | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W378 | note: size to be confirmed
WI-254 | batch 6 | prop | Kick scooter | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W379 | note: size to be confirmed
WI-255 | batch 6 | prop | Kayak and paddle | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W380 | note: size to be confirmed
WI-256 | batch 6 | prop | Charcoal grill | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W382 | note: size to be confirmed
WI-257 | batch 6 | prop | Adirondack chair | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W383 | note: size to be confirmed
WI-258 | batch 6 | prop | Corn stalks | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W388 | note: size to be confirmed
WI-259 | batch 6 | prop | Apple basket | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W389 | note: size to be confirmed
WI-260 | batch 6 | prop | Sled | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W390 | note: size to be confirmed
WI-261 | batch 6 | prop | Christmas lights on a porch | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W391 | note: size to be confirmed
WI-262 | batch 6 | prop | Baseball bat and glove | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W392 | note: size to be confirmed
WI-263 | batch 6 | prop | Fishing rod | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W398 | note: size to be confirmed
WI-264 | batch 6 | prop | Bird feeder | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W399 | note: size to be confirmed
WI-265 | batch 6 | prop | Birdhouse | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W400 | note: size to be confirmed
WI-266 | batch 6 | prop | Cellar bulkhead door | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W405 | note: coffee shop to basement; size to be confirmed
WI-267 | batch 6 | prop | Telescope | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W409 | note: size to be confirmed
WI-268 | batch 6 | prop | Ham radio | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W411 | note: size to be confirmed
WI-269 | batch 6 | prop | New Nova skyline | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W413 | note: horizon; size to be confirmed
WI-270 | batch 6 | prop | Birthday cake with candles | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W414 | note: size to be confirmed
WI-271 | batch 6 | prop | Piano | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W415 | note: size to be confirmed
WI-272 | batch 6 | prop | Campfire with logs | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W423 | note: size to be confirmed
WI-273 | batch 6 | prop | Tent | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W424 | note: size to be confirmed
WI-274 | batch 6 | prop | Fallen leaf scatter | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W426 | note: size to be confirmed
WI-275 | batch 6 | prop | Hydrangea shrub | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W427 | note: size to be confirmed
WI-276 | batch 6 | animal | Duckling line | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W434 | note: size to be confirmed
WI-277 | batch 6 | animal | Snapping turtle | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W435 | note: size to be confirmed
WI-278 | batch 6 | animal | Monarch butterfly | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W438 | note: size to be confirmed
WI-279 | batch 6 | animal | Honey bee | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W439 | note: size to be confirmed
WI-280 | batch 6 | animal | Koi or pond fish | ADAPT a library model | longest side 0.5 m | tris aim 1500 cap 5000 | from W443 | note: size to be confirmed
WI-281 | batch 6 | animal | Groundhog | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W444 | note: size to be confirmed
WI-282 | batch 6 | building | Police station | NEW | longest side 14 m | tris aim 3000 cap 12000 | from W012 | note: PG, friendly: lost-and-found bell
WI-283 | batch 6 | building | Bank with columns | NEW | longest side 14 m | tris aim 3000 cap 12000 | from W015
WI-284 | batch 6 | building | Barber shop (striped pole) | NEW | longest side 8 m | tris aim 3000 cap 12000 | from W020
WI-285 | batch 6 | building | Dentist and doctor offices | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W021 | note: doctors waving sprite already exists
WI-286 | batch 6 | building | Parking lot behind shops | NEW | longest side 20 m | tris aim 3000 cap 12000 | from W029 | note: toy cars live here
WI-287 | batch 6 | building | Lookout rock | ADAPT a library model | longest side 5 m | tris aim 3000 cap 12000 | from W036 | note: good place for the drone to land
WI-288 | batch 6 | building | Stone arch gateway into the Square | ADAPT a library model | longest side 8 m | tris aim 3000 cap 12000 | from W060
WI-289 | batch 6 | building | Storm drain and fire hydrant corner | NEW | longest side 2 m | tris aim 3000 cap 12000 | from W061
WI-290 | batch 6 | character | Scientist | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W078 | note: parked with the lab
WI-291 | batch 6 | character | Butcher / deli worker | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W085
WI-292 | batch 6 | character | Garbage collector | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W092
WI-293 | batch 6 | character | Road crew worker with cone | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W093
WI-294 | batch 6 | character | Painter with an easel on the common | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W110
WI-295 | batch 6 | character | Tourist with camera | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W116 | note: Evan with the drone, as a cameo
WI-296 | batch 6 | character | Santa / seasonal costume wearers | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W117 | note: Halloween thread
WI-297 | batch 6 | character | Wedding couple | NEW | longest side 1.8 m | tris aim 2500 cap 7000 | from W119
WI-298 | batch 6 | prop | Drinking fountain | NEW | longest side 1.2 m | tris aim 300 cap 1500 | from W131
WI-299 | batch 6 | prop | Bollard and chain | NEW | longest side 0.8 m | tris aim 300 cap 1500 | from W133
WI-300 | batch 6 | prop | Newspaper box | NEW | longest side 1 m | tris aim 300 cap 1500 | from W134
WI-301 | batch 7 | prop | Phone booth (retired, now a book swap) | NEW | longest side 2.4 m | tris aim 300 cap 1500 | from W137
WI-302 | batch 7 | vehicle | Ambulance | NEW | longest side 6 m | tris aim 1500 cap 6000 | from W145
WI-303 | batch 7 | vehicle | Garbage truck | NEW | longest side 8 m | tris aim 1500 cap 6000 | from W149
WI-304 | batch 7 | vehicle | Snow plow | NEW | longest side 6 m | tris aim 1500 cap 6000 | from W157 | note: winter event
WI-305 | batch 7 | plant | Ivy on brick | NEW | longest side 2 m | tris aim 400 cap 2000 | from W177
WI-306 | batch 7 | plant | Compost heap | ADAPT a library model | longest side 1.5 m | tris aim 400 cap 2000 | from W178
WI-307 | batch 7 | prop | Hopscotch grid | NEW | longest side 2 m | tris aim 300 cap 1500 | from W192
WI-308 | batch 7 | prop | Clothesline with laundry | NEW | longest side 3 m | tris aim 300 cap 1500 | from W208
WI-309 | batch 7 | prop | Satellite dish and antenna | ADAPT a library model | longest side 1 m | tris aim 300 cap 1500 | from W214
WI-310 | batch 7 | prop | Basement window wells | ADAPT a library model | longest side 1 m | tris aim 300 cap 1500 | from W215
WI-311 | batch 7 | prop | Dam and weir | NEW | longest side 10 m | tris aim 300 cap 1500 | from W223 | note: river hex
WI-312 | batch 7 | prop | Library book return drop | NEW | longest side 1.2 m | tris aim 300 cap 1500 | from W225
WI-313 | batch 7 | prop | Community garden plots | NEW | longest side 6 m | tris aim 300 cap 1500 | from W227
WI-314 | batch 7 | prop | Windmill (small) | NEW | longest side 6 m | tris aim 300 cap 1500 | from W232
WI-315 | batch 7 | animal | Goldfish bowl | NEW | longest side 0.3 m | tris aim 1500 cap 5000 | from W242
WI-316 | batch 7 | animal | Hummingbird | NEW | longest side 0.1 m | tris aim 1500 cap 5000 | from W261
WI-317 | batch 7 | animal | Opossum | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W265
WI-318 | batch 7 | animal | Coyote at the edge of the Fells | NEW | longest side 1 m | tris aim 1500 cap 5000 | from W266
WI-319 | batch 7 | animal | Garter snake | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W269
WI-320 | batch 7 | animal | Bumblebee | NEW | longest side 0.05 m | tris aim 1500 cap 5000 | from W273
WI-321 | batch 7 | animal | Alpaca | NEW | longest side 1.8 m | tris aim 1500 cap 5000 | from W281
WI-322 | batch 7 | animal | Highland cow | NEW | longest side 1.8 m | tris aim 1500 cap 5000 | from W284
WI-323 | batch 7 | character | Umpire | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W294 | note: size to be confirmed
WI-324 | batch 7 | character | Man reading the newspaper | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W297 | note: size to be confirmed
WI-325 | batch 7 | character | Landscaper with a leaf blower | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W298 | note: October sound; size to be confirmed
WI-326 | batch 7 | character | Snow plow driver | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W299 | note: winter; size to be confirmed
WI-327 | batch 7 | character | Church organist | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W302 | note: size to be confirmed
WI-328 | batch 7 | character | Choir singers | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W303 | note: size to be confirmed
WI-329 | batch 7 | character | Town clerk | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W304 | note: size to be confirmed
WI-330 | batch 7 | character | Newspaper kid on a bike | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W305 | note: size to be confirmed
WI-331 | batch 7 | character | Pizza delivery driver | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W306 | note: size to be confirmed
WI-332 | batch 7 | character | Birdwatcher with binoculars | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W309 | note: size to be confirmed
WI-333 | batch 7 | character | Dad with a toolbox | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W312 | note: size to be confirmed
WI-334 | batch 7 | character | Kid in a snowsuit | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W315 | note: size to be confirmed
WI-335 | batch 7 | character | Girl scouts selling cookies | ADAPT a library model | longest side 1.7 m | tris aim 2500 cap 7000 | from W316 | note: size to be confirmed
WI-336 | batch 7 | character | Dance class kids | ADAPT a library model | longest side 1.7 m | tris aim 2500 cap 7000 | from W317 | note: size to be confirmed
WI-337 | batch 7 | character | Karate kids | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W318 | note: size to be confirmed
WI-338 | batch 7 | character | Pharmacist | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W319 | note: size to be confirmed
WI-339 | batch 7 | character | Bank teller | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W320 | note: size to be confirmed
WI-340 | batch 7 | character | Barber | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W321 | note: size to be confirmed
WI-341 | batch 7 | character | Bookshop owner | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W322 | note: size to be confirmed
WI-342 | batch 7 | character | Vet | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W323 | note: size to be confirmed
WI-343 | batch 7 | character | Dentist | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W324 | note: size to be confirmed
WI-344 | batch 7 | character | Mayor with a sash | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W325 | note: size to be confirmed
WI-345 | batch 7 | character | Town historian in a tricorn hat | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W326 | note: size to be confirmed
WI-346 | batch 7 | character | Grocery cashier | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W327 | note: size to be confirmed
WI-347 | batch 7 | character | Delivery van driver | NEW | longest side 1.7 m | tris aim 2500 cap 7000 | from W328 | note: size to be confirmed
WI-348 | batch 7 | building | Unitarian church (stone) | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W329 | note: size to be confirmed
WI-349 | batch 7 | building | Lyceum building | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W330 | note: size to be confirmed
WI-350 | batch 7 | building | Savings bank | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W332 | note: size to be confirmed
WI-351 | batch 8 | building | Pharmacy | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W333 | note: size to be confirmed
WI-352 | batch 8 | building | Gas station | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W336 | note: size to be confirmed
WI-353 | batch 8 | building | Movie theatre marquee | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W337 | note: size to be confirmed
WI-354 | batch 8 | building | Vet clinic | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W338 | note: size to be confirmed
WI-355 | batch 8 | building | Community garden plots | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W347 | note: size to be confirmed
WI-356 | batch 8 | building | Cemetery with iron gate | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W348 | note: Halloween; size to be confirmed
WI-357 | batch 8 | building | Scout hut | ADAPT a library model | longest side 10 m | tris aim 3000 cap 12000 | from W351 | note: size to be confirmed
WI-358 | batch 8 | building | Drive-in or outdoor movie lawn | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W358 | note: size to be confirmed
WI-359 | batch 8 | building | Fairground or street fair | NEW | longest side 10 m | tris aim 3000 cap 12000 | from W359 | note: size to be confirmed
WI-360 | batch 8 | prop | Storm drain | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W367 | note: size to be confirmed
WI-361 | batch 8 | prop | Manhole cover | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W368 | note: size to be confirmed
WI-362 | batch 8 | prop | Parking meter | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W369 | note: size to be confirmed
WI-363 | batch 8 | prop | Bus stop shelter | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W373 | note: size to be confirmed
WI-364 | batch 8 | prop | Police car | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W375 | note: size to be confirmed
WI-365 | batch 8 | prop | Sailboat on the pond | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W381 | note: size to be confirmed
WI-366 | batch 8 | prop | Garden hose and reel | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W384 | note: size to be confirmed
WI-367 | batch 8 | prop | Football | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W393 | note: size to be confirmed
WI-368 | batch 8 | prop | Frisbee | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W394 | note: size to be confirmed
WI-369 | batch 8 | prop | Sandcastle | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W395 | note: size to be confirmed
WI-370 | batch 8 | prop | Beach umbrella | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W396 | note: size to be confirmed
WI-371 | batch 8 | prop | Beach towel and bucket | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W397 | note: size to be confirmed
WI-372 | batch 8 | prop | Wind chimes | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W401 | note: size to be confirmed
WI-373 | batch 8 | prop | Rain barrel | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W403 | note: size to be confirmed
WI-374 | batch 8 | prop | Compost bin | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W404 | note: size to be confirmed
WI-375 | batch 8 | prop | Microscope | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W410 | note: size to be confirmed
WI-376 | batch 8 | prop | Easel and canvas | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W416 | note: size to be confirmed
WI-377 | batch 8 | prop | Camera tripod | ADAPT a library model | longest side 1.5 m | tris aim 300 cap 1500 | from W417 | note: size to be confirmed
WI-378 | batch 8 | prop | Treasure map | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W421 | note: size to be confirmed
WI-379 | batch 8 | prop | Stone cairn | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W422 | note: size to be confirmed
WI-380 | batch 8 | prop | Cattail clump | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W425 | note: size to be confirmed
WI-381 | batch 8 | prop | Lilac bush | NEW | longest side 4.5 m | tris aim 300 cap 1500 | from W428 | note: size to be confirmed
WI-382 | batch 8 | prop | Dandelions and clover patch | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W429 | note: size to be confirmed
WI-383 | batch 8 | prop | Stepping stones | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W430 | note: size to be confirmed
WI-384 | batch 8 | prop | Fountain in the common | NEW | longest side 1.5 m | tris aim 300 cap 1500 | from W431 | note: size to be confirmed
WI-385 | batch 8 | animal | Chickadee | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W436 | note: size to be confirmed
WI-386 | batch 8 | animal | Woodpecker | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W437 | note: size to be confirmed
WI-387 | batch 8 | animal | Ladybug | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W440 | note: size to be confirmed
WI-388 | batch 8 | animal | Garden snail | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W441 | note: size to be confirmed
WI-389 | batch 8 | animal | Earthworm | NEW | longest side 0.5 m | tris aim 1500 cap 5000 | from W442 | note: size to be confirmed
WI-390 | batch 8 | animal | Hermit crab | ADAPT a library model | longest side 0.5 m | tris aim 1500 cap 5000 | from W446 | note: size to be confirmed
WI-391 | batch 8 | animal | Seal at the coast | ADAPT a library model | longest side 0.5 m | tris aim 1500 cap 5000 | from W447 | note: size to be confirmed
