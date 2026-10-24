ROLE
You are the 3D modeler for Abbie's World, a kids' game (PG, friendly, never scary). The game is a toy-table version of Winchester, Massachusetts, a New England town of brick shops, white clapboard houses, maples and a lake. You will model the 231 items listed at the end, in priority order (P1 first). Do P1 completely before starting P2.

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
3. one line in manifest.json: {"id","name","slug","stage1_tris","stage2_tris","height_m","longest_m","materials":[...],"parts":[...],"source":"chatgpt","notes"}

HAND-BACK TO THE LIBRARY
Zip the batch as winchester-batch-<NN>.zip containing the GLBs, the PNGs and manifest.json, at most 25 items per zip, P1 first. Give the zip to Evan. He drops it to Claude, who will: place each item at models/winchester/<ID>-<slug>/ in the repo (evanrobinson2/abbiesworld_ios) with model.glb (stage 2), stage1.glb, render.jpg and provenance.json (the prompt, the date, the model, the stage notes), add it to dist/models/library.json as a new "Winchester inventory" collection with pass "Original" for stage 1 and "Upgrade" for stage 2, and tag it with a decorator role in props-catalogue.json. If a file fails the checks (pivot, scale, triangle budget, material names), it will come back to you with the reason.

HOW TO WORK
Do one item at a time. After each stage 1, check the silhouette from the front and side against the description before spending the upgrade pass. Report anything you could not do, and anything you changed, in the notes field. Do not skip items quietly.

THE ITEMS (id | priority | NEW or ADAPT | category | what | size | triangle budgets)
W002 | P1 | NEW | PLACES | Town Hall (brick, clock tower) | longest side 18 m | tris S1<=3000, S2<=9000 | note: landmark for the opening tour
W003 | P1 | NEW | PLACES | Public Library | longest side 16 m | tris S1<=3000, S2<=9000 | note: reading nook inside; quest giver
W005 | P1 | NEW | PLACES | Main Street shop row (brick, 3 storeys) | longest side 14 m | tris S1<=3000, S2<=9000 | note: repeating 4-bay module with awnings
W025 | P1 | NEW | PLACES | Railway bridge over the river | longest side 20 m | tris S1<=3000, S2<=9000
W030 | P1 | NEW | PLACES | Upper Mystic Lake shore and boat club | longest side 30 m | tris S1<=3000, S2<=9000 | note: rowing shells, floats
W037 | P1 | NEW | PLACES | Muraco School and playground | longest side 26 m | tris S1<=3000, S2<=9000 | note: School Jump game
W038 | P1 | NEW | PLACES | Leonard Field with backstop | longest side 30 m | tris S1<=3000, S2<=9000
W051 | P1 | NEW | PLACES | Abbie's backyard (swing set, sandbox, trampoline) | longest side 14 m | tris S1<=3000, S2<=9000 | note: no real address; generic yard
W075 | P1 | NEW | PEOPLE | Teacher | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: stand-in only
W076 | P1 | NEW | PEOPLE | Librarian | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: stand-in only
W077 | P1 | NEW | PEOPLE | Postie | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: stand-in only
W079 | P1 | NEW | PEOPLE | Farmer | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: stand-in only
W080 | P1 | NEW | PEOPLE | Barista | longest side 1.7 m | tris S1<=2500, S2<=6000 | note: coffee shop
W081 | P1 | NEW | PEOPLE | Pizza maker | longest side 1.7 m | tris S1<=2500, S2<=6000
W082 | P1 | NEW | PEOPLE | Ice cream server | longest side 1.7 m | tris S1<=2500, S2<=6000
W083 | P1 | ADAPT | PEOPLE | Shopkeeper | longest side 1.7 m | tris S1<=2500, S2<=6000
W086 | P1 | NEW | PEOPLE | Firefighter | longest side 1.8 m | tris S1<=2500, S2<=6000
W088 | P1 | NEW | PEOPLE | Crossing guard with stop sign | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: school time cue
W100 | P1 | NEW | PEOPLE | Kid in backpack (x6 skins) | longest side 1.2 m | tris S1<=2500, S2<=6000 | note: instanced crowd with colour variants
W102 | P1 | NEW | PEOPLE | Teen with skateboard | longest side 1.6 m | tris S1<=2500, S2<=6000 | note: skate park
W104 | P1 | NEW | PEOPLE | Jogger | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: loops the common
W113 | P1 | NEW | PEOPLE | Grandparents on a bench | longest side 1.7 m | tris S1<=2500, S2<=6000
W114 | P1 | NEW | PEOPLE | Commuter with briefcase | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: depot crowd
W118 | P1 | NEW | PEOPLE | Trick-or-treaters (witch, ghost, dino) | longest side 1.2 m | tris S1<=2500, S2<=6000 | note: Halloween waits on Evan's go
W123 | P1 | ADAPT | THINGS | Trash can | longest side 1 m | tris S1<=500, S2<=2000
W128 | P1 | NEW | THINGS | Painted street signs (name blades) | longest side 2.5 m | tris S1<=1200, S2<=3500 | note: painted wood, ranch dialect
W130 | P1 | ADAPT | THINGS | Planter box with flowers | longest side 1 m | tris S1<=500, S2<=2000
W132 | P1 | NEW | THINGS | Sandwich-board sign | longest side 1 m | tris S1<=500, S2<=2000 | note: shops
W135 | P1 | ADAPT | THINGS | Cafe table and chairs outside | longest side 1.2 m | tris S1<=500, S2<=2000
W139 | P1 | ADAPT | THINGS | Family SUV (Subaru-like, unbranded) | longest side 4.5 m | tris S1<=1200, S2<=3500 | note: brands are inspired-by only
W142 | P1 | ADAPT | THINGS | School bus | longest side 11 m | tris S1<=2500, S2<=7000 | note: yellow, kids hop on
W143 | P1 | NEW | THINGS | Fire engine | longest side 9 m | tris S1<=2500, S2<=7000
W154 | P1 | NEW | THINGS | Bicycle (kid and adult) | longest side 1.8 m | tris S1<=1200, S2<=3500
W155 | P1 | NEW | THINGS | Scooter and skateboard | longest side 0.9 m | tris S1<=500, S2<=2000
W166 | P1 | ADAPT | THINGS | Flower beds, tulip rows | longest side 1 m | tris S1<=500, S2<=2000
W167 | P1 | ADAPT | THINGS | Hedge and shrub | longest side 1.5 m | tris S1<=1200, S2<=3500
W168 | P1 | ADAPT | THINGS | Pumpkin patch | longest side 0.6 m | tris S1<=500, S2<=2000 | note: autumn
W169 | P1 | NEW | THINGS | Fall leaf piles | longest side 1 m | tris S1<=500, S2<=2000 | note: kids jump in them
W179 | P1 | NEW | THINGS | Swing set | longest side 3 m | tris S1<=1200, S2<=3500
W180 | P1 | NEW | THINGS | Slide and climbing frame | longest side 3 m | tris S1<=1200, S2<=3500
W189 | P1 | NEW | THINGS | Lemonade stand | longest side 2 m | tris S1<=1200, S2<=3500 | note: kid shop quest
W190 | P1 | NEW | THINGS | Treehouse with rope ladder | longest side 4 m | tris S1<=1200, S2<=3500
W191 | P1 | NEW | THINGS | Skate ramp and rails | longest side 3 m | tris S1<=1200, S2<=3500
W193 | P1 | NEW | THINGS | Awnings (striped, 5 colours) | longest side 3 m | tris S1<=1200, S2<=3500
W194 | P1 | NEW | THINGS | Shop signs (painted wood) | longest side 2 m | tris S1<=1200, S2<=3500
W195 | P1 | NEW | THINGS | Pizza oven and boxes | longest side 1.5 m | tris S1<=1200, S2<=3500
W196 | P1 | NEW | THINGS | Ice cream cone sign | longest side 2 m | tris S1<=1200, S2<=3500
W197 | P1 | ADAPT | THINGS | Coffee cups and takeaway tray | longest side 0.3 m | tris S1<=500, S2<=2000 | note: cafe kit
W198 | P1 | NEW | THINGS | Baguette basket | longest side 0.5 m | tris S1<=500, S2<=2000
W199 | P1 | ADAPT | THINGS | Market stall with crates | longest side 3 m | tris S1<=1200, S2<=3500
W200 | P1 | NEW | THINGS | Fruit and vegetable crates | longest side 0.6 m | tris S1<=500, S2<=2000
W201 | P1 | NEW | THINGS | Books on a rack | longest side 0.4 m | tris S1<=500, S2<=2000
W216 | P1 | NEW | THINGS | Church bell | longest side 1 m | tris S1<=500, S2<=2000 | note: rings on the hour: the town clock
W218 | P1 | NEW | THINGS | Flagpole with flag | longest side 8 m | tris S1<=2500, S2<=7000
W226 | P1 | NEW | THINGS | Little free library box | longest side 1 m | tris S1<=500, S2<=2000 | note: quest item
W228 | P1 | NEW | THINGS | Farm stand with honesty box | longest side 3 m | tris S1<=1200, S2<=3500 | note: Wright-Locke inspiration
W234 | P1 | ADAPT | ANIMALS | Dog (golden retriever) | longest side 0.8 m | tris S1<=1500, S2<=4000
W235 | P1 | ADAPT | ANIMALS | Dog (small terrier) | longest side 0.4 m | tris S1<=600, S2<=1500
W244 | P1 | NEW | ANIMALS | Grey squirrel | longest side 0.3 m | tris S1<=600, S2<=1500 | note: runs up trees
W247 | P1 | NEW | ANIMALS | White-tailed deer (doe and fawn) | longest side 1.4 m | tris S1<=1500, S2<=4000 | note: Fells
W248 | P1 | NEW | ANIMALS | Wild turkey flock | longest side 0.9 m | tris S1<=1500, S2<=4000 | note: famous in MA suburbs
W249 | P1 | NEW | ANIMALS | Canada goose | longest side 0.9 m | tris S1<=1500, S2<=4000 | note: pond
W250 | P1 | NEW | ANIMALS | Mallard duck and ducklings | longest side 0.5 m | tris S1<=1500, S2<=4000
W255 | P1 | NEW | ANIMALS | Cardinal | longest side 0.2 m | tris S1<=600, S2<=1500 | note: red; winter pop of colour
W260 | P1 | NEW | ANIMALS | Pigeon flock at the depot | longest side 0.3 m | tris S1<=600, S2<=1500
W267 | P1 | NEW | ANIMALS | Painted turtle on a log | longest side 0.2 m | tris S1<=600, S2<=1500 | note: pond
W268 | P1 | NEW | ANIMALS | Bullfrog | longest side 0.15 m | tris S1<=600, S2<=1500 | note: sound cue at dusk
W272 | P1 | NEW | ANIMALS | Fireflies (particle) | longest side 0.05 m | tris S1<=600, S2<=1500 | note: summer night
W282 | P1 | ADAPT | ANIMALS | Barn cat | longest side 0.4 m | tris S1<=600, S2<=1500
W011 | P2 | NEW | PLACES | Fire station | longest side 16 m | tris S1<=3000, S2<=9000 | note: big red doors, pole, engine bay
W013 | P2 | NEW | PLACES | Post office | longest side 12 m | tris S1<=3000, S2<=9000 | note: postie quest giver home
W014 | P2 | NEW | PLACES | Town square war memorial | longest side 4 m | tris S1<=1500, S2<=4000 | note: stone plinth with wreath
W016 | P2 | NEW | PLACES | Hardware store | longest side 10 m | tris S1<=3000, S2<=9000 | note: bins of nails, ladders outside
W017 | P2 | NEW | PLACES | Toy shop | longest side 9 m | tris S1<=3000, S2<=9000 | note: pairs with the coaster toy-car charm
W018 | P2 | NEW | PLACES | Bookshop | longest side 9 m | tris S1<=3000, S2<=9000
W019 | P2 | NEW | PLACES | Florist | longest side 8 m | tris S1<=3000, S2<=9000 | note: buckets of blooms on pavement
W022 | P2 | NEW | PLACES | Church with steeple | longest side 16 m | tris S1<=3000, S2<=9000 | note: bell is a diegetic time cue
W027 | P2 | NEW | PLACES | Footbridge | longest side 8 m | tris S1<=3000, S2<=9000
W028 | P2 | NEW | PLACES | Level crossing with barrier | longest side 8 m | tris S1<=3000, S2<=9000 | note: bell and lights = diegetic cue
W031 | P2 | NEW | PLACES | Wedge Pond and small beach | longest side 20 m | tris S1<=3000, S2<=9000
W033 | P2 | NEW | PLACES | Fells trailhead with wooden sign | longest side 4 m | tris S1<=1500, S2<=4000 | note: Middlesex Fells edge
W034 | P2 | NEW | PLACES | Stone wall and stile | longest side 6 m | tris S1<=1500, S2<=4000 | note: New England field walls
W035 | P2 | NEW | PLACES | Water tower on the hill | longest side 18 m | tris S1<=3000, S2<=9000
W041 | P2 | NEW | PLACES | Corner store | longest side 9 m | tris S1<=3000, S2<=9000
W042 | P2 | NEW | PLACES | Bus stop shelter | longest side 4 m | tris S1<=1500, S2<=4000
W043 | P2 | NEW | PLACES | Neighbourhood park with swings | longest side 14 m | tris S1<=3000, S2<=9000
W045 | P2 | NEW | PLACES | Garage and driveway | longest side 7 m | tris S1<=1500, S2<=4000
W048 | P2 | NEW | PLACES | Horn Pond lookout and boat ramp | longest side 18 m | tris S1<=3000, S2<=9000
W049 | P2 | NEW | PLACES | Duck pond with little dock | longest side 12 m | tris S1<=3000, S2<=9000
W050 | P2 | ADAPT | PLACES | Lakeside picnic area | longest side 10 m | tris S1<=3000, S2<=9000
W052 | P2 | NEW | PLACES | Garden shed | longest side 4 m | tris S1<=1500, S2<=4000
W053 | P2 | NEW | PLACES | Vegetable garden beds | longest side 6 m | tris S1<=1500, S2<=4000
W054 | P2 | NEW | PLACES | Fire pit with chairs | longest side 3 m | tris S1<=1500, S2<=4000
W056 | P2 | NEW | PLACES | Launch Road signpost | longest side 3 m | tris S1<=1500, S2<=4000
W057 | P2 | ADAPT | PLACES | Orchard rows | longest side 12 m | tris S1<=3000, S2<=9000
W058 | P2 | NEW | PLACES | Main Street cobble setts crosswalk | longest side 8 m | tris S1<=3000, S2<=9000 | note: open: Main Street setts
W059 | P2 | NEW | PLACES | Traffic light and signal pole | longest side 5 m | tris S1<=1500, S2<=4000
W062 | P2 | NEW | PLACES | Telephone pole with wires | longest side 9 m | tris S1<=3000, S2<=9000 | note: wires as a thin curve prop
W068 | P2 | NEW | PEOPLE | Lexi (blonde, crop top) | longest side 1.7 m | tris S1<=2500, S2<=6000 | note: canon
W070 | P2 | NEW | PEOPLE | Georgia (teen) | longest side 1.6 m | tris S1<=2500, S2<=6000 | note: canon
W084 | P2 | NEW | PEOPLE | Florist | longest side 1.7 m | tris S1<=2500, S2<=6000
W087 | P2 | NEW | PEOPLE | Police officer (friendly) | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: PG: helps lost kids
W090 | P2 | NEW | PEOPLE | Train conductor | longest side 1.8 m | tris S1<=2500, S2<=6000
W091 | P2 | NEW | PEOPLE | Mail carrier with satchel | longest side 1.8 m | tris S1<=2500, S2<=6000
W094 | P2 | NEW | PEOPLE | Librarian at the desk | longest side 1.7 m | tris S1<=2500, S2<=6000
W096 | P2 | NEW | PEOPLE | Dog walker with three dogs | longest side 1.8 m | tris S1<=2500, S2<=6000
W097 | P2 | NEW | PEOPLE | Doctor / nurse | longest side 1.8 m | tris S1<=2500, S2<=6000
W098 | P2 | NEW | PEOPLE | Principal | longest side 1.8 m | tris S1<=2500, S2<=6000
W099 | P2 | NEW | PEOPLE | Gym teacher with whistle | longest side 1.8 m | tris S1<=2500, S2<=6000
W101 | P2 | NEW | PEOPLE | Toddler in a stroller | longest side 1.0 m | tris S1<=2500, S2<=6000
W105 | P2 | NEW | PEOPLE | Cyclist with helmet | longest side 1.8 m | tris S1<=2500, S2<=6000
W106 | P2 | NEW | PEOPLE | Fisher at the pond | longest side 1.8 m | tris S1<=2500, S2<=6000
W107 | P2 | NEW | PEOPLE | Rower in a shell | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: Mystic lake
W108 | P2 | NEW | PEOPLE | Baseball players (team of 9) | longest side 1.7 m | tris S1<=2500, S2<=6000 | note: Leonard Field
W109 | P2 | NEW | PEOPLE | Soccer players | longest side 1.7 m | tris S1<=2500, S2<=6000
W111 | P2 | NEW | PEOPLE | Musician with guitar | longest side 1.7 m | tris S1<=2500, S2<=6000 | note: busker at the depot
W112 | P2 | NEW | PEOPLE | Picnic family on a blanket | longest side 1.5 m | tris S1<=2500, S2<=6000
W115 | P2 | NEW | PEOPLE | Hiker with walking stick | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: Fells
W120 | P2 | ADAPT | PEOPLE | Street vendor with hot dog cart | longest side 1.8 m | tris S1<=2500, S2<=6000
W124 | P2 | NEW | THINGS | Fire hydrant | longest side 0.8 m | tris S1<=500, S2<=2000
W126 | P2 | NEW | THINGS | Bike rack with bikes | longest side 1.5 m | tris S1<=1200, S2<=3500
W127 | P2 | NEW | THINGS | Bus stop sign | longest side 2.5 m | tris S1<=1200, S2<=3500
W129 | P2 | NEW | THINGS | Banner on a lamp post | longest side 3 m | tris S1<=1200, S2<=3500 | note: seasonal
W136 | P2 | NEW | THINGS | Umbrella over a table | longest side 2.4 m | tris S1<=1200, S2<=3500
W138 | P2 | NEW | THINGS | Town clock on a post | longest side 4 m | tris S1<=1200, S2<=3500 | note: time cue
W144 | P2 | NEW | THINGS | Police cruiser (friendly) | longest side 4.8 m | tris S1<=1200, S2<=3500
W146 | P2 | NEW | THINGS | Postal van | longest side 5 m | tris S1<=1200, S2<=3500
W147 | P2 | NEW | THINGS | Delivery van | longest side 5 m | tris S1<=1200, S2<=3500
W150 | P2 | NEW | THINGS | Ice cream truck | longest side 6 m | tris S1<=2500, S2<=7000 | note: plays a tune: diegetic cue
W151 | P2 | NEW | THINGS | Kayak and canoe | longest side 4 m | tris S1<=1200, S2<=3500
W156 | P2 | NEW | THINGS | Stroller and wagon | longest side 1 m | tris S1<=500, S2<=2000
W158 | P2 | ADAPT | THINGS | Lawn mower (ride-on) | longest side 2 m | tris S1<=1200, S2<=3500
W165 | P2 | NEW | THINGS | Dogwood and cherry in bloom | longest side 5 m | tris S1<=1200, S2<=3500 | note: spring
W170 | P2 | NEW | THINGS | Snowman | longest side 1.6 m | tris S1<=1200, S2<=3500 | note: winter
W171 | P2 | ADAPT | THINGS | Reeds and cattails | longest side 1.5 m | tris S1<=1200, S2<=3500 | note: waits on water query
W172 | P2 | NEW | THINGS | Lily pads and lotus | longest side 0.5 m | tris S1<=500, S2<=2000
W174 | P2 | ADAPT | THINGS | Fallen log and stump | longest side 1.5 m | tris S1<=1200, S2<=3500
W175 | P2 | ADAPT | THINGS | Mushrooms and ferns (Fells floor) | longest side 0.4 m | tris S1<=500, S2<=2000
W181 | P2 | NEW | THINGS | Seesaw | longest side 3 m | tris S1<=1200, S2<=3500
W182 | P2 | NEW | THINGS | Sandbox with bucket | longest side 2 m | tris S1<=1200, S2<=3500
W183 | P2 | NEW | THINGS | Trampoline | longest side 3 m | tris S1<=1200, S2<=3500
W184 | P2 | NEW | THINGS | Soccer goal | longest side 3 m | tris S1<=1200, S2<=3500
W185 | P2 | NEW | THINGS | Baseball backstop and bases | longest side 4 m | tris S1<=1200, S2<=3500
W186 | P2 | NEW | THINGS | Basketball hoop | longest side 3.5 m | tris S1<=1200, S2<=3500
W187 | P2 | NEW | THINGS | Kite | longest side 1.2 m | tris S1<=500, S2<=2000 | note: wind cue
W188 | P2 | NEW | THINGS | Chalk drawings on pavement | longest side 2 m | tris S1<=1200, S2<=3500
W202 | P2 | NEW | THINGS | Garden gnomes (x3) | longest side 0.6 m | tris S1<=500, S2<=2000
W203 | P2 | NEW | THINGS | Wreath and door knocker | longest side 0.6 m | tris S1<=500, S2<=2000
W205 | P2 | ADAPT | THINGS | Jack-o-lanterns and cobwebs | longest side 0.8 m | tris S1<=500, S2<=2000 | note: Halloween
W206 | P2 | NEW | THINGS | Porch swing and rocking chair | longest side 1.5 m | tris S1<=1200, S2<=3500
W207 | P2 | ADAPT | THINGS | Barbecue grill and picnic table | longest side 1.5 m | tris S1<=1200, S2<=3500
W209 | P2 | NEW | THINGS | Wheelbarrow and rake | longest side 1.2 m | tris S1<=500, S2<=2000
W211 | P2 | NEW | THINGS | Chimney with smoke | longest side 2 m | tris S1<=1200, S2<=3500 | note: drives wind cue
W212 | P2 | NEW | THINGS | Weathervane (rooster) | longest side 1.2 m | tris S1<=500, S2<=2000 | note: diegetic wind cue
W217 | P2 | NEW | THINGS | Stone memorial plaque | longest side 0.6 m | tris S1<=500, S2<=2000
W219 | P2 | NEW | THINGS | Bandstand with bunting | longest side 6 m | tris S1<=2500, S2<=7000
W220 | P2 | ADAPT | THINGS | Railway signal and semaphore | longest side 5 m | tris S1<=1200, S2<=3500
W221 | P2 | NEW | THINGS | Platform clock and timetable board | longest side 2 m | tris S1<=1200, S2<=3500
W222 | P2 | NEW | THINGS | Pond dock and boat ramp | longest side 6 m | tris S1<=2500, S2<=7000
W224 | P2 | ADAPT | THINGS | Stone bridge arch pieces | longest side 12 m | tris S1<=2500, S2<=7000
W231 | P2 | NEW | THINGS | Scarecrow | longest side 2 m | tris S1<=1200, S2<=3500
W236 | P2 | ADAPT | ANIMALS | Dog (husky) | longest side 0.7 m | tris S1<=1500, S2<=4000
W237 | P2 | ADAPT | ANIMALS | Dog (corgi) | longest side 0.5 m | tris S1<=1500, S2<=4000
W238 | P2 | ADAPT | ANIMALS | Puppy | longest side 0.3 m | tris S1<=600, S2<=1500
W240 | P2 | ADAPT | ANIMALS | Black cat | longest side 0.4 m | tris S1<=600, S2<=1500 | note: Halloween
W243 | P2 | NEW | ANIMALS | Rabbit | longest side 0.4 m | tris S1<=600, S2<=1500
W245 | P2 | NEW | ANIMALS | Chipmunk | longest side 0.15 m | tris S1<=600, S2<=1500
W246 | P2 | NEW | ANIMALS | Cottontail rabbit | longest side 0.35 m | tris S1<=600, S2<=1500
W252 | P2 | NEW | ANIMALS | Great blue heron | longest side 1.2 m | tris S1<=1500, S2<=4000
W253 | P2 | NEW | ANIMALS | Red-tailed hawk | longest side 0.6 m | tris S1<=1500, S2<=4000
W254 | P2 | NEW | ANIMALS | Barred owl | longest side 0.5 m | tris S1<=1500, S2<=4000 | note: night
W256 | P2 | NEW | ANIMALS | Blue jay | longest side 0.25 m | tris S1<=600, S2<=1500
W257 | P2 | NEW | ANIMALS | Robin | longest side 0.2 m | tris S1<=600, S2<=1500 | note: first sign of spring
W258 | P2 | NEW | ANIMALS | Crow | longest side 0.5 m | tris S1<=1500, S2<=4000
W259 | P2 | ADAPT | ANIMALS | Seagull at the lake | longest side 0.5 m | tris S1<=1500, S2<=4000
W262 | P2 | NEW | ANIMALS | Red fox | longest side 0.8 m | tris S1<=1500, S2<=4000
W263 | P2 | NEW | ANIMALS | Raccoon | longest side 0.6 m | tris S1<=1500, S2<=4000 | note: night bin raider
W270 | P2 | NEW | ANIMALS | Bass and sunfish (pond) | longest side 0.4 m | tris S1<=600, S2<=1500
W271 | P2 | NEW | ANIMALS | Dragonfly and butterflies | longest side 0.1 m | tris S1<=600, S2<=1500
W279 | P2 | NEW | ANIMALS | Pig | longest side 1.2 m | tris S1<=1500, S2<=4000
W283 | P2 | NEW | ANIMALS | Farm duck | longest side 0.5 m | tris S1<=1500, S2<=4000
W285 | P2 | NEW | ANIMALS | Rooster | longest side 0.5 m | tris S1<=1500, S2<=4000 | note: morning cue
W286 | P2 | ADAPT | ANIMALS | Sheepdog (border collie) | longest side 0.6 m | tris S1<=1500, S2<=4000
W012 | P3 | NEW | PLACES | Police station | longest side 14 m | tris S1<=3000, S2<=9000 | note: PG, friendly: lost-and-found bell
W015 | P3 | NEW | PLACES | Bank with columns | longest side 14 m | tris S1<=3000, S2<=9000
W020 | P3 | NEW | PLACES | Barber shop (striped pole) | longest side 8 m | tris S1<=3000, S2<=9000
W021 | P3 | NEW | PLACES | Dentist and doctor offices | longest side 10 m | tris S1<=3000, S2<=9000 | note: doctors waving sprite already exists
W029 | P3 | NEW | PLACES | Parking lot behind shops | longest side 20 m | tris S1<=3000, S2<=9000 | note: toy cars live here
W036 | P3 | ADAPT | PLACES | Lookout rock | longest side 5 m | tris S1<=1500, S2<=4000 | note: good place for the drone to land
W060 | P3 | ADAPT | PLACES | Stone arch gateway into the Square | longest side 8 m | tris S1<=3000, S2<=9000
W061 | P3 | NEW | PLACES | Storm drain and fire hydrant corner | longest side 2 m | tris S1<=1500, S2<=4000
W078 | P3 | NEW | PEOPLE | Scientist | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: parked with the lab
W085 | P3 | NEW | PEOPLE | Butcher / deli worker | longest side 1.7 m | tris S1<=2500, S2<=6000
W089 | P3 | NEW | PEOPLE | Bus driver | longest side 1.8 m | tris S1<=2500, S2<=6000
W092 | P3 | NEW | PEOPLE | Garbage collector | longest side 1.8 m | tris S1<=2500, S2<=6000
W093 | P3 | NEW | PEOPLE | Road crew worker with cone | longest side 1.8 m | tris S1<=2500, S2<=6000
W095 | P3 | NEW | PEOPLE | Lifeguard at the pond | longest side 1.8 m | tris S1<=2500, S2<=6000
W103 | P3 | NEW | PEOPLE | Marching band kid | longest side 1.5 m | tris S1<=2500, S2<=6000 | note: Halloween/parade event
W110 | P3 | NEW | PEOPLE | Painter with an easel on the common | longest side 1.7 m | tris S1<=2500, S2<=6000
W116 | P3 | NEW | PEOPLE | Tourist with camera | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: Evan with the drone, as a cameo
W117 | P3 | NEW | PEOPLE | Santa / seasonal costume wearers | longest side 1.8 m | tris S1<=2500, S2<=6000 | note: Halloween thread
W119 | P3 | NEW | PEOPLE | Wedding couple | longest side 1.8 m | tris S1<=2500, S2<=6000
W131 | P3 | NEW | THINGS | Drinking fountain | longest side 1.2 m | tris S1<=500, S2<=2000
W133 | P3 | NEW | THINGS | Bollard and chain | longest side 0.8 m | tris S1<=500, S2<=2000
W134 | P3 | NEW | THINGS | Newspaper box | longest side 1 m | tris S1<=500, S2<=2000
W137 | P3 | NEW | THINGS | Phone booth (retired, now a book swap) | longest side 2.4 m | tris S1<=1200, S2<=3500
W145 | P3 | NEW | THINGS | Ambulance | longest side 6 m | tris S1<=2500, S2<=7000
W149 | P3 | NEW | THINGS | Garbage truck | longest side 8 m | tris S1<=2500, S2<=7000
W157 | P3 | NEW | THINGS | Snow plow | longest side 6 m | tris S1<=2500, S2<=7000 | note: winter event
W177 | P3 | NEW | THINGS | Ivy on brick | longest side 2 m | tris S1<=1200, S2<=3500
W178 | P3 | ADAPT | THINGS | Compost heap | longest side 1.5 m | tris S1<=1200, S2<=3500
W192 | P3 | NEW | THINGS | Hopscotch grid | longest side 2 m | tris S1<=1200, S2<=3500
W208 | P3 | NEW | THINGS | Clothesline with laundry | longest side 3 m | tris S1<=1200, S2<=3500
W214 | P3 | ADAPT | THINGS | Satellite dish and antenna | longest side 1 m | tris S1<=500, S2<=2000
W215 | P3 | ADAPT | THINGS | Basement window wells | longest side 1 m | tris S1<=500, S2<=2000
W223 | P3 | NEW | THINGS | Dam and weir | longest side 10 m | tris S1<=2500, S2<=7000 | note: river hex
W225 | P3 | NEW | THINGS | Library book return drop | longest side 1.2 m | tris S1<=500, S2<=2000
W227 | P3 | NEW | THINGS | Community garden plots | longest side 6 m | tris S1<=2500, S2<=7000
W232 | P3 | NEW | THINGS | Windmill (small) | longest side 6 m | tris S1<=2500, S2<=7000
W241 | P3 | NEW | ANIMALS | Hamster and guinea pig | longest side 0.15 m | tris S1<=600, S2<=1500
W242 | P3 | NEW | ANIMALS | Goldfish bowl | longest side 0.3 m | tris S1<=600, S2<=1500
W251 | P3 | NEW | ANIMALS | Swan | longest side 1.2 m | tris S1<=1500, S2<=4000
W261 | P3 | NEW | ANIMALS | Hummingbird | longest side 0.1 m | tris S1<=600, S2<=1500
W264 | P3 | NEW | ANIMALS | Skunk (cartoon-friendly) | longest side 0.5 m | tris S1<=1500, S2<=4000
W265 | P3 | NEW | ANIMALS | Opossum | longest side 0.5 m | tris S1<=1500, S2<=4000
W266 | P3 | NEW | ANIMALS | Coyote at the edge of the Fells | longest side 1 m | tris S1<=1500, S2<=4000
W269 | P3 | NEW | ANIMALS | Garter snake | longest side 0.5 m | tris S1<=1500, S2<=4000
W273 | P3 | NEW | ANIMALS | Bumblebee | longest side 0.05 m | tris S1<=600, S2<=1500
W274 | P3 | NEW | ANIMALS | Bat | longest side 0.2 m | tris S1<=600, S2<=1500 | note: Halloween
W281 | P3 | NEW | ANIMALS | Alpaca | longest side 1.8 m | tris S1<=1500, S2<=4000
W284 | P3 | NEW | ANIMALS | Highland cow | longest side 1.8 m | tris S1<=1500, S2<=4000
