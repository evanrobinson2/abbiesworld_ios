# Midjourney Prompting Guide

This guide defines how to prompt Midjourney for the Rome History Videos project.

The core rule is simple:

> **Describe the output mechanically, as if you are inspecting the finished image and reporting exactly what is physically visible.**

Do not explain what the image means. Do not narrate the story. Do not describe the intended emotional effect in abstract terms. Describe the visible causes of that effect.

---

## 1. Prime Directive: Describe the Finished Image, Not the Idea Behind It

A Midjourney prompt should read like a mechanical description of the final frame.

Bad:

- an angst-ridden coming-of-age portrait
- a tragic hero confronting his destiny
- a mythic image of betrayal
- an emotionally devastating scene
- a reluctant hero achieving a victory he never wanted
- the helmet symbolizes Rome passing into Alaric's hands

Good:

- a 14-year-old boy staring toward camera, lower eyelids wet, jaw clenched, shoulders slightly hunched
- a middle-aged warrior with a scarred face, narrowed eyes, mouth closed and downturned, shoulders heavy, standing before burning buildings
- a child gripping an oversized Roman helmet with both hands while smoke rises behind him
- an older man wearing a battered iron helmet with a long nose guard, gray-streaked beard, soot on his face, black smoke filling the sky behind him

**Translate every abstract instruction into something that can be seen.**

If a concept cannot be photographed, painted, framed, lit, posed, textured, or physically represented, it probably does not belong in the prompt.

---

## 2. Prompt the Image as a Camera Would See It

Build prompts from visible components:

1. **Subject** — who or what is physically in frame
2. **Physical appearance** — age, build, face, hair, eyes, scars, dirt, clothing
3. **Pose and expression** — head angle, gaze, mouth, brows, hands, shoulders, stance
4. **Objects and accoutrements** — helmet, armor, cart, weapon, straps, buckles, shields
5. **Environment** — architecture, terrain, tents, wagons, ruins, smoke, fire
6. **Composition** — left/right placement, foreground/background, scale, overlap, negative space
7. **Camera** — eye level, low angle, 50mm, close portrait, wide establishing shot
8. **Lighting** — overcast daylight, firelight, rim light, hard side light, smoke diffusion
9. **Materials and surface detail** — iron rivets, wool weave, leather straps, soot, scratched metal
10. **Rendering style** — ink linework, watercolor wash, graphic novel, painterly realism, etc.

This is the correct mental model:

> **If the final image were already hanging on the wall, how would you describe exactly what you see?**

---

## 3. Never Substitute Narrative Language for Visible Detail

Do not say:

- heroic
- tragic
- reluctant
- haunted
- noble
- mythic
- betrayed
- victorious
- frightened
- hopeful
- devastated
- coming-of-age
- destiny
- symbolic

unless the word is immediately converted into visible anatomy, posture, lighting, or environment.

Examples:

### "Haunted"
Instead of:
> haunted young Alaric

Use:
> pale face, fixed distant gaze, slightly widened deep-blue eyes, lips parted, soot beneath the eyes, shoulders held rigid

### "Fierce but forlorn"
Instead of:
> fierce but forlorn adult Alaric

Use:
> brows drawn inward, jaw set, direct stare, exhausted eyes, mouth closed and slightly downturned, shoulders heavy rather than raised

### "Victory he never wanted"
Instead of:
> an unlikely hero achieving a success he never wanted

Use:
> adult warrior standing motionless before burning Rome, weapon lowered, shoulders sagging slightly, unsmiling face, soot and exhaustion around the eyes

### "Fear"
Instead of:
> terrified child

Use:
> eyes widened, chin pulled back, mouth slightly open, fingers clenched around the cart rail

---

## 4. Keep Prompts Concise

Long prompts create two problems:

1. important visual instructions become diluted
2. Midjourney starts averaging incompatible details into generic fantasy/concept art

The goal is not to describe every atom in the image. The goal is to specify the few visible constraints that matter most.

Prefer:

> young Alaric lower left, 10 years old, dark curls, deep-blue eyes, soot-streaked face, holding a battered Roman helmet beside a refugee cart; adult Alaric upper right, long dark hair streaked gray, scarred face, gray beard, wearing a matching iron helmet with nose guard, mail and leather armor; burning Rome behind him, marble columns, arches, terracotta roofs, orange flames, thick black smoke; fractured ink-and-watercolor illustration, sharp black linework, pale cyan and cream washes, rust-orange fire --ar 2:3

Over a several-hundred-word inventory of minor objects.

### Practical rule

Start with the shortest prompt that captures:

- primary subject
- critical continuity details
- composition
- environment
- house style

Only add detail to fix a specific failure observed in output.

---

## 5. Do Not Say "Same" Unless the Reference Mechanism Actually Carries Identity

Midjourney does not reliably interpret phrases like:

- same man
- same helmet
- same face
- same boy grown older

as precise visual continuity.

If a feature must recur, **repeat the physical characteristics explicitly.**

Weak:

> young Alaric and the same man as an adult

Better:

> young Alaric with deep-blue eyes, narrow straight nose, strong dark brows, dark curly hair; adult Alaric with deep-blue eyes, narrow straight nose, strong dark brows, long dark hair streaked gray

Weak:

> adult wearing the same helmet

Better:

> boy holding a battered iron helmet with tall central ridge, broad brow band, riveted cheek guards, and long narrow nose guard; adult wearing a battered iron helmet with tall central ridge, broad brow band, riveted cheek guards, and long narrow nose guard

When continuity matters, repeat the **identifying geometry**.

---

## 6. Describe Objects by Construction, Not by Category Alone

Midjourney often melts historical equipment into generic fantasy shapes unless the object is mechanically described.

Weak:

> Roman helmet

Better:

> battered late-Roman iron helmet, central ridge, broad brow band, riveted cheek guards, long narrow nose guard, visible dents and scratches

Weak:

> armor

Better:

> iron mail with individually visible rings, leather shoulder straps, bronze buckles, wool cloak

Weak:

> refugee cart

Better:

> rough wooden two-wheel cart, spoked wheels, canvas bundles, worn timber rails

The test is: **could a prop builder reconstruct the object from the words?**

---

## 7. Historical Accoutrements Must Remain Readable

In this project, armor, clothing, tools, wagons, architecture, helmets, and weapons are not decorative noise. They carry historical information.

Avoid outputs where:

- mail becomes an indistinct gray texture
- straps fuse into armor
- buckles disappear
- helmets become generic fantasy crowns
- shields melt into background shapes
- carts lose mechanical structure

When detail is important, explicitly require:

- readable construction
- distinct materials
- identifiable object boundaries
- crisp focal detail

Useful phrases:

- readable chainmail rings
- distinct leather straps and bronze buckles
- clearly defined cheek guards
- visible helmet rivets
- recognizable wooden spokes
- sharply rendered foreground equipment

Do not ask for equal detail everywhere. Keep focal objects sharp and allow background elements to loosen.

---

## 8. Eyes Must Be Anatomically Normal Unless Deliberately Stylized

A recurring failure mode is blank, glowing, or unnaturally pale eyes.

When realism of expression matters, specify:

> deep-blue irises, dark pupils, normal white sclera, natural catchlights

Avoid overprompting tears. Midjourney may produce giant theatrical tears.

If moisture is desired:

> slightly wet lower eyelids

not:

> eyes overflowing with tears, emotional crying

For most young-Alaric images, prefer a normal child expression unless a tear is specifically needed.

---

## 9. Emotion Must Be Written as Anatomy

Expressions should be built from visible facial mechanics.

### Tense
- jaw set
- lips pressed together
- brow slightly contracted
- neck muscles taut

### Exhausted
- heavy upper eyelids
- darkened skin beneath eyes
- relaxed lower face
- shoulders slightly lowered

### Uncertain child
- slightly parted mouth
- brows raised subtly toward center
- gaze fixed upward or forward
- chin slightly tucked

### Angry
- brows sharply lowered
- nostrils flared
- jaw clenched
- lips tight

### Restrained grief
- wet lower eyelids
- mouth closed and slightly downturned
- distant gaze
- shoulders heavy

Use only the physical signals needed.

---

## 10. Composition Must Also Be Mechanical

Do not say:

> the past and future merge together

Say:

> boy positioned lower left, adult positioned upper right, smoke and broken architecture crossing the center, no hard vertical seam

Do not say:

> adult Alaric dominates the image

Say:

> adult Alaric occupies the upper-right two-thirds of the frame, head and shoulders larger than the child figure

Do not say:

> the boy is vulnerable

Say:

> child is smaller in frame, lower in the composition, shoulders narrow, oversized helmet held against his body

Think in terms of:

- frame percentage
- foreground/midground/background
- scale relationships
- eye line
- overlap
- direction of gaze
- silhouette
- negative space

---

## 11. Make Locations Visually Unmistakable

Do not rely on a location name alone.

Weak:

> Rome burning

Better:

> monumental marble columns, triumphal arch, temple facade, terracotta rooftops, statues, dense stone city blocks, orange flames, thick black smoke

Weak:

> Marcianople aftermath

Better:

> burned refugee wagons, torn canvas tents, broken spear shafts, abandoned round shields, trampled mud, blackened timber, low fires, pale smoke

If the viewer must instantly identify the setting, provide **iconic physical evidence**.

---

## 12. Fire and Destruction Need Physical Volume

If a city is supposed to be burning, do not merely say "burning city."

Specify visible fire behavior:

- orange flames emerging from windows
- rooftops burning
- black smoke columns
- smoke rolling across the skyline
- glowing interiors
- collapsing masonry
- embers crossing the foreground

Likewise, a battlefield aftermath should include physical residue:

- trampled earth
- broken timber
- abandoned shields
- torn canvas
- damaged carts
- ash
- low fires
- smoke

---

## 13. Preserve the House Style with References Whenever Possible

The project style is specific enough that text alone may drift toward generic historical illustration or fantasy concept art.

When exact visual continuity matters, **use the approved reference image/style reference** and keep the text focused on what changes in the new image.

Do not attempt to reproduce the entire style through a huge adjective stack.

Useful compact style description when needed:

> fractured ink-and-watercolor illustration, sharp black linework, broken angular forms, pale cyan and cream washes, rust-orange accents, visible paper texture, detailed focal faces and equipment, loose unfinished edges

Important visual properties of the established style:

- sharp angular ink contours
- broken/fractured geometric forms
- flat pale cyan, cream, charcoal, and muted rust fields
- sparse watercolor/gouache washes
- visible paper texture
- selectively incomplete edges
- detailed focal faces and equipment
- looser backgrounds
- negative space used intentionally
- no glossy digital finish
- no generic fantasy-concept-art smoothing

When asking for greater fidelity, increase **object readability and anatomical precision**, not glossy realism.

---

## 14. Higher Fidelity Does Not Mean Photorealism

If an image needs more fidelity, specify:

- realistic anatomy
- clear pupils and irises
- crisp facial features
- readable equipment
- individually visible mail rings
- helmet construction
- distinct material boundaries
- precise linework

Do **not** automatically add:

- photorealistic
- hyperrealistic
- cinematic realism
- glossy skin
- digital concept art

Those terms can destroy the established visual language.

The desired balance is:

> **graphic style + mechanically legible objects + anatomically believable faces**

---

## 15. Use Reference Images for Style; Use Text for Delta

When a reference image already captures the correct style, character, palette, or composition:

- let the reference carry those qualities
- use the prompt primarily to describe the **delta**

Example:

If the reference already has adult Alaric, burning Rome, and the correct style, and the only failure is the helmet:

> adult Alaric wearing a large battered late-Roman iron helmet, tall central ridge, broad brow band, riveted cheek guards, long narrow nose guard fully visible over the bridge of the nose; preserve existing face, hair, armor, composition, fire, smoke, architecture and ink-and-watercolor treatment

Do not rewrite the entire scene unless the entire scene needs to change.

---

## 16. Iterate by Diagnosing the Specific Visual Failure

Do not rewrite from scratch after every generation.

Inspect the output and identify the precise failure:

- helmet missing
- nose guard missing
- child too old
- eyes too pale
- Rome not recognizable
- too much white space
- armor indistinguishable
- hard split between eras
- adult looks triumphant instead of exhausted
- style drifted toward smooth realism

Then modify only the relevant prompt clause.

This is closer to debugging than prose writing.

### Example

Failure:
> adult is bareheaded

Do not merely add "helmet" somewhere in the middle.

Move it to the beginning of the adult clause:

> adult Alaric upper right, **wearing a large battered late-Roman iron helmet with long narrow nose guard...**

Important features should appear early and concretely.

---

## 17. Use Negative Prompts Sparingly

Negative prompts can help with recurring failures, but they should not become a second giant prompt.

Useful examples:

- `--no text`
- `--no fantasy armor`
- `--no glowing eyes`
- `--no blank eyes`
- `--no hard vertical seam`

Only add negatives for failures Midjourney is actually producing.

---

## 18. Mechanical Prompt Formula

A reliable compact structure is:

> **[subject + position]**, **[physical appearance]**, **[pose/expression]**, **[critical object details]**; **[second subject if needed]**; **[environment]**; **[lighting]**; **[house style]**; **[parameters]**

Example:

> young Alaric lower left, about 10, slim, messy dark curls, deep-blue eyes, soot-streaked face, holding a battered iron helmet with central ridge, riveted cheek guards and long nose guard beside a wooden refugee cart; adult Alaric upper right, deep-blue eyes, narrow straight nose, long dark hair streaked gray, scarred face, gray beard, wearing an iron helmet with central ridge, riveted cheek guards and long nose guard, mail and leather armor, jaw set, exhausted eyes; burned wagons and torn tents behind the boy, marble columns, triumphal arch, terracotta roofs, orange fire and thick black smoke behind the adult; fractured ink-and-watercolor illustration, sharp black linework, pale cyan and cream washes, rust-orange accents, detailed faces and equipment --ar 2:3

That is usually enough.

---

## 19. Anti-Patterns

### Do not narrate
Bad:
> the boy who was humiliated by Rome becomes the man who conquers it

The model does not need the plot. Show the two visible states.

### Do not explain symbolism
Bad:
> the helmet represents Rome's power passing into Alaric's hands

Show the child holding it and the adult wearing it.

### Do not use screenplay direction as a substitute for visuals
Bad:
> we realize this is the same boy thirty years later

Specify repeated facial features and helmet geometry.

### Do not over-specify every background object
Too many instructions lower priority on the important ones.

### Do not use abstract tone words when anatomy will work better
Bad:
> forlorn

Better:
> exhausted eyes, mouth slightly downturned, shoulders lowered

### Do not assume names produce identities
"Alaric," "Fritigern," and "Lupicinus" are not sufficient visual descriptions.

---

## 20. Final Checklist Before Sending a Prompt

Before submitting a prompt, ask:

- Can every important phrase be physically seen in the finished image?
- Have abstract ideas been translated into expression, pose, environment, lighting, or composition?
- Is the prompt shorter than it needs to be, rather than longer?
- Are the 3–5 most important visual requirements obvious and early?
- If identity continuity matters, have physical features been repeated explicitly?
- If an object matters, is its construction described clearly enough to remain recognizable?
- Are eyes anatomically normal unless intentional stylization is required?
- Is the location visually recognizable without relying on the place name?
- Is the reference image carrying the house style where possible?
- Am I fixing the specific failure from the previous generation rather than rewriting everything?

---

# One-Sentence Rule

**Prompt Midjourney by describing the finished frame mechanically: what is physically visible, where it is, what shape and material it has, how the subjects are posed and looking, how the scene is lit and framed, and how the marks are rendered — never by narrating what the image means.**
