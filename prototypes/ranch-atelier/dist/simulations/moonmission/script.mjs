// AW-STUDY-0036 Moon Mission, Part 1: the script graph. Beats run in order; each has a zone (zones.mjs), a mission card
// and steps. Step kinds are run by mission.mjs: cutscene, say, ask, accept, jobs, poll, count, lander, fx, set, item, end.
// Lines are PG, short and readable on a TV from the sofa; every `say` is also spoken in the speaker's designed voice
// (houston and officer are designed voices; the kids are adult actors performing kids, see tools/voice-cast/cast.json).
const say = (who, text) => ({k: 'say', who, text});
const think = (who, text) => ({k: 'say', who, text, thought: true});
const cut = (secs, ...fx) => ({k: 'cutscene', secs, fx});
const fx = (name, o = {}) => ({k: 'fx', name, ...o});
const ask = (by, options, id) => ({k: 'ask', by, options, id});
const jobs = (list, o = {}) => ({k: 'jobs', list, ...o});

export const BEATS = [
 {id: 'truck', zone: 'main-street', clock: -86400, running: false, steps: [
  cut(5, fx('sound', {id: 'truck-hum'}), fx('street-looks')),
  say('officer', 'Good morning. Sorry to interrupt your coffee.'),
  say('officer', 'I’m from the Moon Mission office. We have a mission, a very important one, and the Moon base needs a crew.'),
  ask('daddy', [{text: 'A mission? To where?', then: [say('officer', 'The Moon base. Tonight, if you’re ready.')]}, {text: 'Is this a joke?', then: [say('officer', 'It’s the least funny thing I’ve done all week. Look at the folder.')]}]),
  ask('abbie', [{text: 'Is it a really big rocket?', then: [say('officer', 'It’s the biggest pink one we have.')]}, {text: 'Can Ani come?', then: [say('officer', 'We were hoping she would. A crew needs a navigator.')]}]),
  ask('ani', [{text: 'Can we bring snacks?', set: {snacksAsked: true}, then: [say('officer', 'We’ll need someone in charge of meals. That sounds like you.')]}, {text: 'Will there be stars?', then: [say('officer', 'More than you can count.')]}]),
  say('officer', 'A patch, a star map, and a pink rocket drawn by a child. That’s the whole briefing.'),
  {k: 'accept', line: 'Will you accept the mission?', yes: 'We accept'},
  fx('stamp'), {k: 'startClock'},
  fx('kaboom'),
  think('daddy', 'Well. That’s a big rocket.'),
  cut(6, fx('sound', {id: 'town-settles'})),
 ]},
 {id: 'kitchen', zone: 'kitchen', clock: -2700, steps: [
  cut(4),
  think('daddy', 'Launch day. The girls are still asleep.'),
  ask('daddy', [{text: 'Wake them early for the sunrise on the rocket', set: {sunrise: true}}, {text: 'Let them sleep and make Moon pancakes', set: {pancakes: true}}], 'start-of-day'),
  ask('daddy', [{text: 'Take Grace’s old radio', set: {radio: true}, item: {id: 'old-radio', name: 'Grace’s old radio', icon: '📻', from: 'Daddy'}},
                {text: 'Take Bub’s chewed-up toy rocket', set: {bubrocket: true}, item: {id: 'bub-rocket', name: 'Bub’s toy rocket', icon: '🚀', from: 'Daddy'}}], 'what-daddy-brings'),
  say('daddy', 'Astronauts! It’s time.'),
  cut(5),
 ]},
 {id: 'tree-house', zone: 'tree-house', clock: -1800, steps: [
  cut(3),
  say('abbie', 'What should I wear? I’ll never be ready for launch if I don’t have my space suit.'),
  say('abbie', 'Ani, will you help me get ready?'),
  ask('ani', [{text: 'Of course!', set: {aniHelps: true}}, {text: 'Only if I get to pick the helmet light!', set: {aniPicksLight: true}}]),
  // one picks each part, the other fastens it: a pair job on one bench
  jobs([
   {key: 'pick-body', owner: 'abbie', line: 'The suit body.'}, {key: 'fasten-body', owner: 'ani'},
   {key: 'pick-gloves', owner: 'abbie', line: 'Gloves.'}, {key: 'fasten-gloves', owner: 'ani'},
   {key: 'pick-boots', owner: 'abbie', line: 'Boots.'}, {key: 'fasten-boots', owner: 'ani'},
   {key: 'draw-patch', owner: 'abbie', line: 'And my mission patch!'}, {key: 'seal-helmet', owner: 'ani', line: 'Helmet light on.'},
  ], {order: 'sequence', id: 'suit'}),
  {k: 'item', id: 'suit-abbie', name: 'Abbie’s white space suit', icon: '👩‍🚀', from: 'tree house'},
  {k: 'item', id: 'suit-ani', name: 'Ani’s white space suit', icon: '👩‍🚀', from: 'tree house'},
  say('ani', 'Now I have to get our meals ready. That’s my job.'),
 ]},
 {id: 'galley', zone: 'galley', clock: -1200, steps: [
  cut(3),
  say('ani', 'I have to prep the meal plans for the trip so we’re nourished.'),
  jobs([
   {key: 'pack-daddy', owner: 'ani', line: 'Something from every colour shelf for Daddy.'}, {key: 'request-abbie', owner: 'abbie', line: 'Abbie shouts her order.'},
   {key: 'pack-abbie', owner: 'ani'}, {key: 'pack-ani', owner: 'ani'},
  ], {order: 'sequence', id: 'meals'}),
  {k: 'item', id: 'snack-packs', name: 'Three snack packs', icon: '🍱', from: 'Ani'},
 ]},
 {id: 'flight-check', zone: 'launch-pad', clock: -720, steps: [
  cut(3, fx('sound', {id: 'pad-wind'})),
  say('daddy', 'Flight check. Let’s go over her, point by point.'),
  jobs([
   {key: 'find-oil', owner: 'daddy', line: 'Oil smudge on the window.'}, {key: 'wipe-window', owner: 'abbie', line: 'Abbie, can you wipe that?'},
   {key: 'find-plug', owner: 'daddy', line: 'The oxygen line is unplugged.'}, {key: 'plug-line', owner: 'ani', line: 'Ani, plug it back in?'},
   {key: 'find-cap', owner: 'daddy', line: 'A loose panel cap.'}, {key: 'tighten-cap', owner: 'abbie'},
  ], {order: 'sequence', id: 'check'}),
  say('daddy', 'All good. She’s ready for us.'),
 ]},
 {id: 'driveway', zone: 'main-street', clock: -480, steps: [
  cut(2),
  ask('abbie', [{text: 'Bring my toy rocket for luck', set: {abbieToy: true}, item: {id: 'toy-rocket', name: 'Abbie’s toy rocket', icon: '🧸', from: 'Abbie'}}, {text: 'Bring a drawing for the Moon base wall', set: {abbieDrawing: true}, item: {id: 'drawing', name: 'A drawing for the base', icon: '🖼️', from: 'Abbie'}}]),
  ask('ani', [{text: 'Bring the star map', set: {aniMap: true}, item: {id: 'star-map', name: 'Star map', icon: '🗺️', from: 'Ani'}}, {text: 'Bring a harmonica', set: {aniHarmonica: true}, item: {id: 'harmonica', name: 'Ani’s harmonica', icon: '🎵', from: 'Ani'}}]),
 ]},
 {id: 'bus', zone: 'crew-bus', clock: -360, steps: [
  cut(7, fx('sound', {id: 'engine-muffled'}), fx('eyes-open'), fx('sound', {id: 'engine-clear'})),
  say('houston', 'Wake up, sleepy heads! I know you three have been working hard for today, so I hope you enjoyed a little shut-eye.'),
  say('houston', 'Now it’s time to get ready for our launch sequence.'),
 ]},
 {id: 'briefing', zone: 'briefing-room', clock: -300, steps: [
  say('houston', 'Here’s how today works.'),
  fx('board', {draw: 'rocket', color: '#ff7eb6'}), say('houston', 'This is our rocket. It’s pink, so you can find it.'),
  fx('board', {draw: 'hose', color: '#ff7eb6'}), say('houston', 'Abbie plugs in the oxygen. Loudly, please.'),
  fx('board', {draw: 'bulb', color: '#b18cff'}), say('houston', 'Ani turns on the launch lights and answers every call with “Roger.”'),
  fx('board', {draw: 'lever', color: '#6f9bff'}), say('houston', 'Daddy pulls the big ARM switch, under its flip cover.'),
  fx('board', {draw: 'count', color: '#2a2a2a'}), say('houston', 'Then we all count down together. Ten, nine, eight… and whoosh!'),
  say('houston', 'Any questions, crew?'),
 ]},
 {id: 'capsule', zone: 'capsule', clock: -120, steps: [
  cut(6, fx('sound', {id: 'hatch-thunk'})),
  say('houston', 'Moon Rocket, this is Houston. Good morning, crew.'),
 ]},
 {id: 'launch', zone: 'capsule', clock: -30, critical: true, steps: [
  say('houston', 'Radio check. Say your name and “loud and clear.”'),
  jobs([{key: 'radio-daddy', owner: 'daddy'}, {key: 'radio-abbie', owner: 'abbie'}, {key: 'radio-ani', owner: 'ani', line: 'Roger!'}], {order: 'parallel', id: 'radio-check'}),
  say('houston', 'Oxygen. Abbie, plug in our oxygen!'),
  jobs([{key: 'o2', owner: 'abbie', line: 'PLUG IN OUR OXYGEN!!!'}], {id: 'oxygen'}),
  fx('sound', {id: 'suit-hiss'}), say('houston', 'Oxygen is go. Helmets on, visors down.'),
  jobs([{key: 'helm-daddy', owner: 'daddy'}, {key: 'helm-abbie', owner: 'abbie'}, {key: 'helm-ani', owner: 'ani'}], {order: 'parallel', id: 'helmets'}),
  say('houston', 'Ani, cabin lights to launch mode.'),
  jobs([{key: 'lights', owner: 'ani'}], {id: 'launch-lights'}),
  say('houston', 'Fuel is full.'),
  jobs([{key: 'fuel', owner: 'engineer?daddy'}], {id: 'fuel'}),
  {k: 'poll', calls: ['Oxygen?', 'Lights?', 'Fuel?', 'Crew?']},
  say('houston', 'All stations are go. Commander, arm the rocket.'),
  jobs([{key: 'arm', owner: 'daddy'}], {id: 'arm'}),
  {k: 'count', from: 10},
  fx('liftoff'), fx('mood', {to: 'dark'}),
  say('houston', 'Liftoff! You’re clear of the tower!'),
  cut(6, fx('sound', {id: 'stage-clunk'})),
  say('houston', 'Engine cut-off. Welcome to space, Moon Rocket.'),
 ]},
 {id: 'orbit', zone: 'orbit', clock: 1200, steps: [
  cut(3),
  say('houston', 'You’ve got a minute. Look out your window.'),
  jobs([{key: 'share-snacks', owner: 'any', line: 'Pass the snack packs around.'}], {id: 'snacks'}),
  say('abbie', 'Look, Daddy! It’s home!'),
  cut(5),
 ]},
 {id: 'lander', zone: 'lunar-descent', clock: 10800, steps: [
  say('houston', 'Lander is away. Commander, you have the stick.'),
  {k: 'lander'},
  fx('golden-key'),
 ]},
 {id: 'arrive', zone: 'moon-base-pad', clock: 11520, steps: [
  cut(4, fx('sound', {id: 'airlock-lights'})),
  {k: 'item', id: 'memory-key', name: 'Daddy’s memory key', icon: '🗝️', from: 'the Moon base'},
  think('daddy', 'This place… I’ve been here before. In a memory.'),
  say('houston', 'Welcome to the Moon base, crew.'),
  say('houston', 'The airlock panel is yours. Match every wire to its socket.'),
 ]},
 {id: 'airlock', zone: 'airlock', clock: 11700, steps: [
  cut(3, fx('sound', {id: 'airlock-hiss'})),
  say('abbie', 'Daddy, the door has wires!'),
  {k: 'game', game: 'wire'},
  say('ani', 'It’s open. It smells like a new bike in here.'),
  {k: 'item', id: 'airlock-badge', name: 'Airlock badge', icon: '🪪', from: 'the airlock'},
  cut(3),
 ]},
 {id: 'habitat', zone: 'habitat', clock: 12300, steps: [
  cut(3),
  say('houston', 'Crew, we have gem bugs in the habitat lights. Zap them lane by lane.'),
  {k: 'game', game: 'zapper'},
  {k: 'item', id: 'gem-shard', name: 'A gem bug’s shard', icon: '💎', from: 'the habitat'},
  cut(3),
 ]},
 {id: 'star-child', zone: 'star-child-cave', clock: 13200, steps: [
  cut(4, fx('sound', {id: 'star-hum'})),
  say('abbie', 'Shh. Someone is humming.'),
  think('ani', 'It’s small, and it’s glowing, and it’s a little bit shy.'),
  {k: 'game', game: 'harmonizer'},
  {k: 'item', id: 'star-seed', name: 'Star Child’s seed', icon: '⭐', from: 'the Star Child'},
  say('abbie', 'We’ll come back for you. Promise.'),
  cut(4),
 ]},
 {id: 'buggy', zone: 'crater-road', clock: 14400, steps: [
  cut(3),
  say('houston', 'Buggy is fuelled and the road home is clear. Daddy drives, Abbie calls rocks, Ani works the lights.'),
  {k: 'game', game: 'buggy'},
  think('daddy', 'Home. A long way, and we made it home.'),
  {k: 'end', id: 'part-1'},
 ]},
];
