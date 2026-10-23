# Oracle study notes for reference games that are not in Evan's Steam library (2026-10-23).
# Asked for because studies kept consulting the Oracle and finding nothing: the café study (cozy shop games),
# Brute Fight (fighting games) and the School Jump (climbing and stealth). Each also has a full identity record in
# docs/oracle/identity/examples/<slug>.json and a hand rendering entry in rendering_notes.py ("How it's drawn").
# Written in the cloud from public knowledge, in our own words: no store text, art, audio or code. Style only.
# Same columns as owned_notes.py. Nintendo games have no Steam app id (appid None).

REFERENCE = [
# Cozy shop and home games (café study, AW-STUDY-0013).
("coffee-talk",914800,"Coffee Talk","Visual novel;Cozy;Simulation","Run a late-night café on a rainy street, brew drinks for regulars and listen to their stories.","fixed",
 "A customer sits, talks, orders; mix three ingredients, serve, listen to how it lands; the night moves on.","Slow, warm and quiet; the drink you make is the only button that matters.",
 "Almost everything is the counter and the faces: who sits down, what they say, how they react to the cup. The recipe book is summoned; the rain and the clock on the night set the mood.","Chunky pixel art in one fixed café view, warm lamps against a cold rainy window.","Lo-fi jazz beats, rain on glass, the hiss of the espresso machine.",
 "A café is a listening game: one small craft verb (make the drink) carried by faces and talk. The window, the rain and the music do the mood with no UI.","11295132","50230",6,0.75),
("unpacking",1135690,"Unpacking","Puzzle;Cozy;Narrative","Unpack boxes into a new home, one move at a time, and learn a life from the things you carry.","isometric",
 "Open a box, pull out one object, find where it belongs, place it; when the box is empty the room tells you who lives here.","Tactile and calm; every object clicks and thuds with its own sound.",
 "No words at all: the story lives in the objects and the rooms. A soft highlight shows a thing that is in the wrong place at the end of a level.","Clean pixel-art rooms at one fixed isometric angle, every object a readable little sprite.","Gentle acoustic music; a different foley sound for every object on every surface.",
 "Tell a story with objects only, and give every placement its own sound. Zero words, zero fail, a clear finish when the room is done.","22744120","60040",3,0.75),
("a-little-to-the-left",1629520,"A Little to the Left","Puzzle;Cozy;Casual","Tidy, sort and straighten household things into satisfying order, while a cat keeps messing it up.","fixed",
 "Look at a messy little scene, drag things until they line up or sort, the puzzle snaps tidy; a cat sometimes undoes it.","Fussy in the nicest way; the snap when things line up is the reward.",
 "The scene is the whole interface: the finished state shows itself by clicking into place. Hints are summoned, and some puzzles accept more than one tidy answer.","Soft hand-drawn objects on paper-like backgrounds.","Light piano and plucks; small clicks and rustles for every object.",
 "Order is a pleasure: a puzzle can be 'make it neat' with several right answers. A pet that undoes your work is comedy, not failure.","23663152","40150",3,0.7),
("animal-crossing-new-horizons",None,"Animal Crossing: New Horizons","Life sim;Cozy;Social","Move to an island, gather, build, decorate and befriend animal neighbours in real time, across the real seasons.","third_person",
 "Wake up, see what changed on the island, gather and catch, sell, buy, decorate, talk to neighbours, come back tomorrow.","Gentle and generous; a day is short and there is always one more small thing.",
 "The island carries the information: the real clock sets the light, the season, the shop hours and the creatures. Neighbours tell you news. A phone with apps is summoned; the screen is almost empty while you walk.","Soft rounded toy-like characters and island, with the world curving away from the camera.","Hourly music that changes through the day; soft footsteps on every ground type.",
 "The real clock and real seasons as the heartbeat; neighbours who notice what you did. Come back tomorrow is a stronger pull than any goal.","22755353","60130",3,0.8),
# Fighting games (Brute Fight, AW-STUDY-0027).
("street-fighter-6",1364780,"Street Fighter 6","Fighting;Action;Competitive","A side-on one-on-one fighting game with a big cast, a simple control mode for newcomers and a city to explore.","side",
 "Two fighters face off; read, move, poke, block, punish, spend the gauge on a big move; best of three rounds.","Heavy, crunchy and readable; each hit pauses for a beat so you feel it.",
 "Health and power bars along the top, a round timer, combo counters and big text callouts. Bodies show stun and fatigue, and a hit's size shows in the hit-stop and the splash.","Muscular stylised characters with physical materials and bright paint-splash effects on every big move.","Hip-hop and street beats, crowd noise, a live commentator option.",
 "Make every hit readable: wind-up, contact pause, splash, reaction. A one-button 'easy' control mode lets anyone play the same fight.","98262732","10180",22,0.75),
("super-smash-bros-ultimate",None,"Super Smash Bros. Ultimate","Fighting;Platform;Party","A party platform fighter: knock friends off the stage instead of draining a health bar.","side",
 "Run, jump, attack; every hit raises the other fighter's damage number, and high damage means they fly further; push them off the edge.","Chaotic, bouncy, funny; four players and items make every match different.",
 "One number per player at the bottom of the screen; the bigger it is the further you fly. Fighters flash and smoke when they are in danger, and a big hit freezes the screen for a moment.","Each fighter keeps their own home look, held together by strong rim light, bloom and one shared hit-spark language.","Huge library of upbeat remixes; loud bright hit sounds.",
 "Push-off-the-edge beats health bars for kids: nobody 'dies', they fly away and come back. Danger shows on the fighter, not in a meter.","97363642","10270",6,0.8),
("absolver",473690,"Absolver","Fighting;Action;Martial arts","Wander a ruined land in a mask and build your own martial-arts style from moves you learn by fighting.","third_person",
 "Explore, meet a fighter, duel in stances, learn the moves you blocked, arrange them into your own combat deck, fight better.","Deliberate and dance-like; each stance flows into the next move in your deck.",
 "Very little HUD: a small stance indicator and health. The fighter's body and stance tell you what comes next.","Faceted low-poly bodies and ruins in flat painted colour, with flowing cloth and masks.","Ambient strings and wind; sharp, dry hit sounds.",
 "Let players compose their own fighting style from moves they collect: expression inside a fight. The body is the readout.","68663641","40240",10,0.65),
# Climbing and kid-friendly stealth (School Jump, AW-STUDY-0026).
("a-short-hike",1055540,"A Short Hike","Adventure;Exploration;Cozy","Hike, climb and glide around a small island park to reach the peak and get a phone signal.","third_person",
 "Wander, chat, find golden feathers, climb a cliff until your stamina runs out, glide down, find another way up.","Light and free; climbing feels like a small brave push, gliding like a reward.",
 "Golden feathers in a small row show how much climb you have; the park's signs, hikers and paths point the way. A paper map is summoned.","Chunky low-poly world drawn at low resolution with crisp pixels, soft flat colour.","Bright adaptive music that shifts by area; birds and wind.",
 "Climbing with a visible stamina you grow by exploring; a small island that is fully readable from the peak. Very close to School Jump's latch climb.","33523241","62020",4,0.8),
("jusant",1977170,"Jusant","Adventure;Climbing;Puzzle","Climb a vast tower of rock that rises out of a dried-up sea, hand over hand, with a rope and a little water creature.","third_person",
 "Look up, plan a route, reach with the left hand then the right, place a piton, swing, rest on a ledge, read what the old climbers left behind.","Physical and patient; each hold is a choice of hand, and the rope makes falling safe.",
 "Almost no HUD: stamina shows in the climber's breathing and trembling arms. Handholds read by their shape and colour on the rock. Story lives in letters and abandoned homes.","Big sculpted rock in soft gradients, sun-bleached colour and deep atmospheric haze, clean shapes without outlines.","Sparse soundscape, wind and stone; music swells as you reach new heights.",
 "Show stamina on the body, not a bar; make the safety rope the fun of falling. Handholds that read by shape are a no-HUD climbing grammar.","24233431","82000",2,0.75),
("untitled-goose-game",837470,"Untitled Goose Game","Puzzle;Stealth;Comedy","Be a horrible goose in a sleepy village: sneak, steal and honk your way through a to-do list of mischief.","third_person",
 "Read the to-do list, sneak close, grab or honk, run off flapping, hide in a bush, try the next trick.","Silly and sly; getting caught just means being chased and shooed, never a fail screen.",
 "The villagers are the stealth meter: they look up, turn, chase and shoo. The to-do list is a notepad you summon and tick off. Nothing on screen while you play.","Flat unlit colour shapes with no textures and soft tinted shadows, like a picture book printed in a few inks.","Piano that follows the action, softer when sneaking and racing when you are spotted.",
 "Kid-friendly stealth: getting caught is funny, not failure; the people are the readout; music reacts to how sneaky you are.","43552431","62110",2,0.85),
]
