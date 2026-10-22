// The starter library: every situation a kids' world-builder is likely to need a sound for, so nobody has to
// decide up front. pick.mjs fills each slot with the best take it can find in the Sonniss index; anything
// missing can be searched for later (search.mjs) and added here.
//
// One line per slot:  id | Name | search terms | options
//   search terms: alternatives separated by ",", each alternative's words must all appear in the file's path
//   options: kind (ambience | animal | effect | ui | music), n (takes to keep), len (max seconds), cat (UCS
//   categories that earn a bonus), not (words that rule a file out)
// Groups are the "## Heading" lines. Kind defaults per group and can be overridden per line with k=.

const SPEC = `
## Farm animals | animal
rooster | Rooster crowing | rooster crow, rooster, cockerel | len=5 cat=Birds
hen | Hen clucking | hen cluck, chicken cluck, hen, chicken | n=2 cat=Birds
chicks | Chicks peeping | chick peep, chicks, baby chicken | cat=Birds
cow | Cow mooing | cow moo, cow, cattle moo | n=2 cat=Animals
calf | Calf calling | calf | cat=Animals
horse-whinny | Horse whinny | horse whinny, horse neigh, whinny, neigh | n=2 cat=Animals
horse-snort | Horse snort | horse snort, horse blow | cat=Animals
horse-gallop | Horse galloping | gallop, horse hooves gallop | k=effect len=6 cat=Animals
horse-trot | Horse trotting | trot, horse hooves walk, hooves | k=effect len=6 cat=Animals
pig | Pig grunting | pig grunt, pig oink, pig | n=2 cat=Animals
piglet | Piglet squeal | piglet, pig squeal | cat=Animals
sheep | Sheep baa | sheep baa, sheep bleat, sheep | n=2 cat=Animals
lamb | Lamb bleat | lamb | cat=Animals
goat | Goat bleat | goat bleat, goat | n=2 cat=Animals
donkey | Donkey bray | donkey bray, donkey | cat=Animals
duck | Duck quacking | duck quack, duck | n=2 cat=Birds
goose | Goose honking | goose honk, goose | cat=Birds
turkey | Turkey gobble | turkey gobble, turkey | cat=Birds
dog-bark | Dog barking | dog bark, dog | n=2 cat=Animals
dog-whine | Dog whining | dog whine, dog whimper | cat=Animals
puppy | Puppy yapping | puppy | cat=Animals
dog-pant | Dog panting | dog pant | cat=Animals
cat-meow | Cat meowing | cat meow, meow | n=2 cat=Animals
cat-purr | Cat purring | cat purr, purr | len=6 cat=Animals
kitten | Kitten mewing | kitten | cat=Animals
cat-hiss | Cat hissing | cat hiss | cat=Animals
mouse | Mouse squeak | mouse squeak, mice, rat squeak | cat=Animals
bee | Bee buzzing | bee buzz, bee, bumblebee | len=5 cat=Animals
fly | Fly buzzing | fly buzz, housefly, fly insect | len=5 cat=Animals
mosquito | Mosquito whine | mosquito | len=4 cat=Animals

## Wild animals | animal
wolf | Wolf howl | wolf howl, wolf | len=7 cat=Animals
owl | Owl hooting | owl hoot, owl | n=2 cat=Birds
crow | Crow cawing | crow caw, crow, raven | cat=Birds
seagull | Seagulls | seagull, gull | cat=Birds
songbird | Songbird chirp | songbird, bird chirp, bird song, blackbird, robin | n=2 cat=Birds
woodpecker | Woodpecker | woodpecker | cat=Birds
hawk | Hawk screech | hawk, eagle, falcon, raptor | cat=Birds
parrot | Parrot squawk | parrot, macaw, cockatoo | cat=Birds
frog | Frog croak | frog, toad | n=2 cat=Animals
cricket | Cricket chirp | cricket | len=4 cat=Animals
cicada | Cicadas | cicada | len=5 cat=Animals
bear | Bear growl | bear growl, bear | cat=Animals
lion | Lion roar | lion roar, lion | cat=Animals
tiger | Tiger growl | tiger | cat=Animals
elephant | Elephant trumpet | elephant | cat=Animals
monkey | Monkey chatter | monkey, chimp, primate | cat=Animals
gorilla | Gorilla | gorilla | cat=Animals
snake | Snake hiss | snake hiss, snake, rattlesnake | cat=Animals
whale | Whale song | whale | len=8 cat=Animals
dolphin | Dolphin clicks | dolphin | cat=Animals
bat | Bat squeaks | bat squeak, bats | cat=Animals
fox | Fox call | fox | cat=Animals
coyote | Coyote yips | coyote | cat=Animals
hyena | Hyena laugh | hyena | cat=Animals
squirrel | Squirrel chatter | squirrel | cat=Animals
deer | Deer call | deer, stag, elk | cat=Animals
wings | Bird wings flapping | wing flap, wings, pigeon flap, bird flutter | k=effect cat=Birds
flock | Flock taking off | flock, birds take off, birds fly away | k=effect len=5 cat=Birds

## Creatures | animal
dragon-roar | Dragon roar | dragon roar, dragon | len=6 cat=Creatures
monster-growl | Monster growl | monster growl, monster, beast growl | n=2 cat=Creatures
zombie | Zombie groan | zombie | n=2 cat=Creatures
ghost | Ghost moan | ghost, spirit moan, phantom | len=6 cat=Creatures
goblin | Goblin chatter | goblin, imp, gremlin | cat=Creatures
giant-steps | Giant footsteps | giant footstep, giant step, stomp heavy | k=effect len=4 cat=Creatures
slime | Slime squelch | slime, goo, squelch | k=effect cat=Creatures
swarm | Insect swarm | swarm, insects | len=5 cat=Creatures
alien | Alien chatter | alien | cat=Creatures,Sci-fi

## Ambiences | ambience
farm-day | Farm by day | farm day, farmyard, barnyard, farm | len=45 cat=Ambience
farm-morning | Farm morning birds | dawn chorus, morning birds, farm morning, birds morning | len=45 cat=Ambience,Birds
countryside-evening | Countryside evening | evening crickets, crickets evening, countryside evening, dusk | len=45 cat=Ambience
night-insects | Night insects | night insects, crickets night, night crickets, crickets | len=45 cat=Ambience
forest-day | Forest by day | forest day, forest birds, woodland, forest | len=45 cat=Ambience
forest-night | Forest at night | forest night, woods night, night forest | len=45 cat=Ambience
jungle | Jungle | jungle, rainforest | len=45 cat=Ambience
swamp | Swamp | swamp, marsh, bayou, wetland | len=45 cat=Ambience
desert | Desert wind | desert | len=45 cat=Ambience,Wind
beach | Beach waves | beach waves, beach, shore waves, surf | len=45 cat=Ambience,Water
ocean | Calm ocean | ocean calm, ocean, sea calm, sea | len=45 cat=Ambience,Water
harbor | Harbour | harbor, harbour, port, marina | len=45 cat=Ambience
underwater | Underwater | underwater | len=45 cat=Ambience,Water
river | River | river, stream, creek, brook | len=45 cat=Ambience,Water
waterfall | Waterfall | waterfall | len=45 cat=Water
lake | Lake shore | lake, lapping, pond | len=45 cat=Ambience,Water
cave | Cave drips | cave drip, cave, cavern | len=45 cat=Ambience
mountain | Mountain wind | mountain wind, mountain, alpine | len=45 cat=Ambience,Wind
snowy | Snowy wind | blizzard, snow wind, winter wind, arctic | len=45 cat=Wind,Ambience
meadow | Summer meadow | meadow, field summer, grassland, summer | len=45 cat=Ambience
city-street | City street | city street, street traffic, city, urban | len=45 cat=Ambience
city-park | City park | park birds, city park, park | len=45 cat=Ambience
traffic | Distant traffic | traffic distant, distant traffic, traffic | len=45 cat=Ambience
market | Market crowd | market, bazaar | len=45 cat=Ambience,Crowds
cafe | Cafe | cafe, restaurant, coffee shop | len=45 cat=Ambience,Crowds
playground | School playground | playground, schoolyard, children playing, kids playing | len=45 cat=Ambience,Crowds
castle | Castle courtyard | castle, courtyard, medieval | len=45 cat=Ambience
village | Medieval village | village, medieval town, medieval | len=45 cat=Ambience
tavern | Tavern | tavern, pub, inn | len=45 cat=Ambience,Crowds
church | Church interior | church, cathedral | len=45 cat=Ambience
library | Quiet library | library | len=45 cat=Ambience
room-tone | House room tone | room tone, roomtone, house interior, interior quiet | len=45 cat=Ambience
kitchen | Kitchen | kitchen | len=45 cat=Ambience
fireplace | Fireplace | fireplace | len=45 cat=Fire
campfire | Campfire | campfire, bonfire, fire crackle | len=45 cat=Fire
spaceship | Spaceship hum | spaceship interior, spaceship, starship, space ship | len=45 cat=Sci-fi,Ambience
space-station | Space station | space station, sci-fi ambience, scifi ambience | len=45 cat=Sci-fi,Ambience
lab | Sci-fi lab | laboratory, lab, computer room, server room | len=45 cat=Ambience,Sci-fi
factory | Factory | factory, industrial, machinery | len=45 cat=Ambience,Machines
construction | Construction site | construction site, construction | len=45 cat=Ambience
airport | Airport | airport, terminal | len=45 cat=Ambience
station | Train station | train station, railway station, station | len=45 cat=Ambience
subway | Subway | subway, metro, underground train | len=45 cat=Ambience
haunted | Haunted house | haunted, creepy, spooky, horror ambience | len=45 cat=Ambience,Designed
graveyard | Graveyard at night | graveyard, cemetery | len=45 cat=Ambience
carnival | Fairground | carnival, fairground, funfair, amusement | len=45 cat=Ambience,Crowds
stadium | Stadium crowd | stadium, arena crowd | len=45 cat=Crowds
office | Office | office | len=45 cat=Ambience
farm-animals | Farmyard animals | farm animals, barnyard animals, livestock | len=45 cat=Animals,Ambience
moon | Moon surface | space ambience, space drone, void, deep space | len=45 cat=Sci-fi,Designed

## Weather | ambience
rain-light | Light rain | light rain, rain light, drizzle, rain soft | len=45 cat=Rain
rain-heavy | Heavy rain | heavy rain, rain heavy, downpour | len=45 cat=Rain
rain-roof | Rain on a roof | rain roof, rain on roof, rain tin | len=45 cat=Rain
rain-window | Rain on a window | rain window, rain glass | len=45 cat=Rain
rain-tent | Rain on a tent | rain tent, rain canvas, rain umbrella | len=45 cat=Rain
thunder | Thunder | thunder | k=effect n=3 len=10 cat=Weather
storm | Thunderstorm | thunderstorm, storm | len=45 cat=Weather,Rain
wind-gentle | Gentle wind | wind gentle, wind light, breeze, wind soft | len=45 cat=Wind
wind-strong | Strong wind | wind strong, strong wind, wind howl, gale | len=45 cat=Wind
gust | Wind gust | wind gust, gust | k=effect n=2 len=6 cat=Wind
hail | Hail | hail | len=45 cat=Weather
wind-trees | Wind in the trees | wind trees, wind leaves, wind foliage, wind forest | len=45 cat=Wind,Vegetation

## Water | effect
splash-small | Small splash | splash small, small splash, splash | n=2 cat=Water
splash-big | Big splash | splash big, big splash, large splash, body splash | cat=Water
drip | Water drip | drip, droplet | n=2 cat=Water
bubbles | Bubbles | bubbles, bubbling, bubble | len=4 cat=Water
pour | Pouring water | pour water, pouring, pour | len=5 cat=Water,Liquid and mud
wave-crash | Wave crash | wave crash, wave impact, wave | len=6 cat=Water
fountain | Fountain | fountain | k=ambience len=45 cat=Water
faucet | Running tap | faucet, tap water, sink | len=5 cat=Water
swim | Swimming | swim, swimming, paddle | len=5 cat=Water
dive | Dive in | dive, jump in water | cat=Water
puddle | Puddle step | puddle | n=2 cat=Water,Footsteps
gulp | Gulping a drink | gulp, drink, slurp | cat=Food and drink,Human

## Fire and bangs | effect
torch | Torch whoosh | torch, flame whoosh, fire whoosh | cat=Fire
match | Match strike | match strike, match | cat=Fire
ignite | Fire ignites | ignite, ignition, fire start | cat=Fire
fireball | Fireball | fireball | cat=Fire,Magic
extinguish | Fire put out | extinguish, sizzle, hiss steam | cat=Fire
explosion-small | Small explosion | explosion small, small explosion, pop explosion | len=4 cat=Explosions
explosion-big | Big explosion | explosion big, big explosion, explosion large, explosion | len=6 cat=Explosions
firework-launch | Firework launch | firework launch, rocket firework, firework whistle | cat=Fireworks
firework-burst | Firework burst | firework burst, firework explosion, fireworks, firework | n=2 len=5 cat=Fireworks
cannon | Cannon | cannon | len=5 cat=Weapons,Explosions

## Footsteps | effect
step-grass | Footsteps on grass | footstep grass, footsteps grass, grass step, walk grass | n=4 len=1.2 cat=Footsteps
step-dirt | Footsteps on dirt | footstep dirt, footsteps dirt, dirt step, walk dirt | n=4 len=1.2 cat=Footsteps
step-gravel | Footsteps on gravel | footstep gravel, footsteps gravel, gravel step, walk gravel | n=4 len=1.2 cat=Footsteps
step-wood | Footsteps on wood | footstep wood, footsteps wood, wood step, walk wood, wooden floor | n=4 len=1.2 cat=Footsteps
step-stone | Footsteps on stone | footstep stone, footsteps stone, stone step, walk stone | n=4 len=1.2 cat=Footsteps
step-concrete | Footsteps on concrete | footstep concrete, footsteps concrete, concrete step | n=4 len=1.2 cat=Footsteps
step-snow | Footsteps in snow | footstep snow, footsteps snow, snow step, snow crunch | n=4 len=1.2 cat=Footsteps,Snow
step-sand | Footsteps on sand | footstep sand, footsteps sand, sand step | n=4 len=1.2 cat=Footsteps
step-mud | Footsteps in mud | footstep mud, footsteps mud, mud step | n=4 len=1.2 cat=Footsteps,Liquid and mud
step-metal | Footsteps on metal | footstep metal, footsteps metal, metal step | n=4 len=1.2 cat=Footsteps
step-leaves | Footsteps in leaves | footstep leaves, footsteps leaves, leaves step | n=4 len=1.2 cat=Footsteps,Vegetation
step-carpet | Footsteps on carpet | footstep carpet, footsteps carpet, carpet | n=4 len=1.2 cat=Footsteps
run-grass | Running on grass | run grass, running grass, run dirt | len=4 cat=Footsteps
hooves-cobble | Hooves on cobbles | hooves cobble, horse cobble, hoof stone | len=5 cat=Footsteps,Animals
jump-land | Jump and land | jump land, landing, land jump | n=2 cat=Footsteps,Foley

## Doors and containers | effect
door-open | Wooden door opens | door open wood, wood door open, door open | cat=Doors
door-close | Wooden door closes | door close wood, wood door close, door close, door slam | cat=Doors
door-creak | Door creak | door creak, creak door, creaky door | len=4 cat=Doors
knock | Knock on a door | knock, door knock | cat=Doors
lock | Lock and key | lock, unlock, key turn | cat=Doors
metal-door | Metal door | metal door, steel door, iron door | cat=Doors
sliding-door | Sliding door | sliding door, slide door | cat=Doors
gate | Gate creak | gate creak, gate, fence gate | len=4 cat=Doors
chest | Treasure chest opens | chest open, chest, trunk open | cat=Objects,Wood
drawer | Drawer | drawer | cat=Drawers
window | Window opens | window open, window | cat=Windows
cupboard | Cupboard | cupboard, cabinet | cat=Doors,Drawers
doorbell | Doorbell | doorbell, door bell | cat=Bells
barn-door | Barn door | barn door, large door, sliding wood door | len=4 cat=Doors

## Building and tools | effect
hammer | Hammering a nail | hammer nail, hammering, hammer | n=2 cat=Tools
saw | Sawing wood | saw wood, hand saw, sawing, saw | len=4 cat=Tools
drill | Drill | drill | len=4 cat=Tools
axe | Chopping wood | chop wood, axe chop, axe, chopping | n=2 cat=Tools,Wood
shovel | Digging | shovel dig, digging, dig, shovel | n=2 cat=Tools,Dirt and sand
place-wood | Place a wooden piece | wood impact, wood place, wood plank drop, wood hit | n=3 len=1 cat=Wood
place-stone | Place a stone | stone impact, stone place, rock impact, stone hit | n=3 len=1 cat=Rocks
place-brick | Place a brick | brick, block place, cinder block | n=2 len=1 cat=Rocks
chisel | Chisel | chisel, carving | cat=Tools
ratchet | Wrench ratchet | ratchet, wrench | cat=Tools
pickaxe | Pickaxe on rock | pickaxe, mining, pick axe | n=2 cat=Tools,Rocks
anvil | Anvil | anvil, blacksmith, forge hammer | n=2 cat=Metal,Tools
broom | Sweeping | broom, sweep, sweeping | len=4 cat=Foley
tree-fall | Tree falls | tree fall, tree falling, timber | len=6 cat=Wood,Destruction
branch-snap | Branch snaps | branch snap, stick snap, twig snap, wood snap | cat=Wood,Vegetation
build-complete | Building finished | construction complete, build complete, success fanfare, completion | k=ui len=3 cat=User interface,Musical

## Objects | effect
pickup | Pick something up | pickup, pick up, item pickup, grab | n=2 len=1 cat=Foley,User interface,Games
drop | Drop something | drop item, item drop, drop | n=2 len=1 cat=Foley,Objects
paper | Paper rustle | paper rustle, paper | cat=Paper
page-turn | Page turn | page turn, book page, page | cat=Paper
book-close | Book closes | book close, book slam, book | cat=Paper
cloth | Cloth rustle | cloth rustle, cloth, fabric | cat=Cloth
zipper | Zipper | zipper, zip | cat=Cloth
bag | Bag | bag, backpack, rucksack | cat=Cloth,Foley
coins | Coins jingle | coins, coin, money | n=2 cat=Metal,Objects
keys | Keys jingle | keys jingle, keys, keyring | cat=Metal,Objects
glass-clink | Glasses clink | glass clink, clink, cheers glass | cat=Glass
glass-break | Glass breaks | glass break, glass shatter, shatter | cat=Glass,Destruction
plate | Plate set down | plate, dish, ceramic | cat=Ceramics
cup | Cup set down | cup, mug | cat=Ceramics,Objects
bottle | Bottle | bottle | cat=Glass
cork | Cork pop | cork pop, cork, champagne | cat=Glass,Objects
box | Cardboard box | cardboard box, cardboard, box | cat=Paper,Objects
rope | Rope creak | rope creak, rope | cat=Rope
chain | Chain rattle | chain rattle, chain | cat=Chains
clock | Clock ticking | clock tick, ticking, clock | len=5 cat=Clocks
alarm-clock | Alarm clock | alarm clock | len=4 cat=Clocks,Alarms
phone | Phone ringing | phone ring, telephone ring, phone | len=5 cat=Communications
camera | Camera shutter | camera shutter, shutter, camera | cat=Equipment
typewriter | Typewriter | typewriter | len=4 cat=Equipment
keyboard | Keyboard typing | keyboard typing, typing, keyboard | len=4 cat=Computers
switch | Light switch | light switch, switch | cat=Electricity,Objects
lever | Lever pull | lever | cat=Mechanical
balloon | Balloon pop | balloon pop, balloon | cat=Toys,Objects
squeak-toy | Squeaky toy | squeak toy, squeaky toy, dog toy, rubber squeak | cat=Toys,Rubber
music-box | Music box | music box | k=music len=8 cat=Musical,Toys
whistle | Whistle blow | whistle blow, referee whistle, whistle | cat=Sports,Musical
party-horn | Party horn | party horn, party blower, noisemaker | cat=Toys
crunch | Crunchy bite | crunch bite, apple bite, bite, crunch | n=2 cat=Food and drink
eat | Eating | eating, chewing, chew | cat=Food and drink
sizzle | Frying pan sizzle | frying, sizzle, fry | len=5 cat=Food and drink
rock-fall | Rocks falling | rock fall, rockfall, rocks tumble, rubble | len=5 cat=Rocks,Destruction
ice-crack | Ice cracking | ice crack, ice | cat=Ice
wood-creak | Wood creak | wood creak, creak | cat=Wood
leaves | Leaves rustle | leaves rustle, leaves, bush rustle, foliage | cat=Vegetation
mud | Mud squelch | mud, squelch | cat=Liquid and mud

## Vehicles | effect
car-start | Car starts | car start, engine start, ignition car | len=5 cat=Vehicles
car-pass | Car passes | car pass, car by, car drive by | len=6 cat=Vehicles
car-horn | Car horn | car horn, horn honk, honk | cat=Vehicles,Horns
truck | Truck | truck | len=6 cat=Vehicles
tractor | Tractor | tractor | len=8 cat=Vehicles
motorbike | Motorbike | motorcycle, motorbike, scooter | len=6 cat=Vehicles
bike-bell | Bicycle bell | bicycle bell, bike bell | cat=Bells
bike | Bicycle | bicycle, bike | len=5 cat=Vehicles
bus | Bus | bus | len=6 cat=Vehicles
train-pass | Train passes | train pass, train by, train | len=8 cat=Trains
train-whistle | Train whistle | train whistle, train horn, steam whistle | len=4 cat=Trains,Horns
steam-train | Steam train | steam train, steam locomotive, locomotive | len=8 cat=Trains
plane | Aeroplane flyby | airplane, aeroplane, plane flyby, jet | len=8 cat=Aircraft
helicopter | Helicopter | helicopter | len=8 cat=Aircraft
boat-motor | Motor boat | motor boat, motorboat, outboard | len=8 cat=Boats
sailboat | Sailboat creaks | sailboat, sailing, ship creak, mast | len=8 cat=Boats
oars | Rowing | rowing, oars, oar | len=5 cat=Boats
rocket | Rocket launch | rocket launch, rocket, launch | len=8 cat=Sci-fi,Aircraft
spaceship-flyby | Spaceship flyby | spaceship flyby, spaceship pass, ship flyby, sci-fi flyby | len=6 cat=Sci-fi
ufo | UFO hover | ufo, flying saucer, hover | len=6 cat=Sci-fi
rover | Moon buggy motor | rover, rc car, electric motor, servo motor | len=6 cat=Motors,Sci-fi
police | Police siren | police siren, siren police, police | len=6 cat=Alarms,Vehicles
ambulance | Ambulance siren | ambulance, siren | len=6 cat=Alarms,Vehicles
fire-truck | Fire engine | fire truck, fire engine | len=6 cat=Vehicles,Alarms
cart | Wooden cart | cart, wagon, wheelbarrow | len=5 cat=Vehicles,Wood

## Magic | effect
spell | Casting a spell | spell cast, cast spell, spell | n=2 cat=Magic
sparkle | Sparkle | sparkle, shimmer, glitter, twinkle | n=2 cat=Magic
magic-chime | Magic chime | magic chime, chime magic, enchant | cat=Magic,Bells
teleport | Teleport | teleport | cat=Magic,Sci-fi
heal | Healing | heal, healing | cat=Magic
power-up | Power up | power up, powerup | cat=Magic,Games
magic-whoosh | Magic whoosh | magic whoosh, magical whoosh | cat=Magic,Whooshes
portal | Portal | portal, vortex | len=5 cat=Magic,Sci-fi
fairy | Fairy dust | fairy, pixie | cat=Magic
potion | Bubbling potion | potion, cauldron, bubbling | len=5 cat=Magic,Liquid and mud
freeze | Freeze spell | freeze, frost, ice spell | cat=Magic,Ice
lightning | Lightning zap | lightning, zap, electric zap | cat=Electricity,Magic

## Sci-fi | effect
laser-shot | Laser shot | laser shot, laser blast, blaster, laser | n=2 cat=Lasers,Sci-fi
laser-beam | Laser beam | laser beam, beam | len=4 cat=Lasers,Sci-fi
force-field | Force field | force field, shield, forcefield | len=4 cat=Sci-fi
beep | Computer beep | computer beep, beep | n=2 cat=Beeps,Computers
robot | Robot moving | robot movement, robot, servo | n=2 cat=Robots,Mechanical
scanner | Scanner | scanner, scan | cat=Sci-fi,Computers
hologram | Hologram | hologram, holo | cat=Sci-fi
scifi-door | Sci-fi door | sci-fi door, scifi door, spaceship door, airlock | cat=Sci-fi,Doors
power-down | Power down | power down, powerdown, shut down | cat=Sci-fi,Electricity
energy-hum | Energy hum | energy hum, hum, electrical hum | k=ambience len=30 cat=Electricity,Sci-fi
warp | Warp jump | warp, hyperspace | cat=Sci-fi
airlock | Airlock hiss | airlock, pressure hiss, air release | cat=Sci-fi,Air
radio | Radio static | radio static, static, radio | cat=Communications
meteor | Meteor impact | meteor, meteorite, impact | len=5 cat=Explosions,Designed

## Adventure and battles | effect
sword-swing | Sword swing | sword swing, sword whoosh, blade swing | n=2 cat=Weapons,Whooshes
sword-clash | Swords clash | sword clash, sword hit, sword impact, metal clash | n=2 cat=Weapons,Metal
sword-draw | Sword drawn | sword draw, unsheathe, sword unsheath | cat=Weapons
shield | Shield block | shield block, shield hit, shield | cat=Weapons,Metal
bow | Bow shot | bow shot, bow release, arrow shot, bow | cat=Weapons
arrow-hit | Arrow hits | arrow hit, arrow impact, arrow | cat=Weapons
armour | Armour clank | armor, armour, chainmail | cat=Metal,Foley
catapult | Catapult | catapult, trebuchet | len=5 cat=Weapons,Wood
punch | Cartoon punch | punch, hit body, impact punch | n=2 cat=Fight
war-drum | War drums | war drum, drums, drum | k=music len=8 cat=Musical
horn-call | Horn call | war horn, horn call, hunting horn, horn | len=5 cat=Horns,Musical

## Cartoon | effect
boing | Boing | boing, spring | cat=Cartoon
bonk | Bonk | bonk, cartoon hit | cat=Cartoon
slide-up | Slide whistle up | slide whistle up, whistle up, slide whistle | cat=Cartoon
slide-down | Slide whistle down | slide whistle down, whistle down, falling whistle | cat=Cartoon
pop | Pop | pop | n=2 cat=Cartoon
zip | Zip away | cartoon zip, zip away, whizz | cat=Cartoon,Whooshes
wobble | Wobble | wobble, wobbly, jelly | cat=Cartoon
honk | Clown honk | clown horn, bike horn, squeeze horn, honk | cat=Cartoon,Horns
splat | Splat | splat | cat=Cartoon,Liquid and mud
whoosh | Whoosh | whoosh, swoosh, swish | n=3 cat=Whooshes
tada | Ta-da | tada, ta da, reveal | k=music cat=Musical,Cartoon

## People sounds | effect
cheer | Crowd cheers | crowd cheer, cheer | len=6 cat=Crowds
applause | Applause | applause, clapping crowd, clap | len=6 cat=Crowds
kids-laugh | Children laughing | children laugh, kids laugh, child laugh, kid laugh | n=2 cat=Human,Voices,Crowds
crowd-laugh | Crowd laughing | crowd laugh, audience laugh, laughter | len=5 cat=Crowds
gasp | Gasp | gasp | cat=Human,Voices
yawn | Yawn | yawn | cat=Human,Voices
sneeze | Sneeze | sneeze | cat=Human,Voices
cough | Cough | cough | cat=Human,Voices
clap | Hand clap | hand clap, clap | cat=Human
murmur | Crowd murmur | crowd murmur, walla, murmur | k=ambience len=45 cat=Crowds
baby-giggle | Baby giggle | baby giggle, baby laugh, baby | cat=Human,Voices
snore | Snore | snore, snoring | len=5 cat=Human,Voices
hum-tune | Whistling a tune | whistling, whistle tune | len=6 cat=Human,Musical
heartbeat | Heartbeat | heartbeat, heart beat | len=5 cat=Human

## Interface | ui
click | Click | ui click, button click, click | n=3 len=0.6 cat=User interface
tap | Soft tap | ui tap, tap, soft click | n=2 len=0.6 cat=User interface
hover | Hover | hover, ui hover, rollover | len=0.8 cat=User interface
open | Menu opens | menu open, ui open, open | len=1.2 cat=User interface
close | Menu closes | menu close, ui close, close | len=1.2 cat=User interface
confirm | Confirm | confirm, accept, ui positive, positive | n=2 len=1.5 cat=User interface
cancel | Cancel | cancel, back, ui negative, negative | len=1.2 cat=User interface
error | Error | error, wrong, fail, denied | len=1.5 cat=User interface
success | Success | success, correct, win, positive chime | n=2 len=2.5 cat=User interface,Musical
notify | Notification | notification, alert, message | n=2 len=1.5 cat=User interface
coin | Coin collect | coin collect, coin pickup, coin | n=2 len=1.2 cat=User interface,Games
level-up | Level up | level up, levelup, upgrade | len=3 cat=User interface,Games
achievement | Achievement | achievement, reward, bonus | len=3 cat=User interface,Games
select | Select | select, choose, ui select | len=0.8 cat=User interface
toggle | Toggle | toggle, switch ui, on off | len=0.8 cat=User interface
swipe | Swipe | swipe, slide, ui whoosh | len=0.8 cat=User interface,Whooshes
popup | Pop-up | popup, pop up, bubble pop | len=0.8 cat=User interface
countdown | Countdown beep | countdown, timer beep | len=1 cat=User interface,Beeps
tick | Timer tick | tick, ticker | len=0.6 cat=User interface,Clocks
type-blip | Typing blip | blip, text blip, dialogue blip | n=2 len=0.4 cat=User interface
unlock | Unlock | unlock, unlocked | len=2 cat=User interface
star | Star collect | star collect, star, collect | len=1.5 cat=User interface,Games
drag | Drag | drag | len=1 cat=User interface
place | Drop into place | drop, place, snap | n=2 len=0.8 cat=User interface

## Bells and music | music
church-bell | Church bell | church bell, bell toll | len=8 cat=Bells
school-bell | School bell | school bell, bell ring | len=5 cat=Bells
cowbell | Cowbell | cowbell, cow bell | cat=Bells
sleigh-bells | Sleigh bells | sleigh bells, jingle bells | len=5 cat=Bells
wind-chimes | Wind chimes | wind chimes, chimes | len=8 cat=Bells
gong | Gong | gong | len=8 cat=Bells,Musical
triangle | Triangle | triangle | cat=Musical
drum-roll | Drum roll | drum roll, snare roll | len=5 cat=Musical
cymbal | Cymbal crash | cymbal crash, cymbal | len=5 cat=Musical
harp | Harp glissando | harp gliss, harp | len=5 cat=Musical
xylophone | Xylophone | xylophone, glockenspiel, marimba | cat=Musical
win-sting | Win stinger | win stinger, victory, stinger positive, win | len=6 cat=Musical
lose-sting | Lose stinger | lose stinger, game over, fail stinger, lose | len=6 cat=Musical
fanfare | Fanfare | fanfare, trumpet | len=6 cat=Musical,Horns

## Machines | effect
windmill | Windmill creaking | windmill | len=8 cat=Wood,Mechanical
water-wheel | Water wheel | water wheel, watermill, mill | len=8 cat=Mechanical,Water
clock-tower | Clock tower chime | clock tower, big ben, clock chime | len=8 cat=Bells,Clocks
elevator | Lift | elevator, lift | len=6 cat=Machines
vacuum | Vacuum cleaner | vacuum | len=5 cat=Machines
washing | Washing machine | washing machine, dryer | len=6 cat=Machines
fan | Fan | fan | len=6 cat=Machines
generator | Generator | generator | len=6 cat=Machines,Motors
steam | Steam hiss | steam hiss, steam | cat=Machines,Air
conveyor | Conveyor belt | conveyor | len=6 cat=Machines
printer | Printer | printer | len=5 cat=Computers,Machines
press | Factory press | press, hydraulic, stamping | cat=Machines
pump | Pump | pump | len=5 cat=Machines
pulley | Pulley and winch | pulley, winch, crank | len=5 cat=Mechanical
gears | Gears turning | gears, cogs, gear mechanism | len=5 cat=Mechanical,Clocks
earthquake | Earthquake rumble | earthquake, rumble | len=8 cat=Natural disaster,Designed
volcano | Volcano | volcano, lava | len=8 cat=Natural disaster,Fire
avalanche | Avalanche | avalanche, landslide | len=8 cat=Natural disaster,Snow
`;

const GLOBAL_NOT = ['gore', 'blood', 'gunshot', 'rifle', 'pistol', 'shotgun', 'machine gun', 'torture', 'kill', 'death', 'dying', 'corpse', 'scream', 'vomit', 'pain', 'execution', 'war crime', 'sex', 'moan female', 'drunk', 'beer'];

export function parseLibrary(text = SPEC) {
  const slots = [];
  let group = null, kind = 'effect';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) { [group, kind] = line.slice(3).split('|').map(s => s.trim()); continue; }
    const [id, name, terms, opts = ''] = line.split('|').map(s => s.trim());
    const o = Object.fromEntries(opts.split(/\s+/).filter(Boolean).map(kv => kv.split('=')));
    const k = o.k || kind;
    slots.push({
      id, name, group, kind: k,
      loop: k === 'ambience',
      terms: terms.split(',').map(t => t.trim().toLowerCase().split(/\s+/).filter(Boolean)).filter(t => t.length),
      n: Number(o.n || 1),
      len: Number(o.len || (k === 'ambience' ? 45 : k === 'ui' ? 1.5 : k === 'music' ? 6 : 3)),
      cats: (o.cat || '').split(',').map(s => s.trim().replace(/_/g, ' ')).filter(Boolean),
      not: [...GLOBAL_NOT, ...(o.not || '').split(',').filter(Boolean)],
    });
  }
  return slots;
}

export const LIBRARY = parseLibrary();
