// The demo story, as data (Evan, 2026-10-23 20:19Z and 20:21Z). Three scenes, each a list of beats.
// Every line has a speaker, a text and (for the tour) a voice slot. `cue` beats drive the 3D world; `wait` is seconds.
// Voices are designed voices only, never clones (tools/demo-narration/render.py renders them with ElevenLabs).
// Kids' faces are never drawn from photos: the cartoon Abbie and Ani are stand-ins until the Meshy heroes land.

export const CAST = {
 abbie:  {name: 'Abbie', mark: 'Ab', color: '#ff7eb6', side: 'in'},
 ani:    {name: 'Ani', mark: 'An', color: '#b18cff', side: 'in'},
 sci:    {name: 'Strange Scientist', mark: 'Dr', color: '#6fe3a5', side: 'out'},
 you:    {name: 'You', mark: 'Yo', color: '#6fa8ff', side: 'in'}
};

// Scene 1, the opening tour. Landscape: the studio on the left, the iPhone chat on the right. Narrated.
export const TOUR = [
 {cue: 'studio'},
 {cue: 'walkIn', wait: 2.4},
 {who: 'abbie', say: "Hi guys, I'm cartoon Abbie!", id: 't01'},
 {who: 'ani', say: "And I'm cartoon Ani! Welcome to our world!", id: 't02', react: '❤️'},
 {who: 'abbie', say: "We'd love to give you a tour of Winchester.", id: 't03'},
 {cue: 'board', wait: 1.2},
 {who: 'ani', say: "It's three little neighbourhoods around one big school. Look, the whole town is a toy you can pick up!", id: 't04', react: '😂'},
 {cue: 'zone:downtown', wait: .8},
 {who: 'abbie', say: "This is Downtown. The coffee shop is here, and so is the pizza place with the booth by the window.", id: 't05'},
 {cue: 'zone:ani', wait: .8},
 {who: 'ani', say: "This side is mine! My house, my treehouse, and the cul-de-sac where we ride bikes.", id: 't06', react: '🚲'},
 {cue: 'zone:abbie', wait: .8},
 {who: 'abbie', say: "And this side is Daddy's and mine. There's a secret door in the grass under my treehouse. Shh!", id: 't07', react: '🤫'},
 {cue: 'zone:school', wait: .8},
 {who: 'ani', say: "Right in the middle, where all three meet, is the high school. Everybody ends up there.", id: 't08'},
 {cue: 'cafe', wait: .8},
 {who: 'abbie', say: "Come on in! This is my coffee shop. Mind the steps, there's a basement.", id: 't09', react: '☕'},
 {who: 'ani', say: "And that brings us to today... and this very strange scientist at the coffee shop.", id: 't10', react: '👀'}
];

// Scene 2, the group chat. Portrait iPhone: bloops, typing bubbles, reactions. The rocket pad cues sit inside it (20:21Z):
// the pad unfolds out of the café roof like a satellite, a tiny toy rocket sits on it, the kids laugh, the scientist
// uses the last of the grow spray, and the mission is revealed.
export const SCIENTIST = [
 {cue: 'phone'},
 {who: 'sci', say: 'Good morning, small people. Do not touch the green goo.', typing: 1.6, wait: .5},
 {who: 'abbie', say: 'What does the goo do?', typing: 1.0, react: '🤔'},
 {who: 'sci', say: 'It makes things GROW. Which is a problem, because I have exactly one problem. Hold on, going up on the roof.', typing: 2.2},
 {who: 'ani', say: "wait why is there a roof door", typing: 1.0, react: '❗'},
 {cue: 'padUnfold', wait: 4.2},
 {who: 'ani', say: 'THE ROOF IS TRANSFORMING', typing: .8, react: '😮'},
 {who: 'abbie', say: 'omg a launch pad!!', typing: .8},
 {cue: 'toyRocket', wait: 1.8},
 {who: 'sci', say: 'Behold. My rocket.', typing: 1.2},
 {who: 'abbie', say: "it's... a toy", typing: .9, react: '😂'},
 {cue: 'laugh', wait: 1.5},
 {who: 'ani', say: 'it fits in my hand 😂😂😂', typing: .9, react: '😂'},
 {who: 'sci', say: 'It is small because I ran out of grow spray. I have one last little bit.', typing: 1.8},
 {cue: 'growSpray', wait: 3.4},
 {who: 'sci', say: 'There was a strange disturbance on the far side of the Moon last night. Nobody has ever looked there.', typing: 2.2},
 {who: 'sci', say: 'We need you to go investigate.', typing: 1.2, react: '🚀'},
 {who: 'abbie', say: 'Okay. Okay!! But first, we need our gear.', typing: 1.2},
 {cue: 'missionBoard'}
];

// Voice slots for the tour: one designed voice per speaker, filled from /studies/family-cast/cast.json when Evan picks.
export const VOICES = {abbie: null, ani: null};
