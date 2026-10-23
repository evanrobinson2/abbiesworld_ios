"""Writes catalogue.json: the 200 proposed Moon base FPS assets (AW-STUDY-0031). Edit the lists here, rerun."""
import json

G = {
 'exterior': ('Exterior structures and infrastructure', [
  'Solar array wing on a sun-tracking mast', 'Solar farm junction box', 'Landing pad with beacon ring', 'Landing pad floodlight mast',
  'Comms dish on a turntable', 'Relay mast (small, portable)', 'Regolith ore processor', 'Regolith conveyor segment',
  'Ice mining drill rig', 'Water ice tank (horizontal)', 'Oxygen tank farm (three upright tanks)', 'Fuel bowser for landers',
  'Pressurised connector tube, straight', 'Connector tube, elbow', 'Connector tube, T junction', 'Blast wall segment (sandbag regolith bags)',
  'Berm wall of bagged regolith', 'Radiator fin array', 'Power pylon with cable sag', 'Exterior airlock door',
  'Weather and dust sensor post', 'Seismometer station', 'Telescope dome (small observatory)', 'Greenhouse tunnel (exterior)',
  'Vehicle charging bay', 'Rover garage shed', 'Cargo container (shipping box, Moon spec)', 'Base tower and antenna',
  'Main dome, upgraded (from MR-002)', 'Habitat module and hangar'],
  'Dome, tower, habitat/hangar, airlock and supply crate were handed over by the Moon Heroes thread (2026-10-23): engineered recipes here, Meshy stays for heroes.'),
 'interior': ('Interior architecture kit (modular, 2 m grid)', [
  'Corridor segment, straight, ribbed', 'Corridor corner', 'Corridor T junction', 'Corridor end cap with porthole',
  'Bulkhead door, round pressure hatch', 'Sliding inner door with window slit', 'Floor grating tile', 'Floor plate tile (solid)',
  'Ceiling light strip panel', 'Wall panel, plain', 'Wall panel with pipe run', 'Wall panel with porthole window',
  'Wall panel with cable trays', 'Dome interior rib', 'Ladder and floor hatch', 'Short stair (four steps, low-g risers)',
  'Catwalk with railings', 'Mezzanine support column', 'Ramp with grip strips', 'Ceiling vent fan',
  'Pressure seal ring (between modules)', 'Inner airlock chamber shell', 'Decon shower arch (dust blower)', 'Suit-up alcove',
  'Window bay (big view of Earth)', 'Cupola observation bubble', 'Utility crawlspace panel', 'Wall-mounted handholds (low-g)',
  'Floor magnet boots strip', 'Elevator lift platform', 'Hab sleeping module shell', 'Lab module shell',
  'Workshop module shell', 'Galley module shell', 'Storage bay shell'],
  'Every piece snaps to a 2 m grid with doorway sockets.'),
 'furniture': ('Interior furniture and fixtures', [
  'Command console with three screens', 'Comms desk with radio and headset', 'Navigation map table', 'Pilot chair (swivel, harness)',
  'Bunk pod with privacy shutter', 'Footlocker', 'Galley table with bench', 'Food rehydrator', 'Galley cupboard',
  'Water dispenser', 'Hydroponics rack (three tiers)', 'Seed tray and grow lamp', 'Lab bench with microscope', 'Sample freezer',
  'Rock sample shelf', 'Workbench with vise', 'Tool pegboard', 'Suit rack with spare suit', 'Helmet shelf',
  'Patch-up station (first aid)', 'Exercise bike (bungee harness)', 'Treadmill (low-g harness)', 'Wash basin unit',
  'Laundry drum', 'Storage cubbies with labels', 'Bookshelf with storybooks', 'Abbie\'s drawing board', 'Board-game table',
  'Kitchen trash compactor', 'Recycling sorter'],
  'Sized for Abbie (4.5 heads) and Daddy (7.5 heads); seats at kid and adult height.'),
 'terrain': ('Terrain kit', [
  'Crater rim arc piece', 'Small crater bowl', 'Boulder set (three)', 'Rock ridge / cliff chunk', 'Rubble scatter',
  'Pebble decal patch', 'Regolith dune drift', 'Lava tube entrance', 'Lava tube tunnel segment', 'Skylight pit rim',
  'Rille (channel) segment', 'Shadowed ice patch', 'Ejecta ray decal', 'Fresh impact crater with glassy centre',
  'Mountain backdrop card (horizon)', 'Rock arch', 'Balanced rock', 'Overhang ledge (cover)', 'Slope ramp piece',
  'Crevasse bridge rocks'],
  'Matches the regolith grammar in simulations/moon/moon-regolith.mjs.'),
 'props': ('Props: tools, cargo and science', [
  'Hand drill with core bit', 'Sample bag', 'Sample tongs', 'Geology hammer', 'Rake (sample sieve)', 'Core sample tube rack',
  'Toolbox', 'Wrench', 'Cable reel', 'Spare tyre for the buggy', 'Antenna repair kit', 'Fuse panel box',
  'Battery charger dock', 'Supply crate (low-g physics)', 'Barrel (water)', 'Gas cylinder trolley', 'Cargo net bundle',
  'Pallet', 'Hand cart', 'Rope coil with clip', 'Tablet with map', 'Walkie radio', 'Binoculars', 'Camera on a tripod',
  'Thermos', 'Lunchbox', 'Teddy bear in a mini suit', 'Paper rocket model', 'Snow globe of Earth', 'Family photo frame'],
  'Every prop carries mass and a grab point for low-g throwing.'),
 'pickups': ('Pickups and collectibles', [
  'Oxygen canister', 'Battery cell', 'Repair patch', 'Snack pack', 'Water pouch', 'Signal flare', 'Map chip',
  'Keycard', 'Spare fuse', 'Jetpack fuel cell', 'Star sticker', 'Postcard from Earth', 'Daddy\'s memory coin plinth',
  'Rock with a fossil-like pattern', 'Lost mitten'],
  'Gold only for memory coins; cyan crystal pickup is the Bruiser thread\'s.'),
 'signals': ('Diegetic signals (no HUD)', [
  'Status lamp beacon post', 'Pressure gauge wall panel', 'Oxygen meter on the suit wrist', 'Door state light ring',
  'Painted wayfinding stripes', 'Hanging module sign (stencil letters)', 'Warning siren with spinner', 'Clock with Earth time',
  'Power level column (glowing tubes)', 'Air flow streamers (ribbons on vents)', 'Breadcrumb glow pegs', 'Radio speaker grille',
  'Message board with magnets', 'Dust storm windsock (static-dust ribbons)', 'Sun-angle shadow dial', 'Temperature frost line',
  'Elevator floor dial', 'Lander approach light strip', 'Base sound bell', 'Earth-up flag (crew mood)'],
  'Ask "how would Abbie know?" first: a dial, a lamp, a bell before any overlay.'),
 'play': ('Low-gravity toys and interactables', [
  'Jump pad', 'Bounce ball', 'Floating balloon', 'Slow-fall umbrella', 'Grab bar swing', 'Zip line', 'Tether post',
  'Pressure switch plate', 'Rotating valve wheel', 'Lever panel'],
  'Every one exaggerates low gravity: arcs, slow falls, dust that hangs.'),
 'support': ('Support machines (not heroes)', [
  'Helper drone (camera)', 'Cargo hauler robot', 'Rover tow trailer', 'Robotic arm on a rail', 'Cleaning bot',
  'Delivery capsule (lands from orbit)', 'Mini excavator', 'Crane boom', 'Forklift (low-g)', 'Mail rocket'],
  'Machines read as machines: charcoal with role lights, never cyan.'),
}

DRAWN = {  # the 20 drawn and built in round 1
 'Solar array wing on a sun-tracking mast', 'Landing pad with beacon ring', 'Comms dish on a turntable', 'Regolith ore processor',
 'Oxygen tank farm (three upright tanks)', 'Corridor segment, straight, ribbed', 'Bulkhead door, round pressure hatch',
 'Command console with three screens', 'Bunk pod with privacy shutter', 'Galley table with bench', 'Hydroponics rack (three tiers)',
 'Suit rack with spare suit', 'Patch-up station (first aid)', 'Crater rim arc piece', 'Boulder set (three)', 'Oxygen canister',
 'Battery cell', 'Status lamp beacon post', 'Pressure gauge wall panel', 'Jump pad',
 # round 3: the base buildings handed over by Moon Heroes, drawn as their Midjourney picks arrive
 'Base tower and antenna', 'Main dome, upgraded (from MR-002)'}

items, n = [], 0
for key, (title, names, note) in G.items():
    for name in names:
        n += 1
        items.append({'id': f'MK-{n:03d}', 'group': key, 'name': name, 'drawn': name in DRAWN})
assert n == 200, n
assert sum(i['drawn'] for i in items) == len(DRAWN)
json.dump({'study': 'AW-STUDY-0031', 'groups': {k: {'title': t, 'note': nt} for k, (t, _, nt) in G.items()},
           'items': items}, open('catalogue.json', 'w'), indent=1)
print('ok', n)
