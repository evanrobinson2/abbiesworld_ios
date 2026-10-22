# Abbie’s World · Marble Voyage
## Art direction and visual storytelling plan

Prepared for Evan · 26 September 2026 · Art direction proposal, not an implementation claim

**Creative premise: every rescue reconnects a small part of the world.** Abbie’s journey should leave visible signs of care behind her: a lantern relit, a bridge repaired, a shop reopened, a frightened creature joining the celebration. The gang should leave equally readable signs of interruption: patched barricades, stolen supplies, crude padlocks, and crooked flags. This gives the beautiful islands a story the player can follow without a paragraph of explanation.

This document concentrates on the complete Marble Voyage experience, then extends the same visual logic into Abbie’s World’s home, crafting, and collection spaces. New lore below is proposed direction. The confirmed foundation is Abbie’s rescue climb, unnamed henchpeople, the four named gang members, the existing spirits, marbles, charms, shops, and floating-island artwork.

### 1. What the current materials tell us

I inspected the bundled title image, tall climb image, Fox/Bramble/Stag plates, Abbie’s happy portrait, Raze’s portrait, Bloom’s charm, current art-routing code, campaign generator, and the existing art documentation. This was an asset and source review, not a fresh device playtest.

There is already a valuable identity: bright floating islands, strange lovable animals, a rescue motive, an upward journey, and tactile magical objects. The strongest material should become the foundation of a consistent presentation.

The main gaps are specific:

- **Different rendering languages meet in the same game.** The inspected Abbie portrait uses conspicuous pixel edges; Raze and the porcupine use painted cel shading; spirit plates use luminous diorama rendering; Bloom is glossy enamel. These can coexist if their roles are deliberate, but the hero and combatants especially need matching contour, light, detail density, and scale.
- **Some environment plates contain their principal spirit in the background image.** Fox, Bramble, and Stag are painted into their plates. When the game also shows that spirit as a captive or rescued actor, the illustration cannot cleanly express a changed state. Separate actor-free scenery from the character and its effects for future battle art.
- **The climb establishes height better than it establishes the rescue story.** The inspected tall image is atmospheric and expansive, but the campaign needs clearer region landmarks, evidence of gang occupation, and recognizable changes behind the player.
- **Beautiful assets do not yet consistently explain why this action matters.** A marble, charm, cage latch, victory effect, and shop could share a visual cause-and-effect chain. Today they risk feeling like separate attractive objects.
- **Art records contain stale descriptions.** The older art manifest says the title and chart use Crash Land, while current code names dedicated title and climb assets. Older product copy describes a different campaign structure. The current generator is three lands with three POI fights and a land boss each, then a summit boss: thirteen fights. New art planning should follow the inspected code and explicitly flag proposed changes.

The first investment should make one full sequence coherent: opening → climb → first fight → rescue → shop → changed climb. That sequence will expose problems a gallery of isolated images cannot.

### 2. The visual promise

**A hand-painted toybox adventure with comic outlaw animals and acts of repair.**

Characters have clear cel-shaded forms with restrained painterly wear. Environments have broader, softer painted masses. Magical props use a controlled enamel-and-glass finish. These materials belong to one world because they share light direction, restrained highlights, recognizable shapes, and repeated construction details.

Five rules should govern every new commission:

1. **The silhouette tells you what you are looking at.** A round boxer, a low crab, a zigzag grasshopper, a domed armadillo, and an open-winged bat remain distinguishable without color.
2. **One image has one dominant idea.** A henchman gets a natural weapon and one costume joke. A location gets one landmark. A reward gets one recognizable object. Small ornaments support that idea.
3. **Danger feels theatrical and recoverable.** Comically heavy gloves, oversized latches, stitched cuffs, dented equipment, embarrassed retreat. Threat comes from expression, posture, blocking the route, and taking things that belong to others.
4. **The place changes when Abbie helps.** Restoration must be visible in composition and state, not dependent on brighter color alone.
5. **Art earns its screen space.** Decoration should identify a place, explain an action, predict a threat, reward progress, or add character. If it does none of these, it is a candidate for removal.

### 3. A visual story the existing loop can support

My proposed connecting story is that the gang has seized the islands’ routes and useful supplies. Their cages, toll barriers, and hoarded cargo interrupt the everyday exchanges that make the skylands feel alive. Abbie frees friends and restores passage as she climbs.

This works with the existing linear campaign. It needs no branching quest system, second currency, or additional combat class to be legible. Its first version can be carried by art states, short reactions, and a few recurring props.

Use three recurring motifs:

- **The friendly loop:** knotted cords, rounded hoops, linked stepping stones, and open circular ornament. It connects marbles, charm eyelets, hanging lanterns, bridge fittings, and friendly craft. Keep each object functionally distinct.
- **The gang’s interrupted loop:** a rough broken-ring patch with an off-center square stitch. It appears on cheap leather, cargo straps, flags, and latch housings. Draw the emblem once as a controlled asset; do not ask separate image generations to reproduce lettering or a detailed logo.
- **The restored connection:** a loosened strap, joined bridge section, open latch, or unfurled ribbon. The player sees the same motif transformed by their success.

Avoid turning every object into a literal magic ring. Repetition should feel like a shared craft tradition, not a branding exercise. Three or four quiet appearances in a sequence are enough.

The named crew still rolls into different boss roles. Therefore, regional identity and boss identity must be independent layers. A Fox Land arena remains Fox Land when a different leader occupies it; the boss’s portable banner, cargo, and personal prop identify the occupier. Do not bake one named boss into a region plate.

### 4. One world, three material families

**Living characters:** opaque painted surfaces, readable contours, two or three main value groups, concentrated detail around face and defining anatomy. Leather gets a few large repairs. Fur does not require a thousand hair strokes. Quills, horns, shell plates, and antennae carry silhouette.

**Places:** soft atmospheric depth, broad foliage groups, strong foreground/midground/background separation, a quiet area behind gameplay. Use the current floating-island warmth and scale. Keep the immediate arena closer to the characters’ painted finish; reserve softer atmospheric treatment for distant islands.

**Magic and rewards:** glass, enamel, cord, and warm metal. Their small bright highlights justify a slightly glossier finish than skin or cloth. Bloom’s existing enamel character is a useful starting point. All charms should look like objects made by the same craft tradition, with consistent rim width and light direction.

The style reference from the porcupine transfers convincing contour and leather treatment. It also strongly transfers teal and coral. That is useful evidence, not an automatic instruction to make every animal the same colors. The first five concepts can share a gang palette; production color variants should restore species separation while retaining the common materials.

### 5. Character hierarchy and the first five henchpeople

The hero, ordinary foes, leaders, and captives need different visual priorities.

**Abbie** is the emotional center. Her face should be visible at the actual HUD size. Preserve her established identity and costume cues when reconciling the pixel portrait with the painted cast. Commission a carefully reviewed model sheet before generating a large expression set. Her pose language should be open, forward-looking, and resourceful; the gang’s is closed, puffed-up, and possessive.

**Henchpeople** are comic obstacles. Keep them unnamed in story presentation. Species and action labels are sufficient for art management and UI. Their bodies, rather than increasingly elaborate costumes, create variety.

The initial five fill useful visual roles:

- **Porcupine Boxer:** a compact round mass with a rear fan of quills and a clear glove guard. This is the approved style anchor and the requested first opponent. The production cutout must preserve her determined muzzle and distinguish gloves from torso. Future defeat: gloves sag and quills settle, without injury imagery.
- **Crab Pincher:** low, wide, and asymmetric. One large pincer is the joke and the readable threat. A little claw provides scale and personality. Future anticipation: claw opens and pauses before the snap; recoil should be a sideways wobble.
- **Grasshopper Kickboxer:** a narrow body and large zigzag legs. The generation must remain an insect rather than a human martial artist wearing an insect head. Future anticipation: hind legs compress; recovery: an exaggerated overextended landing. This is presentation direction, not a claim that a kick mechanic exists.
- **Armadillo Blocker:** a smooth dome against the porcupine’s spiked outline. Her shell, tiny face, and stubborn brace communicate resistance. Future anticipation: ears tuck and shell tilts; defeat: uncurls with an annoyed glance. Do not imply a functional shield state until gameplay supports one.
- **Bat Divekicker:** an open kite silhouette that occupies vertical space. Wings are the forelimbs; avoid extra arms. Feet and cuffs add comedy. Future anticipation: wing lift, brief hover, then a diagonal lunge. Existing ground/flying distinctions can support her identity without inventing a new system.

The first deliverable is five concept identities, not five complete animation packages. Subsequent production should give each a matched idle, anticipation/attack, hit reaction, and defeated/retreat state. A shared pivot, apparent size, and costume are more valuable than four unrelated impressive pictures.

**The four leaders** should be unmistakable at thumbnail size: preserve Raze, Vix, Morrow, and Nib’s identities and build one signature prop, gesture, and silhouette cue for each. Since their campaign roles are seeded, their art must work as both regional and summit opposition. Scale and arena dressing can elevate a leader without redesigning the character every run. Brakka remains outside this four-character production brief until roster scope is explicitly settled.

**Captives** should remain distinct from enemies. Use posture, framing, and expression to show worried → hopeful → free. Avoid using the same smiling portrait throughout captivity. Retain warmth: their identity should not depend on distress or violent imagery.

### 6. Palette, light, and detail rules

Use a family palette with functional hierarchy rather than unconstrained saturation everywhere.

- Friendly areas: warm ivory, soft leaf green, clear sky cyan, restrained apricot accents.
- Gang materials: charcoal leather, dirty cream repairs, worn dull metal. Character colors remain lively.
- Fox region: deep teal structure, coral lanterns, warm peach focal accents.
- Bramble region: clover and jade structure, lilac flowers, honey-colored paths.
- Stag region: moss and stone structure, pale antler ivory, controlled mint crystal light.
- Summit: colder air and deeper sky values, with a concentrated warm destination. Keep the final rescue readable and welcoming rather than turning the entire game grim.

These are direction targets, not sampled color standards. Before production, create a small approved swatch sheet and check it against the actual game backgrounds.

For character sheets, choose a consistent soft upper-left key light and modest cool fill. Do not bake a huge directional ground shadow into every sprite. The scene should provide a separate contact shadow where needed. Outline weight must survive reduction; interior lines should be less dominant than the outer contour.

Concentrate detail where it supports recognition: face, natural weapon, one repair patch. Leave the belly, broad shell, and major wing panels comparatively calm. At small size, silhouette and value grouping must carry the design when texture disappears.

### 7. Environment art with an observable history

Each region needs a repeatable sequence: **arrive → notice occupation → approach the stronghold → restore the place**. Use existing regions first. Do not commission thirteen entirely separate paintings as the opening move.

Build a region kit from a clean arena base, a recognizable distant landmark, a small set of foreground props, and occupation/restoration overlays. Three encounters can reuse the base with purposeful changes in staging and props. A boss encounter receives one stronger focal assembly and portable leader dressing.

**Fox Land: lantern paths and stolen deliveries.** Retain the current pink-rooted trees and teal foliage, but clear the center of the battle plate. Proposed story evidence: an interrupted lantern route, stacked delivery baskets, a gang strap across the bridge approach. After rescue, one basket is unpacked, a lantern relights, and the open path points upward. Coral light should frame action, not compete with every peg.

**Bramble: a neighborhood of burrows.** Keep the clover bowl, flowers, and rounded burrow doors. Add signs of a lived-in place: a small watering can, a hanging scarf, a repaired stepping stone, a window light. Occupation is visible through a barred door or a repurposed picnic crate. Restoration opens doors and brings tiny silhouettes back into windows. The region should feel like people live here between fights.

**Stag Land: a high garden and observatory.** Retain stone rings, antler shapes, and floating elevation. Proposed dressing: survey ribbons, a turned-off lens, crystal fittings commandeered as a gang barricade. After victory, a line of light reconnects the standing stones and distant air traffic resumes. Use geometric staging to feel calmer and grander than the lower regions.

**Sky Dock and summit:** connect them visually. A broken departure pennant or missing bridge fitting introduced at the dock should return repaired in the ending. The summit may gather small recognizable pieces from all three regions as hoarded cargo. The player sees that the final place belongs to the same story.

The Forgotten Realm already exists as art but is not established as a required current campaign stop. Reserve it for a later side experience, collection destination, or epilogue. Do not expand the map just to use an attractive image.

### 8. The first encounter as the quality target

Before expanding the full asset library, direct this exact sequence:

1. The opening screen shows Abbie with a clear destination and one recognizable missing connection. The environment is inviting, with enough empty space for the title and controls.
2. The climb introduces the Fox region’s landmark, the gang’s small broken-ring flag, and a route that is visually interrupted ahead.
3. The first encounter shows the porcupine in a low glove guard. The captive’s expression is visibly worried. A familiar lantern or supply basket places this battle in the same world as the climb.
4. The first successful hit gives an immediate local response: glove recoil or body squash, followed by the damage information. The physical reaction and number agree in timing.
5. When the last foe is defeated, the release is legible in a brief ordered beat: the latch opens, the captive changes posture, then a small piece of the environment recovers.
6. The shop appears to belong to that restored route. It contains the same basket material and lantern construction, with charms displayed as physical objects.
7. Returning to the map reveals one persistent local change. The player can point to what their success accomplished.

This is the visual standard for the rest of the game. If these screens do not belong together, making twenty more monsters will multiply the inconsistency.

### 9. Combat, marbles, and effects

The peg board remains the primary action surface. Richer art should improve the clarity of launch, collision, damage, and rescue, not occupy the board’s useful area.

Use three effect scales:

- **Contact:** a tiny impact flash, a short squash, a quick chip of dust, or a small ring. It identifies a single event.
- **Ability:** a distinct silhouette and motion vocabulary for fire, split, refresh, bombs, and major charm triggers. A player should identify the event without reading a log.
- **Story payoff:** a brief release or restoration event after combat has resolved. This gets more room because it does not compete with aiming.

Different effects should have different verbs. Fire licks or curls; split separates cleanly into three paths; refresh grows or unfolds; crit snaps with a sharp star; gold gives a short warm glint; defense compresses into a soft ring. Do not use the same generic sparkle burst for everything.

Keep the existing peg meanings consistent. Decoration must not accidentally create targets that resemble interactive pegs. Background glints should remain dimmer and less sharply edged than active board elements. Color should be reinforced by shape or motion where possible.

Marbles can share a common glass grammar while retaining distinct cores: cloudy, leaflike, electric, fluffy, or crystalline forms. Their level progression should be a small controlled visual development—clearer core, brighter inner band, one extra feature—rather than a new unrelated object at each level. Coordinate with the builder before implying new mechanics.

### 10. UI as part of the world

Keep the interface readable and compact. The existing You / Bad guys / Rescue grouping is a useful information structure. Art direction should clarify those roles with a consistent portrait treatment and restrained material cues.

Use a small family of components: warm paper labels, dark translucent information panels, enamel reward medallions, and stitched or cord-linked ornamental accents. Pick where each material belongs. A single panel should not contain wood, paper, metal, glass, leather, and glowing runes all at once.

Replace generic event symbols selectively: a dock token, regional gate, shop marker, rescue marker, and summit marker provide more narrative value than redrawing every utility icon. Keep universal controls—back, pause, audio—plain enough to find immediately.

Build a matching hero/enemy/captive portrait system. A bright open hero frame, angular subdued gang frame, and soft hopeful captive frame can help distinguish roles without heavy labels. Confirm at actual size that the artwork is not reduced to a mass of spikes or hair.

The shop should feel like a stop on the journey. A recurring shopkeeper or portable stall is a proposed character opportunity, not an existing fact. Begin with one expressive merchant silhouette and three meaningful reactions: welcome, transaction, and sympathetic recovery. Reuse a stall kit with local fabrics and one region prop.

### 11. Embellishments that tell a story

The best embellishments have a reason to exist and a restrained trigger.

- **A mended glove:** a large recognizable patch on the porcupine suggests cheap gang equipment and repeated failure. A loose seam can flap once during a heavy reaction.
- **A cargo label without readable text:** a simple region emblem on a crate links the gang’s stash to the place being rescued. Use a controlled overlay for the emblem.
- **A worried window:** one pair of eyes behind a burrow curtain becomes a waving silhouette after rescue. Two states communicate a community.
- **A leaning sign:** occupation leaves it facing the wrong way; after rescue it points up the route. It reinforces navigation as well as story.
- **A missing chime:** the dock begins with one silent hanging frame; a restored piece appears later. The visual can receive a short musical confirmation.
- **A floating feather or leaf:** ties a transition to its destination. Use one regional particle family rather than universal glitter.
- **A little trail of repair:** thread, knots, bandages, or carefully fitted stones repeat Abbie’s practical kindness. Keep these away from target areas.
- **An embarrassed gang exit:** a bat drops a heavy cuff, a crab tries to carry too much, a porcupine readjusts an oversized glove. Comedy resolves tension without celebratory cruelty.

Each embellishment should have a still fallback. Ambient movement pauses or simplifies for reduced motion. Avoid repeated flashes, constant bobbing in every portrait, or particles that obscure the aiming path. The player’s attention is a finite resource.

### 12. Sound and motion direction

No new music generation is included in this pass. For a later Suno brief, commission a small musical family rather than unrelated tracks per screen.

The journey needs a recognizable melody that can appear as a curious dock phrase, a driving battle version, a warm shop fragment, and a complete rescue cadence. Region instrumentation changes the setting while the melody keeps the identity. Give the gang a short rhythmic answer or clumsy low-register motif rather than an entirely disconnected soundtrack.

Motion can remain economical: a few keyed transforms, separate wing or cloth layers where justified, brief anticipation holds, and small reaction poses. Reserve elaborate sequences for first entry, boss arrival, and final rescue. Clean timing will improve quality more than indiscriminate animation volume.

### 13. Extending the story into the rest of Abbie’s World

The wider product brief already supports exploration, play, earning, creation, collection, and home personalization. Carry the rescue journey back into those spaces through objects and relationships.

**Home:** a rescued region can contribute a modest decorative keepsake—a lantern, potted clover, crystal chime, or repaired sign. Put it on a shelf or outside the treehouse. A display should tell where it came from without requiring a menu description. Whether it unlocks persistently is a product decision; the art can be prepared independently.

**Card Factory and creative spaces:** use the same cord loops, enamel fittings, and painted construction details. Make the place look as though someone in this world made the charms and marble fittings. Keep creation tools visually distinct from enemy equipment.

**Collections:** build a field-journal or travel-shelf presentation with portraits, region emblems, and small provenance illustrations. A collection entry can show the character in a calmer post-rescue context. Do not make every collectible a separate incompatible frame style.

**POI exteriors and interiors:** preserve the existing separation between maps and independently composited POIs. Every important exterior should have one shape, material, or light cue that reappears inside. A child should recognize that the interior belongs to the building they tapped.

**Seasonal art:** change local props and costumes within the established materials and lighting. Avoid replacing the whole visual identity for an event. The core cast and navigation cues should remain familiar.

### 14. Production order and deliverables

The following is a staged production proposal. Counts describe art deliverables or art families, not a credit estimate or a promise that one generation yields one finished asset.

**Stage A — Establish the cast and the rules.** Complete this five-character concept set; choose one candidate per species; make a scale lineup; lock Abbie’s painted interpretation; define leader/captive hierarchy; approve a swatch and material sheet. Deliver five henchman masters, one Abbie identity sheet, one visual-rules sheet, and a contact sheet. Finish one complete henchman pose set before commissioning the other four.

**Stage B — Prove the first rescue sequence.** Deliver one actor-free Fox arena base, one occupation overlay, one restoration overlay, one small prop kit, one matched captive expression set, one shop presentation, and mockups of opening/map/battle/rescue/shop. Reuse current art where it already fits. This is the highest-priority review after the five henchmen.

**Stage C — Expand the reusable systems.** Finish the five henchman pose sets, standardize four leader portraits and portable dressing, reconcile the captive families, and establish the marble/charm presentation. Produce a small reusable impact/release effects family. Match identity and pivots before expanding effects.

**Stage D — Give each land a story.** Add Bramble and Stag region kits, distinct landmark tokens, boss dressing, and post-rescue map changes. Refine the climb art and summit composition around the actual thirteen-fight route. Author variations from regional kits instead of thirteen independent painted scenes.

**Stage E — Connect the journey to the world.** Add home keepsakes, collection presentation, POI material continuity, and a small set of recurring civilian cameos. Commission music variants after the visual emotional arc is approved, so sound and image share a brief.

Suggested first production backlog after this concept pass, in order:

1. Five-character scale and silhouette lineup with final selections.
2. Abbie identity reconciliation beside the porcupine at actual HUD scale.
3. Actor-free first-fight arena and its safe gameplay area.
4. Fox captive worried/hopeful/free sequence.
5. Shared latch/rope/flag/lantern prop kit.
6. First rescue payoff and changed map mockup.
7. Shopkeeper/stall direction.
8. Porcupine complete reaction/attack set.
9. Four remaining henchman pose sets.
10. Leader role dressing and regional arena expansion.

### 15. How to commission consistent assets

Every brief should specify purpose, view, silhouette, dominant colors, costume invariant, light direction, target screen context, and what must stay empty. Use the approved style image to transfer rendering; use the approved character master to preserve identity. These are different jobs.

Character brief pattern:

> One approved character, specified pose and facing, unchanged anatomy/costume/colors, same apparent scale and camera; painted cel shading, restrained leather wear, clear negative spaces; whole silhouette visible; isolated background suitable for extraction; no text or environment. Review against the master at game size.

Environment brief pattern:

> One established region, identified landmark and materials, prescribed camera and light; actor-free arena base with quiet central gameplay area; layered foreground dressing at the edges; no baked-in hero, captive, boss, UI, words, or interactive targets. Occupation and restoration are separate overlays.

Prop brief pattern:

> One object family in the established world materials, clear function and silhouette, consistent angle/light; controlled variations showing intact, occupied, or restored state; no tiny generated lettering. Keep emblem placement available for a separate controlled graphic.

Respect the current Midjourney limit: one image per thirty seconds, implemented conservatively as at least two minutes between four-candidate submissions. No parallel generation submissions, automated bursts, or automatic reroll loops. Review each batch and make a specific correction before another pass. The rate limit is a ceiling, not a reason to fill every available slot.

### 16. Review gates

An asset can be beautiful and still fail its intended job. Review in this order:

1. **Identity:** can we tell who or what it is without a label?
2. **Silhouette and anatomy:** are limbs, wings, claws, quills, and costume readable and plausible for this stylized creature?
3. **Small-size read:** inspect at intended screen size and at a deliberately smaller thumbnail. Face, orientation, and action must survive.
4. **World fit:** does it share contours, light, materials, and detail density with the approved family?
5. **Story contribution:** what does it tell the player about the place, faction, action, or outcome?
6. **State continuity:** do the poses and before/after images describe the same character or location?
7. **Composition:** are important edges intact, margins adequate, and the gameplay area free?
8. **Technical handoff:** correct source identity, alpha where needed, dimensions, pivot/scale note, semantic name, and an honest status.

Require the first six to pass before spending effort on a large derivative set. Cosmetic excitement should not overrule missing limbs, unreadable posture, or a confusing role.

### 17. Handoff and ownership

The art director owns briefs, candidates, selections, style sheets, source provenance, pose and state specifications, screen mockups, and visual review. The builder owns asset import, runtime wiring, animation implementation, builds, tests, and device validation.

For each selected master, provide: original download, exact job URL and candidate index, prompt and reference image, selection notes, approval state, intended semantic role, next required states, and any known deviations. Preserve the original even when a transparent derivative is made. Background extraction can alter edges or details; compare it with the original before accepting it.

Store crop/portrait and full-body combat art as separately specified uses. Do not assume a new attack image replaces a portrait selected by the runtime. The earlier porcupine integration demonstrated why the builder must check the actual image displayed in each state.

Current status: porcupine candidate 4 is user-approved. The four new characters are art-director recommendations for review. Their concepts are not automatically approved for production integration. Prior porcupine code changes remain local and unbuilt; this pass performs art production and planning only.

### 18. The decision that matters most

Make the player feel that helping changes the world. A more coherent game will emerge when the same glove patch, lantern, latch, melody, and repaired bridge connect its screens. Higher-resolution pictures alone cannot provide that continuity.

The next artistic milestone should be a convincing first rescue sequence that looks as though every piece was designed together. Once that exists, the rest of the game has a standard it can grow from.

### Source notes

Repository reviewed: `/Users/evanrobinson/abbies.world.ios`, current local checkout on `review/marble-voyage-plink` with earlier local porcupine changes present.

Primary evidence: `Models/World2/PeglinEdition/MarbleVoyageArt.swift`, `MarbleVoyageModels.swift`, `MarbleVoyageGangRun.swift`, `PlinkAttackerKind.swift`, `MarbleVoyageCharm.swift`, and `Views/World2/Plink/PlinkBattleHostView.swift` under the app source tree; `docs/ABBIES_WORLD_2_PRD.md`; `prototypes/marble-voyage-art/manifest.json`; the specific bundled images described above.

Older narrative context consulted with caution: `docs/minigames/MARBLE_VOYAGE_ART_MANIFEST.md`, `MARBLE_VOYAGE_APP_STORE.md`, and `docs/current-state/PEGLIN_EDITION.md`. Where these disagreed with current inspected code, this plan uses the code for present behavior and labels creative additions as proposals.
