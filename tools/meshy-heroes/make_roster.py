"""Writes roster.json: every hero character for AW-STUDY-0043 with its Midjourney prompt and Meshy settings.

Sources: docs/oracle/moonheroes/BASE_ROSTER.md (40 PG base bodies) and PLAN.md (Moon heroes),
plus the story heroes Abbie and Ani (story-heroes canon). Run: python3 make_roster.py
"""
import json

# Evan 16:46Z: "they have to have nothing in their hands or hanging off them unless it's permanent."
CLEAN = "hands empty and open, nothing held, carried or hanging off the body, only parts that are permanently attached"
BODY = ("smooth featureless seamless store mannequin, bald, PG, no anatomical detail, "
        "A-pose with arms a little away from the body, front side and back views of the same figure, "
        "orthographic, square to the camera, full body, untextured white clay, faceted low-poly planes, "
        "plain light grey background, even studio light --ar 3:2")
DRESSED = ("front side and back views of the same character, A-pose with arms a little away from the body, "
           "orthographic, square to the camera, full body, faceted low-poly hero style, gunmetal suit with "
           "accent lights, plain light grey background, even studio light --ar 3:2")

# (number, type, sex, shape words)
BASE = [
 (1, "Average human", "woman", "average adult woman, true adult proportions, natural chest, waist and hips"),
 (2, "Average human", "man", "average adult man, true adult proportions"),
 (3, "Athletic hero", "woman", "athletic heroic adult woman, toned, true adult proportions"),
 (4, "Athletic hero", "man", "athletic heroic adult man, broad shoulders, toned"),
 (5, "Heavy and strong", "woman", "heavy strong adult woman, broad and solid, true adult proportions"),
 (6, "Heavy and strong", "man", "heavy strong adult man, big barrel chest, thick limbs"),
 (7, "Tall and lean", "woman", "tall lean adult woman, long limbs, true adult proportions"),
 (8, "Tall and lean", "man", "tall lean adult man, long limbs"),
 (9, "Elder", "woman", "elderly adult woman, slight stoop, softer shape"),
 (10, "Elder", "man", "elderly adult man, slight stoop, softer shape"),
 (11, "Short and stocky", "woman", "short stocky adult woman, compact and sturdy"),
 (12, "Short and stocky", "man", "short stocky adult man, compact and sturdy"),
 (13, "Elf", "woman", "tall slender elf woman, long pointed ears"),
 (14, "Elf", "man", "tall slender elf man, long pointed ears"),
 (15, "Dwarf", "woman", "short broad dwarf woman, big hands, sturdy legs"),
 (16, "Dwarf", "man", "short broad dwarf man, big hands, sturdy legs"),
 (17, "Orc", "woman", "muscular orc woman, small tusks, heavy brow"),
 (18, "Orc", "man", "bruiser orc man, tusks, heavy brow, huge shoulders"),
 (19, "Halfling", "woman", "small halfling adult woman, adult proportions at small scale, large feet"),
 (20, "Halfling", "man", "small halfling adult man, adult proportions at small scale, large feet"),
 (21, "Goblin", "woman", "wiry goblin woman, big pointed ears, long fingers"),
 (22, "Goblin", "man", "wiry goblin man, big pointed ears, long fingers"),
 (23, "Troll / giant", "man", "huge troll giant man, long arms, hunched shoulders"),
 (24, "Ogress / giantess", "woman", "huge ogress giantess, broad and tall"),
 (25, "Lizardfolk", "woman", "lizardfolk woman, reptile head, long tail, scaled planes"),
 (26, "Lizardfolk", "man", "lizardfolk man, reptile head, long tail, scaled planes"),
 (27, "Catfolk", "woman", "catfolk woman, cat ears, tail, digitigrade legs"),
 (28, "Catfolk", "man", "catfolk man, cat ears, tail, digitigrade legs"),
 (29, "Minotaur / bovine", "woman", "bovine minotaur woman, small horns, hooves"),
 (30, "Minotaur / bovine", "man", "minotaur man, big horns, hooves, broad chest"),
 (31, "Grey alien", "either", "slender grey alien, large head, big almond eyes, thin limbs"),
 (32, "Insectoid biped", "either", "insectoid alien biped with four arms, segmented plates"),
 (33, "Crystal being", "either", "adult crystal being made of glass facets, kin of the Star Child"),
 (34, "Amphibian alien", "either", "smooth frog-like amphibian alien, wide mouth, long fingers"),
 (35, "Heavy-gravity alien", "either", "wide short heavy-gravity alien, armoured plates"),
 (36, "Tentacle-armed alien", "either", "alien with tentacle arms, smooth dome head"),
 (37, "Robot / android", "either", "robot android frame, panel lines, mechanical joints"),
 (38, "Golem", "either", "stone golem made of large rock planes"),
 (39, "Winged humanoid", "woman", "winged humanoid woman, large feathered wings folded on the back"),
 (40, "Centaur", "man", "centaur man, horse body, human torso"),
]

STORY = [
 ("S1", "Abbie", "hero", "Abbie, cartoon girl hero about 4.5 heads tall, copper bob haircut, blue eyes, pink accents", "pink"),
 ("S2", "Ani", "hero", "Ani, cartoon girl hero about 4.5 heads tall, brown hair, brown eyes, light warm tan skin, purple accents", "purple"),
 ("S3", "Daddy", "hero", "Daddy, adult explorer about 7.5 heads tall, bald, salt and pepper beard, orange suit lights, no helmet", "orange"),
 ("S4", "Star Child", "hero", "Star Child, small glowing glass crystal alien with cat-like ear points, friendly face, cyan glow", "cyan"),
 ("S5", "Gem bug", "creature", "gem bug, friendly crystal beetle creature, six legs, cyan gem shell, PG", "cyan"),
]

CREATURE = ("front side and back views of the same creature, orthographic, square to the camera, full body, "
            "faceted low-poly glass and crystal planes, plain light grey background, even studio light --ar 3:2")

# Evan 14:22Z: "I want astronaut, meshy FPS characters ... wallace and grommet style, I also want Arcane style too".
# The style is described in words only; no studio's characters, names or likenesses.
LOOKS = {
 "clay": ("Plasticine", "stop-motion plasticine claymation figure, handmade modelling clay with faint thumbprints, chunky rounded "
          "shapes, big friendly eyes, wide smile, matte surfaces, warm studio light", dict(texture=False, credits=20)),
 "paint": ("Painterly", "painterly stylized 3D character, hand-painted brush-stroke textures, angular graphic shapes, strong "
           "teal and orange rim light, bold colour, mature animated-series look", dict(texture=True, credits=30)),
}
# Evan 16:46Z: "you can't put those to meshy with helmets in their hands ... do them with uniform, and then in snug
# t-shirt and shorts that can fit comfortable under a space suit." Round 2: empty hands, no helmet anywhere, two outfits.
VIEWS = ("hands empty and open, nothing held, carried or hanging off the body, no helmet anywhere in the picture, front side and back views of the same character, "
         "A-pose with arms a little away from the body, full body, orthographic, plain light grey background --ar 3:2")
OUTFITS = {
 "suit": "in a chunky Moon astronaut uniform with oxygen pack, boots and gloves, bare head",
 "tee": "in a snug plain t-shirt and snug knee-length shorts made to fit under a space suit, short socks, simple soft boots, bare head",
}
CREW = [
 ("A1", "Abbie", "cartoon girl about 4.5 heads tall, copper bob, blue eyes, pink accents", "pink"),
 ("A2", "Ani", "cartoon girl about 4.5 heads tall, brown hair, brown eyes, light warm tan skin, purple accents", "purple"),
 ("A3", "Daddy", "adult man about 7.5 heads tall, bald, salt and pepper beard, orange accents", "orange"),
 ("A4", "Commander", "adult woman astronaut commander, true adult proportions, short dark hair, cyan accents", "cyan"),
 ("A5", "Engineer", "stocky adult man astronaut engineer, tool belt, yellow accents", "yellow"),
 ("A6", "Alien crewmate", "friendly small grey alien crewmate, big eyes, green accents", "green"),
]

def entry(id_, name, group, prompt, **kw):
    return dict(id=id_, name=name, group=group, mj_prompt=f"{prompt.split(', front side')[0]}, {CLEAN}, front side{prompt.split(', front side', 1)[1]}", mj="queued", meshy="queued",
                meshy_settings=dict(mode="image-to-3d", texture=False, credits=20), **kw)

roster = dict(
    study="AW-STUDY-0043",
    title="Meshy hero characters",
    asked="Evan 2026-10-23 09:39Z (Meshy + Blender cleanup), 09:46Z (Moon heroes), 10:02Z (40 base bodies, 2,000 credit cap)",
    route="Midjourney turnaround (Fast while Evan is around, Relax otherwise) -> Meshy image-to-3D untextured on Evan's Mac -> "
          "tools/bruiser-study/scale cleanup (weld, learn.py rings, deform.py cage, decimate 6-12k faces, role materials) -> "
          "accessorize.py gear fit -> rig with weights for Character Studio -> one side-by-side page",
    order=["astronauts first, both looks side by side (Evan 14:22Z)","1-4 as the test (80 credits)", "if clean and the gear fits: 5-40", "story heroes S1-S5"],
    budget=dict(cap=2000, astronauts=100 * len(CREW), first_pass=100 * len(CREW) + 20 * (len(BASE) + len(STORY))),
    astronauts=[dict(id=f"{i}-{k}-{o}", name=n, look=LOOKS[k][0], outfit=o, group="astronaut", accent=a,
                     mj_prompt=f"{d}, {OUTFITS[o]}, {VIEWS.replace(' --ar', ', ' + LOOKS[k][1] + ' --ar')}",
                     mj="queued", meshy="queued", meshy_settings=dict(mode="multi-image-to-3d", **LOOKS[k][2]))
                for i, n, d, a in CREW for k in LOOKS for o in OUTFITS],
    bodies=[entry(f"B{n:02d}", t, "base", f"{shape}, {BODY}", sex=s) for n, t, s, shape in BASE],
    story=[entry(i, n, g, f"{d}, {CREATURE if n in ('Star Child', 'Gem bug') else DRESSED}", accent=a)
           for i, n, g, d, a in STORY],
)
# Keep the progress already recorded (picks, run states) when the roster is rebuilt.
import os
if os.path.exists("roster.json"):
    old = {e["id"]: e for k in ("astronauts", "bodies", "story") for e in json.load(open("roster.json")).get(k, [])}
    for k in ("astronauts", "bodies", "story"):
        for e in roster[k]:
            e.update({f: old[e["id"]][f] for f in ("ref", "pick", "mj", "meshy") if f in old.get(e["id"], {})})
json.dump(roster, open("roster.json", "w"), indent=1)
print(len(roster["astronauts"]), len(roster["bodies"]), len(roster["story"]), roster["budget"])
