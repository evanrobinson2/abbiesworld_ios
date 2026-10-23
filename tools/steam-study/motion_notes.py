# Oracle motion notes: how each game's characters move, and where the makers explain it (2026-10-23).
# Asked for by Evan ("I want the real models and true animation... there must be animations you can STUDY from the
# oracle") after Character Studio (AW-STUDY-0037) found the identity schema's `motion` field empty on every record.
# Written in the cloud from public talks, interviews and breakdowns, in our own words; links were opened on
# 2026-10-23. A game's own animation files are never extracted or copied: we study how, never take what.
#
# Fields (schema `oracle.motion.v1`, the `animation` slot of game-identity.schema.json):
#   method      how the motion is authored: keyframe, mocap, procedural, physics, sprite, mixed
#   mocap       rough share of character motion that is captured (0 to 1)
#   locomotion  how walking and running are put together, any of: blend_tree (a few clips blended by speed and
#               direction), motion_matching (search a big captured database each frame), root_motion (the clip
#               moves the body), procedural_ik (feet and hands placed on the ground by code), physics (a simulated
#               body), procedural (code-made motion, no clips), sprite_frames, beat_sync (timed to music)
#   tricks      the signature moves that make it read, in our words
#   lesson      what Abbie's World takes
#   sources     [(title, url)]: talks, dev blogs and breakdowns about it
#   confidence  0 to 1

SOURCE = 'oracle motion study 2026-10-23 (public talks, interviews and breakdowns; no game files)'

MOTION = {
    'zelda-breath-of-the-wild': ('keyframe', 0.0, ['blend_tree', 'procedural_ik'],
        ['About eight directional climb loops blended by input direction, with IK holding hands and feet to any wall',
         'Body tilts with the slope, so climbing flattens into walking on all fours as the wall lies back',
         'Effort shows on the body: a rhythmic bounce, glancing at the next hold, sweat drops, a panicked scramble when stamina runs out'],
        'A small keyed set plus IK lets a character climb anything; show effort on the body instead of a meter.',
        [('New Frame Plus: How Link\'s climbing animation works in Breath of the Wild (transcript)', 'https://amara.org/videos/0IXJ0B4bKKKN/en/3103528')], 0.7),
    'ghost-of-tsushima': ('mocap', 0.85, ['root_motion', 'blend_tree', 'procedural_ik'],
        ['Performance capture of the cast carries each character\'s personality; casting changed characters to fit performers',
         'Sword stances change the whole idle and attack set, so a stance swap reads instantly',
         'Wind drives hair, cloth, grass and leaves together, so even a still character looks alive'],
        'Capture the performer, then let one wind signal move cloth and hair so idle never looks frozen.',
        [('VFX Voice: Creating the way of the warrior for Ghost of Tsushima', 'https://vfxvoice.com/creating-the-way-of-the-warrior-for-ghost-of-tsushima/'),
         ('GDC 2021: how Sucker Punch brought the island of Tsushima to life', 'https://gdconf.com/news/see-how-sucker-punch-brought-island-tsushima-life-gdc-2021')], 0.6),
    'hi-fi-rush': ('keyframe', 0.1, ['beat_sync', 'blend_tree'],
        ['Actions pressed slightly early or late are interpolated so the hit still lands on the beat',
         'Cutscenes are animated to a click track at the song\'s tempo (about three times the work of a normal scene)',
         'Idle loops, enemies and the world all bob on the same beat'],
        'One clock for animation and music: snap the contact frame to the beat and the player always feels on time.',
        [('Gameranx: how Tango Gameworks pulled off Hi-Fi Rush (citing director John Johanas)', 'https://gameranx.com/updates/id/436553/article/hi-fi-rush-is-a-huge-technical-achievement-heres-how-tango-gameworks-pulled-it-off/'),
         ('Unreal Engine interview: Hi-Fi Rush was inspired by Shaun of the Dead and Futurama', 'https://www.unrealengine.com/en-US/developer-interviews/hi-fi-rush-was-inspired-by-shaun-of-the-dead-and-futurama')], 0.65),
    'overwatch-2': ('keyframe', 0.0, ['blend_tree'],
        ['Hand-keyed heroes with strong poses and silhouettes; personality even in first-person arms',
         'First-person and third-person animations are separate sets, each tuned for its camera',
         'Big anticipation and snappy recovery so abilities read across a busy fight'],
        'Key the characters for pose and silhouette first; give the first-person hands their own personality.',
        [('GDC Vault: The Animation Pipeline of Overwatch', 'https://gdcvault.com/play/1024267/The-Animation-Pipeline-of-Overwatch'),
         ('Game Anim: The first person animation of Overwatch (Matthew Boehm, GDC 2017)', 'https://www.gameanim.com/2017/04/29/first-person-animation-overwatch'),
         ('Inven Global: how Overwatch\'s first-person animation breathed life into heroes', 'https://www.invenglobal.com/articles/1187/how-overwatchs-first-person-animation-breathed-life-into-heroes')], 0.7),
    'untitled-goose-game': ('keyframe', 0.0, ['blend_tree', 'procedural_ik'],
        ['Animated in Blender, played in Unity: a small set of goose clips (waddle, run with flapping wings, crouch, honk, grab)',
         'Villagers react with clear, readable body language (look up, chase, shoo), which is the stealth readout',
         'Neck and head lead the body, so the goose looks curious before it moves'],
        'Readable reactions on the people are worth more than a big animation set; lead with the head.',
        [('Game Developer: Road to the IGF, House House\'s Untitled Goose Game', 'https://www.gamedeveloper.com/game-platforms/road-to-the-igf-house-house-s-i-untitled-goose-game-i-')], 0.5),
    'a-short-hike': ('keyframe', 0.0, ['blend_tree', 'procedural'],
        ['A few simple keyed cycles on a chunky low-poly bird, carried by the low-resolution pixel look',
         'Climbing and gliding are separate simple states with quick, forgiving transitions'],
        'A tiny animation set is enough when the style is chunky and the transitions are quick.',
        [('Wikipedia: A Short Hike', 'https://en.wikipedia.org/wiki/A_Short_Hike')], 0.4),
    'street-fighter-6': ('mocap', 0.8, ['root_motion'],
        ['In-house mocap actors perform each fighter\'s moves; capture is fed straight into the RE Engine',
         'Capcom built real-time preview of capture inside the engine, so animators see it on the character at once',
         'Captured motion is then pushed into strong key poses with hit-stop, so every hit reads'],
        'Capture for weight and timing, then exaggerate the key poses and freeze the contact frame.',
        [('Dashfight: Capcom shows its RE Engine mocap technique in SF6', 'https://dashfight.com/news/capcom-unveils-cutting-edge-re-engine-mocap-technique-in-sf-6-showcase-3911'),
         ('Capcom R&D: Real-time motion capture preview in RE ENGINE (slides)', 'https://www.docswell.com/s/CAPCOM_RandD/KLLR24-RE2023'),
         ('80.lv: Capcom demonstrates motion capture running directly in RE Engine', 'https://80.lv/articles/capcom-demonstrates-motion-capture-running-directly-in-re-engine/')], 0.7),
    'super-smash-bros-ultimate': ('keyframe', 0.0, ['root_motion'],
        ['Hand-keyed moves for every fighter, tuned frame by frame for timing',
         'Hit-stop: the struck fighter shakes in place, horizontally on the ground and vertically in the air, fading out; the attacker keeps moving a little',
         'Damage poses are blended in, and shake scales with camera distance'],
        'Hit-stop is animation: freeze, shake the victim, keep the attacker alive, fade the shake.',
        [('Nintendo Wire: Sakurai\'s "Eight Hit Stop Techniques" and other episodes', 'https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/')], 0.7),
    'absolver': ('mocap', 0.7, ['root_motion', 'blend_tree'],
        ['Martial-arts moves built as chains across four stances; each move ends in the stance the next one starts from',
         'Custom Unreal animation system so designers could assemble decks of moves without code',
         'Cloth and masks carry secondary motion on simple faceted bodies'],
        'Moves that end where the next begins let players chain their own combos; secondary motion on cloth sells it.',
        [('Unreal Engine interview: crafting a unique combat experience in Absolver', 'https://www.unrealengine.com/en-US/developer-interviews/crafting-a-unique-combat-experience-in-absolver')], 0.5),
    'spore': ('procedural', 0.0, ['procedural_ik', 'procedural'],
        ['Animators author motion once in a special editor on test creatures, marked up by meaning (this is a hand, this is a mouth)',
         'At runtime the motion is retargeted to any creature the player built, with an IK solver placing feet, hands and mouths',
         'Paint is procedural too: brush scripts read the body and flare colour at the ends of limbs'],
        'Animate by meaning, not by bone: author "reach with the mouth" once and retarget it to any shape the child makes.',
        [('Chris Hecker et al.: Real-time motion retargeting to highly varied user-created morphologies (SIGGRAPH 2008)', 'https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies'),
         ('CGW: Spore experts share animation techniques at SIGGRAPH 2008', 'https://www.cgw.com/Press-Center/Siggraph/2008/Spore-Experts-Share-Animation-Techniques-at-SIGG.aspx'),
         ('CGW Oct 2008: Evolutionary Chain', 'https://www.cgw.com/Publications/CGW/2008/Volume-31-Issue-10-Oct-2008-/Evolutionary-Chain.aspx')], 0.75),
    'tiny-glade': ('procedural', 0.0, ['procedural'],
        ['Buildings grow and settle procedurally as you draw; the "animation" is the architecture answering the stroke',
         'Sheep and birds wander with simple procedural motion; nothing is mocap'],
        'The world answering a stroke is the animation; spend motion on growth and settling, not characters.',
        [], 0.5),
    'besiege': ('physics', 0.0, ['physics'],
        ['Machines move by rigid-body physics: hinges, wheels and springs, so every machine animates itself',
         'Soldiers are simple keyed loops that ragdoll when hit'],
        'Physics is the animator for anything kids build; keep people simple and let them tumble.',
        [], 0.6),
    '9-kings': ('sprite', 0.0, ['sprite_frames'],
        ['Small pixel units with a few frames each; the battle reads from many units moving together'],
        'At small scale, crowd motion reads better than detailed motion on one unit.', [], 0.4),
    'lego-bricktales': ('keyframe', 0.0, ['blend_tree'],
        ['Minifigure animation in the stiff, hopping style of the toy: no knees, swinging arms and legs',
         'Built models are tested by physics'],
        'Animate toys like toys: respect the joints the toy really has.', [], 0.5),
    'dorfromantik': ('procedural', 0.0, ['procedural'],
        ['Tiny ambient life (trains, boats, windmills, birds) on simple loops and paths; placement pops and settles'],
        'Ambient loops on paths are enough to make a board feel alive.', [], 0.5),
    'animal-crossing-new-horizons': ('keyframe', 0.0, ['blend_tree', 'procedural_ik'],
        ['Squat toy-proportioned villagers with bouncy keyed walks and big emotes (reactions) for every mood',
         'Footsteps and run speed change with the ground; the head turns to look at things nearby'],
        'Emotes as a vocabulary: a small set of big readable reactions carries all the social information.', [], 0.5),
    'fall-guys': ('physics', 0.0, ['physics', 'blend_tree'],
        ['Keyed run, jump and dive blended with a physics body, so bumps make the beans wobble and tumble',
         'Getting knocked over is the comedy: the body goes floppy, then gets back up'],
        'Mix keyed intent with a physics body; falling over should be funny and quick to recover from.', [], 0.5),
    'jusant': ('mixed', 0.3, ['procedural_ik', 'blend_tree'],
        ['Each hand reaches by its own trigger and IK places it on the hold; the body swings under the rope with physics',
         'Breathing and trembling arms show stamina'],
        'Let the player drive each hand; IK and a little physics make any wall climbable.', [], 0.5),
}


def motion_for(slug):
    """The animation block for one game, or None when it has not been studied yet."""
    if slug not in MOTION:
        return None
    method, mocap, locomotion, tricks, lesson, sources, conf = MOTION[slug]
    return {'schema': 'oracle.motion.v1', 'method': method, 'mocap': mocap, 'locomotion': locomotion,
            'tricks': tricks, 'lesson': lesson, 'sources': [{'title': t, 'url': u} for t, u in sources],
            'source': SOURCE, 'confidence': conf}
