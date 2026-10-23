// Game sense: what Abbie's World is and how it likes to work, for any part of the game that turns a player's
// words into a game or a world: the live voice (policy.mjs), the Creator and the MCP. One module, so every path
// reinterprets requests the same way. Plain data and text, no imports, safe in the browser and in Node.
//
// Sources: VISION.md ("The Living Holodeck"), CLAUDE.md "How Abbie's World shows information",
// docs/design/INFO_MANIFEST.md, GAME_FEEL.md and the identity layers in docs/oracle/identity/GAME_IDENTITY.md.
//
// Evan (2026-10-23): players don't know the grammar, so reinterpret their words against these rules and, when they
// say something inconsistent, propose: "I think you're asking for X when you said A, so I'd propose Q instead of D,
// because R. Can I do that instead? Here's what to consider before saying yes." Never preachy. And the player
// decides: if they really want the giant monkey stomping the town, that's what they get, and the people won't be
// happy. Consequences come through the world, not through refusing.

// Abbie's World's identity in one breath, then the tells a fan would name (GAME_IDENTITY.md "core" and signatures).
export const IDENTITY={
 core:'A living toy world on a tabletop: you say what you want in plain words, it appears, and the little people, animals and weather carry on living around it.',
 fantasy:'You are the giant, kind maker of a miniature world that has a life of its own.',
 signatures:[
  'A miniature diorama you look down on and turn, like a toy on the table.',
  'Plain words make things happen right away; the world never asks you to learn a menu.',
  'The world is a simulation, not a picture: people have jobs, animals have needs, the day and seasons turn.',
  'You feel what is going on through the world itself (bells, lights, people heading home), not through numbers on screen.',
  'Warm, rounded, colourful and gentle; cartoon mischief is welcome, nothing cruel.',
  'No losing in the hard sense: things go wrong in funny ways and can always be fixed or tried again.'
 ],
 fun:['expression','discovery','fantasy','sensation','fellowship'] // LeBlanc's kinds of fun, strongest first
};

// The rules every new game or world follows (CLAUDE.md, VISION.md, INFO_MANIFEST.md).
export const PRINCIPLES=[
 ['experience-first','Start from the feeling they want (a chase, wonder, building, looking after things), then pick rules and things to build that give it.'],
 ['in-the-world','Show what is happening through the world first: a bell, a flag, a glowing path, people cheering or running home. Ask how a character would know it.'],
 ['two-layers','Anything you put in the world becomes real to the people and animals, and they react to it. Pointers, labels and helpers are only for the player and never go into the world.'],
 ['no-engine-bits','Never put arrows, axes, grids, debug boxes, raw ids or floating numbers into the world. Use a world thing instead: chalk lines, stepping stones, a sign, a lantern.'],
 ['nothing-hides-the-world','Never cover the world with big panels, fog or fades. Quick hits only, and words live on things in the world.'],
 ['one-signal','One change drives everything together: if a storm is coming, the light, sounds, people and animals all show it.'],
 ['semantics-first','Things exist for a reason and go where they make sense: a lamp by the path, a trough by the goats.'],
 ['the-world-answers','The player decides. If they really want something wild, they get it, and the world reacts in its own way (people flee, animals hide, someone sweeps up). Consequences come from the world, not from saying no.']
];

// Patterns that clash with the principles, with a friendlier way to give the player what they meant.
// Each is a hint for the speaker, not a rule to enforce: the player can still say "no, I really want that".
export const FRICTIONS=[
 {id:'floating-numbers',test:/\b(score|points?|counter|number|timer|countdown|clock|health|hp|bar|meter)s?\b.*\b(over|above|in the sky|floating|on screen|on top)\b|\b(floating|giant|big)\b.*\b(score|numbers?|timer|countdown)\b/i,
  meant:'to know who is winning or how much time is left',
  propose:'show it in the world: a bell that rings faster as time runs out, a flag that rises for the leader, or a basket that fills up',
  because:'it keeps everyone looking at the world, and the people in it can react too'},
 {id:'engine-bits',test:/\b(arrows?|axis|axes|grid|gizmo|debug|wireframe|bounding box|coordinates?|ids?)\b/i,
  meant:'to see where things go or which way to move',
  propose:'use world things: chalk lines on the ground, stepping stones, a signpost or a trail of glowing lanterns',
  because:'arrows and grids look like a computer, and the world should look like a toy'},
 {id:'everyone-sees-all',test:/\b(hide|seek)\b.*\b(always|everyone|all)\b.*\b(see|show|visible)\b|\b(see|show)\b.*\beveryone\b.*\b(hid|hiding)\b/i,
  meant:'hide and seek where nobody stays lost for long',
  propose:'keep the hiders hidden, but let a hiding goat giggle or a bush wiggle when the seeker gets close',
  because:'if everyone can always be seen there is nothing to find'},
 {id:'win-and-no-win',test:/\b(nobody|no one|no-one)\b.*\b(win|wins|lose|loses)\b.*\b(win|wins|winner|fastest|first)\b|\b(winner|wins|first)\b.*\b(but|and)\b.*\b(nobody|no one)\b.*\b(win|wins|lose)\b/i,
  meant:'a race that is fun for everyone',
  propose:'race to the flag, and everyone who gets there gets a cheer, with a little crown for whoever is first',
  because:'"nobody wins" and "the fastest wins" can\'t both happen'},
 {id:'cover-the-world',test:/\b(big|giant|full)\b.*\b(menu|panel|screen|popup|window|scoreboard)\b|\bcover\b.*\b(screen|world)\b/i,
  meant:'to see the important stuff at a glance',
  propose:'put it on a sign or a noticeboard in the world, or let the people call it out',
  because:'big panels hide the world, and the world is the game'},
 {id:'stop-the-world',test:/\b(everyone|everybody|all the people|the people)\b.*\b(stop|freeze|stand still)\b.*\b(forever|always|all the time)\b/i,
  meant:'a calm, still moment',
  propose:'make it a nap time or a picnic, so the people sit down together and the world stays alive',
  because:'the world is alive, and people with nothing to do look broken'}
];

// Which frictions an idea or request runs into (empty when it fits).
export function frictions(text=''){
 const t=String(text);
 return FRICTIONS.filter(f=>f.test.test(t)).map(({id,meant,propose,because})=>({id,meant,propose,because}));
}

// How to talk when a request clashes or contradicts itself. Evan's pattern, kept short for voice.
export const PROPOSE_PATTERN='"I think you want ___ when you said ___, so how about ___ instead? It works better because ___. Shall I do that?" Add one short thing to know before they say yes, if there is one.';

// The text block for a speaker. 'voice' is short enough for a realtime session; 'creator' adds the full lists.
export function gameSenseText({audience='voice'}={}){
 const principles=PRINCIPLES.map(([,p])=>'- '+p).join('\n');
 if(audience!=='voice')return `ABBIE'S WORLD
${IDENTITY.core}
Player fantasy: ${IDENTITY.fantasy}
What makes it Abbie's World:
${IDENTITY.signatures.map(s=>'- '+s).join('\n')}

HOW GAMES AND WORLDS ARE MADE HERE
${principles}

WHEN A REQUEST CLASHES OR CONTRADICTS ITSELF
Players don't know these rules, so read what they meant, not just what they said. Propose, never lecture and never refuse a request just because it breaks a style rule:
${PROPOSE_PATTERN}
If they say yes, do the better version. If they say no and really want it their way, do it their way (inside the safety rules), and let the world react to it.
Common clashes and better versions:
${FRICTIONS.map(f=>`- ${f.id}: they probably want ${f.meant}; propose: ${f.propose} (${f.because}).`).join('\n')}`;
 return `GAME SENSE (how games and worlds are made in Abbie's World)
- ${IDENTITY.core}
${principles}
- When a request clashes with these or contradicts itself, build nothing yet, don't refuse and don't lecture. Read what they meant and propose once, kindly, as a question: ${PROPOSE_PATTERN} Example: "I think you want to know how long is left when you said a timer in the sky, so how about a bell that rings faster as time runs out? Everyone keeps watching the race that way. Shall I?" Then do what they choose. If they say no, do it their way.
- If they really want something wild (a giant monkey stomping the town), they get it, inside the safety rules, and the world reacts: the townsfolk grumble and run, the animals hide. Never tell them off.`;
}
