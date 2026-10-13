# Rescue prologue — asset and prompting plan

Status: production plan, not a generation batch or asset approval. New illustrations are allowed; existing character identities remain fixed. Raze and Vix portraits anchor rendering style. The earlier fox/hare candidate does not define the final style.

## Recovered prompting lessons

Read locally:
- `/Users/evanrobinson/rome_history_videos/bible/08-midjourney-prompting-guide.md`: describe the finished frame mechanically; emotion through visible anatomy; repeat identifying geometry; keep prompts concise; references carry style, text carries the change; revise the specific observed failure.
- `/Users/evanrobinson/rome_history_videos/prompts/style-benchmark.md`: a style must survive faces, groups, environments, ordinary joy and intimate action, not merely produce one attractive picture.
- Cursor transcript `/Users/evanrobinson/.cursor/projects/Users-evanrobinson-Documents-Gothic-Invasion-of-Rome/agent-transcripts/e571b6a1-c48d-4c6d-abe6-f4380036f0a7/e571b6a1-c48d-4c6d-abe6-f4380036f0a7.jsonl`, lines 91 and 126: Evan wanted a consistent aesthetic across subjects, with distinct emotional moods within it.

GitHub connector searches returned no matching excerpts. The local guide and transcript are the evidence used; no claim that the precise later Marcianople prompting conversation was recovered.

## Style anchor — direct inspection of Raze and Vix

- Confident angular dark contours, broken painted edges and graphic shapes.
- Faceted cel-painted light/shadow masses; selective brush texture rather than uniform noise.
- Warm ochre/coral surfaces, restrained teal accents, deep charcoal darks. Preserve character-specific fur and eye colors instead of making every subject orange.
- Clear eye and mouth shapes, expressive ears, readable silhouette at small size.
- Detail concentrated on faces, clothing seams and important contact points; simplified backgrounds.
- No pixel-art instruction, glossy 3D finish, photorealism or giant adjective stack.
- Transfer the drawing language, NOT the bullies’ narrowed eyes, clothes, hostility or proportions to the friends.

Use existing character references separately from the style reference. A style reference is not an identity lock. Exact generation controls will be selected against the available Midjourney model when submitting, then held fixed for the shot family. A fixed seed is not a promise of identity continuity.

## Deliverables: 19 new illustrations plus the actual game handoff frame

These labels are shot numbers inside this storyboard, not new game asset semantic IDs. Approved production requests will use the existing art-request queue.

| Shot | Asset | Framing / visible action | Compatibility requirement |
| --- | --- | --- | --- |
| E01 | Clean clearing master | Wide, flowering canopy, roots, play circle, path exiting upper right; no actors | One geography and upper-left afternoon light for every clearing shot |
| S01 | Friends playing | Medium-wide Fox left, Bramble right, looking at each other around small play circle | Warm relaxed postures; marbles remain small |
| S02 | Fox takes a shot | Medium Fox face plus extended paw; Bramble can remain outside frame | Action legible without giant marble macro |
| S03 | Fox’s sheepish reaction | Close three-quarter face, lowered ears, sideways glance toward Bramble, slight crooked smile | Playful embarrassment, not shame or fear |
| S04 | Bramble laughs | Close face, softly narrowed amethyst eyes, raised cheeks, small open smile, ears relaxed | Kind laughter; preserve clover details, not a sneer |
| S05 | Both notice the bullies | Medium two-shot, mouths closed, heads turned toward entrance, Bramble ears raised | Same positions; no inexplicable reverse eyelines |
| S06 | Raze interrupts | Full-body low-medium view, one foot across the disturbed circle, hands/feet visible | Established mask, ears, muzzle, jacket geometry; scuff visible |
| S07 | Vix blocks the path | Full body across path, planted feet, arms out enough to block passage | Preserve smaller silhouette and costume; do not duplicate Raze |
| S08 | Net descends | Medium group action, mesh reaching around the friends, Vix’s grip visible | Understandable rope path; no merged paws, bodies or net |
| S09 | Captured friends | Close two-shot through loose mesh, faces clear, friends leaning together | Worried, unharmed; no smiling stock expressions or strangling rope |
| S10 | Departure uphill | Wide group moving toward upper right, Bramble looking back | Same cast, net, path direction and light; all bodies accounted for |
| S11 | Clearing after interruption | Match E01 camera, disturbed ring, displaced small marbles, empty friend positions | Derive through a controlled edit of E01; do not redesign the clearing |
| S12 | Abbie and dog arrive | Medium pair entering from lower left, heads turned toward path | Approved Abbie and companion identity references required first |
| S13 | Abbie sees her friends | Over-shoulder Abbie/dog, departing group visible on near path | Readable friends at iPad scale; same direction as S10 |
| S14 | Abbie’s concern | Close face looking up-right, raised inner brows, parted mouth | Exact existing face/hair/outfit; no invented redesign |
| S15 | Abbie decides | Matched crop and gaze, mouth closed, chin slightly lifted, shoulders upright | Change expression/posture only; permit a convincing expression cut |
| S16 | Dog’s alert reaction | Close head/upper body, face and horn readable, gaze toward path | Verify actual approved Shih Tzu/unicorn reference before drafting identity clause |
| S17 | At the foot of the climb | Wide Abbie/dog small in lower foreground, route visibly begins beside them | Reconcile with actual Marble Voyage terrain and start position |
| E02 | Continuous ascent | Tall mountain plate with one readable winding route and cloud depth | Existing world geometry; no newly invented floating kingdom |
| H01 | First gameplay view | Actual runtime frame/composition matched to S17/E02 | Capture from game, not generated fake UI; production integration required |

Not all nineteen require independent generations: S11 is an edit, S14/S15 are a matched pair, and approved large masters may support real crops. Never crop an absent expression into existence.

## Derived compositing layers

From accepted masters: foreground root/canopy occluder, midground ground/path, distant background, correctly shaped bully shadow, sparse rose-petal sprites, net front/back masks where needed, foreground/distant cloud layers, and character cutouts only for shots that need independent movement. Every extracted layer needs edge, contact-shadow and occlusion review. No generic fog, glows, sparkles or extra props.

Panel borders, letterbox, dialogue lettering, controls and wipes are rendered by code. Do not generate text baked into paintings. Distinguish reviewer labels from player-facing content.

## Production sequence

1. Establish a reference card for Fox, Bramble, Raze, Vix, Abbie and the companion: exact source, face/eye/fur shapes, proportions, markings, costume and immutable details. Companion remains unresolved until a real reference is found.
2. Test four useful shots, not unrelated style samples: S04 laughing hare, S06 Raze full-body action, S01 two friends together, E01 environment. These test joy, antagonist action, multi-character separation and landscape in the same drawing language.
3. Inspect the four together. An attractive bully portrait is insufficient if the style cannot hold gentle laughter or a shared activity. Fix specific failures before multiplying assets.
4. Lock accepted style references, character references, palette/light notes, aspect ratios and model settings. Generate by family: clearing → reactions → interruption/capture → arrival → climb.
5. Inspect each image and its adjacent shots. Keep, repair or reject with a concrete reason. Store prompt, reference identities, model/settings, job/index, source hash, review status, permissible crops and intended shot.
6. Assemble and watch without captions. If capture, direction of travel or Abbie’s reason for following is unclear, fix the imagery rather than patching it with narration.

## Prompt construction

Reference roles: STYLE = approved portrait rendering; CHARACTER = approved identity; LOCATION = accepted clearing/climb master. Do not blindly blend them as equally weighted image prompts: that caused the previous hare to become fox-like. Where supported, use distinct reference controls; otherwise isolate characters or use controlled editing and inspect the result.

Text order: subject and shot size → identity features → visible pose/expression → placement and gaze → critical props → setting/light → short fixed rendering clause. One prompt describes ONE frozen moment. 'She laughs, then looks up, then runs' is three shots, not one still prompt.

Fixed rendering clause, provisional pending benchmark:
“angular dark ink contours, faceted painted cel shading, broken brush edges, crisp focal eyes and mouth, simplified background shapes.”

The following are content clauses to accompany validated references, not submissions with invented reference URLs or unverified model flags.

### S04 — Bramble laughing

“Close three-quarter view of the mint-white hare, lavender fur shadows, long relaxed ears, amethyst irises and dark pupils, small clover ornaments matching the character reference. Cheeks raised, eyes gently narrowed, mouth open in a small rounded smile, shoulders loose; gaze down-left toward the offscreen fox. Head and shoulders fill two-thirds of the frame. Soft teal tree roots behind, warm light from upper left. [Fixed rendering clause].”

Visible acceptance: friendly laughter with recognizable hare anatomy, no sharp mocking grin, no fox muzzle, no changed eye color. Clover placement must match the reference rather than being invented by this text.

### S03 — Fox after missing

“Close three-quarter view of the pink-orange fox, cream muzzle and chest, turquoise irises with dark pupils, established flower details matching the character reference. Ears angled slightly outward, head lowered a little, eyes turned right, one corner of the closed mouth raised. Chest and face visible, room on the right for the gaze. Dark teal roots behind; warm upper-left light. [Fixed rendering clause].”

### S06 — Raze interrupts

“Full-body Raze with the character reference’s tall pointed ears, long tan muzzle, dark eye mask, yellow eyes, orange patched jacket, teal lining and leather straps. Left foot planted across a shallow circle scratched into earth, a short scuff behind the sole, three small glass marbles displaced beside it. Chin raised, one side of the mouth lifted, gaze down-left toward the offscreen friends. Flowering tree roots behind; path on upper right; warm upper-left light. [Fixed rendering clause].”

### S09 — Captured friends

“Medium close view of the pink-orange fox with cream muzzle and turquoise eyes at left, mint-white long-eared hare with lavender shadows, amethyst eyes and established clover ornaments at right. Shoulders touching, mouths slightly open, heads turned left, hare ears raised and fox ears angled back. Loose coarse rope mesh surrounds their bodies, faces visible through wide openings, rope resting away from both necks. Teal roots behind; upper-left afternoon light. [Fixed rendering clause].”

### S14 → S15 — expression edit

Use a verified Abbie identity clause only after reference inspection. First plate: inner brows raised, lips slightly parted, eyes directed up-right. For the second plate: preserve face geometry, gaze, crop, clothing, lighting and background; close the mouth, lift the chin slightly, straighten the shoulders. Do not ask the model to portray “heroic destiny.”

## Review gate

Score suitability separately from approval: identity, emotion anatomy, intended action, tone, palette, line/shape language, anatomy/contact, eyeline and continuity. Any failure that changes who is present or what happened blocks narrative use. A visually pleasing image may remain a style reference while being rejected as a story plate. Final art approval is still distinct from proposing or generating candidates.
