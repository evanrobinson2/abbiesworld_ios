# Art Scout Chase — End-to-End Playthrough

**Status:** experience-first vertical slice (UI · artwork · interaction)  
**Format:** standalone playable prototype  
**Prototype:** `prototypes/art-scout-chase/index.html`  
**Audience:** a six-year-old on iPad  
**Out of scope for this pass:** progression, ranks, economy, metadata, household, persistence

---

## What the old Carmen games were

Classic *Where in the World is Carmen Sandiego?* was a detective loop dressed as geography class:

1. **Briefing** — ACME tells you a treasure was stolen.
2. **Travel** — pick a city on a world map.
3. **Investigate** — visit Airport / Library / Museum; NPCs give **text clues**.
4. **Deduce** — fill a warrant from attributes (hair, hobby, vehicle…).
5. **Arrest** — travel to the right city with a correct warrant.
6. **Promote** — climb ranks; next case.

The joy for older kids was *feeling clever while touring the world*. The friction for a six-year-old is reading, trivia, and soft-fail loops (“wrong city, try again”).

---

## Recast: 2026 Midjourney artwork showcase a six-year-old can play

**Working title:** Art Scout Chase  
**Kid pitch:** *Someone borrowed the Moonbeam from a painting. Follow the sparkles through dream-places and find who did it.*

| Carmen beat | Art Scout Chase beat |
|---|---|
| ACME HQ | Scout Lookout (Abbie-world cozy observatory) |
| Crime computer | Living painting that is *missing* its glow |
| World map | Travel carousel of full-bleed Midjourney destinations |
| Interview locations | Tap **inside** the artwork to lift visual clues |
| Clue notebook | Look Book of picture chips (no reading required) |
| Warrant | Assemble a silly Trickster portrait from chips |
| Capture | Spot the Trickster peeking in a final panorama |
| Rank / dossier | Deferred — this slice ends on delight + gallery |

The product bet is not “learn capitals.” It is:

> **Does a six-year-old want to keep opening the next painting?**

If the art is the hero and every tap makes the picture answer back, the Carmen skeleton still works.

---

## Production DNA borrowed from Abbie’s World

Use the best of what AW already ships — do not invent a new UI language.

| AW production strength | How this game uses it |
|---|---|
| Static Midjourney-grade plates + light motion | Every destination is a full-bleed plate; motion is sparkle, breath, parallax, not cutscenes |
| Explore → enter POI → play | Map carousel → enter plate → clue hunt |
| Light / intense music pair | Lookout light → chase intense inside plates → soft return |
| Chunk touch targets + gentle assist | Misses never punish; after 2 misses a glow path appears |
| Standalone minigame shell | One HTML (and later one Swift) entry; optional dismiss/complete |
| Seeded round for AI/text inspection | `data-scene`, `data-state`, `#debug-state` dump |
| Delight contract (Dino Picnic) | Every find = whoosh + haptic-feel pulse + short status phrase |
| No failure state | Wrong taps wobble; correct path always available |
| Brand-first first viewport | “ART SCOUT” is the hero signal before any case text |

---

## One complete playthrough (player seat)

Assume Abbie is on the iPad, landscape, finger-only. No parent help. ~3–5 minutes.

### Beat 0 — Brand cold open (first viewport)

**UI**
- Full-bleed Lookout plate (treehouse observatory at dusk).
- Brand wordmark **ART SCOUT** huge, centered over the sky, not a nav chip.
- One short line under it: *Follow the sparkles.*
- One CTA: big **GO** button bottom-center.
- Nothing else in the first viewport (no stats, no case list, no map chrome).

**Artwork**
- Warm green/gold Lookout interior bleeding into a violet evening sky.
- Tiny sparkle trail already drifting out the open window — the only motion.

**Interaction**
- Tap **GO**. Soft swell. Screen breathes into briefing.
- Idle >3s: GO pulses once; sparkles thicken toward the button.

---

### Beat 1 — Something left the picture

**UI**
- Same Lookout, but a giant framed painting dominates (edge-to-edge feel, not a card).
- The painting’s moon glow is *gone* — a soft empty circle where light should be.
- Guide face (Abbie or Scout Owl) at lower left with a 3–5 word bubble: *Moonbeam went walking!*
- One action: **Follow** (arrow along the sparkle trail).

**Artwork**
- The framed painting is already Midjourney-quality — a night meadow that *should* glow.
- Emptiness reads as a hole in light, not a broken UI element.

**Interaction**
- Tap the empty glow or **Follow**. The painting ripples; sparkles leap to the travel screen.
- Optional: tap the frame edges → gentle “not yet” shimmer, then auto-hint the empty moon.

---

### Beat 2 — Pick a dream-place (travel)

**UI**
- Full-bleed destination plate fills the screen.
- Left/right giant chevrons (thumb zones).
- Place name is a short spoken-style label under brand-thin chrome: *Candy Harbor*, *Cloud Kitchen*, *Mossy Library*.
- Bottom CTA: **Go here**.
- Tiny trail of collected sparkle dots (0/3) — ornamental, not a score.

**Artwork**
- Three destination plates, each a different Midjourney world. Swiping *is* the art showcase.
- No inset thumbnails. The map *is* the painting.

**Interaction**
- Swipe or tap chevrons to change worlds (crossfade + soft parallax).
- Tap **Go here** on any; for this authored playthrough the “correct” first stop is wherever sparkles are densest — Candy Harbor pulses first, but any choice works (clues reorder). For six-year-olds: **Candy Harbor is pre-highlighted** so they never stall.

---

### Beat 3 — Inside Candy Harbor (clue hunt #1)

**UI**
- Full-bleed harbor plate. No HUD cards.
- Soft circular hit-glows only after idle/miss assist.
- Status phrase top-center, 2–4 words: *Find the red hat.*
- Corner: Look Book button (closed satchel) — optional peek.

**Artwork**
- Midjourney candy pier, sunset sugar water, boats like macarons.
- One diegetic clue object baked into the plate: a **red hat** on a bollard, readable at arm’s length.

**Interaction**
1. Kid taps around. Near-miss: local sparkle.
2. Tap red hat → hat lifts into a chip, flies to Look Book satchel with a satisfying suck.
3. Status: *Hat for the Look Book!*
4. Auto-advance after ~1.2s to travel again (second sparkle destination already pulsing).

Wrong taps never drain anything. After 2 misses, a dotted glow path draws to the hat.

---

### Beat 4 — Inside Cloud Kitchen (clue hunt #2)

Same pattern, new plate.

**Artwork**
- Floating kitchen in cumulus, copper pans, jam jars as lanterns.
- Clue: a **striped scarf** fluttering on a ladle hook.

**Interaction**
- Tap scarf → second Look Book chip.
- Status: *Scarf says whoosh!*
- Return to travel; only **Mossy Library** remains lit.

---

### Beat 5 — Inside Mossy Library (clue hunt #3)

**Artwork**
- Cathedral of moss and books, fireflies as reading lamps.
- Clue: a **tiny fox friend** peeking from a hollow book.

**Interaction**
- Tap fox → third chip.
- Look Book satchel bursts open automatically — enough chips to build the Trickster.

---

### Beat 6 — Look Book assemble (warrant, kid-shaped)

**UI**
- Soft felt table overlay on a dimmed last plate (still atmospheric, not a settings panel).
- Center: empty silhouette with three glowing sockets (hat / scarf / friend).
- Bottom tray: the three chips (and one silly decoy chip that still “fits” a funny wrong face — never blocked).

**Artwork**
- Chips are cropped Midjourney stickers with chunky outlines.
- Assembled Trickster is cute, not criminal — cape, grin, borrowed moon in a jar.

**Interaction**
- Tap a chip, then tap a socket (or drag). Snap + chirp.
- Correct sockets glow happy; decoy builds a silly alternate that giggles and hops into the discard cloud — still success energy.
- When three sockets filled: silhouette becomes the Trickster; button **Find them!** appears.

No reading. Shape + color match is enough. Assist: after idle, correct chip pulses toward its socket.

---

### Beat 7 — Panorama find (the “arrest”)

**UI**
- Ultra-wide Midjourney panorama (pan horizontally with finger).
- Status: *Where are they hiding?*
- No timer. No fail.

**Artwork**
- A single showcase plate stitching motifs from all three places — the art gallery victory lap.
- Trickster peeks once, readable but not screaming (Waldo-soft).

**Interaction**
- Pan; tap Trickster → freeze-frame sparkle bloom.
- Moonbeam returns to a little jar in their hands, then floats back to the original painting vignette.
- Short celebration: plates you visited fan out as a gallery strip.
- Choices: **Again** / **Done**.

---

### Beat 8 — Done

**Done** dismisses the standalone shell (or returns to Lookout quiet idle).  
No XP, no rank, no inventory write in this pass — only the feeling of having *walked through beautiful pictures with a purpose*.

---

## Experience principles (lock these)

1. **Art is the level.** UI chrome stays thin; the plate is the playfield.
2. **Reading is optional.** Voice + picture + motion carry the loop.
3. **Carmen structure, kindergarten friction.** Travel → look → collect → assemble → find.
4. **Never punish curiosity.** Wrong taps are texture.
5. **Showcase without slideshow.** Travel and panorama exist so parents (and kids) *see* the Midjourney work.
6. **One job per beat.** Each screen has one sentence of purpose.
7. **Motion budget:** sparkle drift, plate crossfade, chip suck, socket snap, finale bloom (2–3 intentional motions always alive).

---

## Textual inspection hooks (for AI / CI)

Prototype exposes:

- `window.ArtScout.state` — current beat, clues found, sockets filled
- `#debug-state` — live JSON
- `[data-scene]` on the active stage
- `[data-clue-id]` on tappable clue hotspots
- Console log line per beat: `art-scout:beat <name>`

Play script for agents:

```text
open prototypes/art-scout-chase/index.html
click [data-action="start"]
click [data-action="follow"]
click [data-action="go-destination"]
click [data-clue-id="red-hat"]
click [data-action="go-destination"]
click [data-clue-id="striped-scarf"]
click [data-action="go-destination"]
click [data-clue-id="fox-friend"]
click [data-chip-id="red-hat"] then [data-socket="hat"]
click [data-chip-id="striped-scarf"] then [data-socket="scarf"]
click [data-chip-id="fox-friend"] then [data-socket="friend"]
click [data-action="find-them"]
click [data-clue-id="trickster"]
expect state.beat === "celebrate"
```

---

## Midjourney plate list (production prompts, not progression)

| Plate ID | Role | Prompt gist |
|---|---|---|
| `lookout_dusk` | Brand + HQ | Cozy treehouse observatory, green-gold interior, violet dusk sky, open window, children’s book cinematic, no text |
| `missing_moon_painting` | Briefing prop | Framed night meadow painting with a soft empty circle where moonlight should be |
| `candy_harbor` | Destination | Sunset candy pier, sugar water, macaron boats, whimsical Midjourney illustration, no text |
| `cloud_kitchen` | Destination | Floating cloud kitchen, copper pans, jam-jar lanterns, soft volumetric light |
| `mossy_library` | Destination | Moss cathedral library, firefly lamps, hollow books, magical calm |
| `panorama_find` | Finale | Wide stitch of harbor + kitchen + library motifs, hide-and-seek friendly composition |
| `trickster_portrait` | Assemble result | Cute mischievous cape kid-creature holding a moon jar, sticker-readable |

Style lock: same family as Abbie’s World 2 — magical, cultivated, playful, readable at iPad distance. Avoid horror, crime realism, weapons, stress faces.

---

## Next (explicitly later)

- Progression / scout ranks  
- Case generation metadata  
- Economy hooks  
- Swift standalone target per `STANDALONE_MINIGAME_PATTERN.md`  
- Real MJ asset pack swap replacing CSS plates
