# A+ Traversible Starship Room System

**Status:** Design proposal  
**Audience:** Art direction, engineering, generative pipelines  
**Goal:** Game-ready traversible interiors that scale from a sample pack to an “infinite ship,” without raster-only AI backgrounds or generic sci-fi clutter.

---

## Opinionated recommendation (read this first)

**Do not paint finished rooms as single Midjourney plates and then try to walk through them.**

The winning path is a **hybrid layered room OS**:

| Layer | What it is | Why |
|---|---|---|
| **Shell (vector / procedural)** | Walls, floor, ceil rails, door frames, window cutouts, signage mounts | Perfect continuity, infinite deck numbers, cheap variants |
| **Materials + light (shaders)** | Warm emissives, soft bounce, glass, holograms, scanline PIPs, atmosphere | Premium depth without redrawing art per room |
| **Hero props (hand-directed art)** | 1–3 authored objects per room that declare purpose | Art direction lives here; not in the plumbing |
| **Vista (optional plate / shader sky)** | Exterior through windows only | Romance without baking characters or UI into walls |
| **Metadata graph** | Room IDs, deck, districts, doors, anchors | Makes infinite ship real |

This matches Abbie’s World strengths already in-repo (semantic plates, room switchers, Moon Base cutaways, chalk→emotional pipelines) while fixing the gap: **those systems are plate-swappers, not traversible geometries.**

**Tech stack for MVP (web prototype → iOS later):**

1. **Room shell:** SVG / Canvas2D vector grammar (4:3 tile, 2× wide)  
2. **Lighting & atmosphere:** WebGL fragment pass (or Metal later) over layered FBOs  
3. **Hero props:** authored PNG/WebP with alpha + emissive masks, or SVG icons for small furniture  
4. **PIP panels:** live DOM/Canvas/WebGL viewports composited into screen quads (not baked pixels)  
5. **Traversal:** fixed floor band + left/right doorway anchors; character as separate sprite layer  

**Quality bar slogan:** *optimistic classic starship, 2026 rendering — warm, purposeful, art-directed.*

---

## 1. Visual design language

### 1.1 Emotional brief

- **Tone:** aspirational, calm competence, wonder without coldness  
- **Not:** sterile NASA, cyberpunk grit, horror corridors, clutter cosplay  
- **Material story:** soft-warm metal, cream panels, cyan guidance light, amber status, pink-cream human spaces  
- Continuity with Moon Base / Abbie emotional art (pink–cream–cyan, rounded forms) — but **more architectural** than dollhouse chalk

### 1.2 Palette (ship-wide)

| Token | Role | Notes |
|---|---|---|
| `hull-warm` | Primary wall fill | Desaturated warm gray-cream, never pure white |
| `trim-bronze` | Structural ribs / handrails | Soft copper-bronze, low chroma |
| `guide-cyan` | Wayfinding, door lips, active rails | Thin, intentional — not neon spam |
| `status-amber` | Soft alerts, PIP bezels | Warm, never alarm-red by default |
| `life-pink` | Habitation accents | Soft; reserved for crew districts |
| `void-ink` | Silhouette / outline | Thick readable edges for side-view clarity |
| `vista-deep` | Exterior through glass | Deep blue-violet with soft atmospheric falloff |

### 1.3 Form grammar

- **Rounded rect modules** with consistent corner radius (ship “module kit”)  
- **Horizontal datum lines:** floor strip, mid-rail, ceil cable tray — these create L→R continuity  
- **One hero vertical** per room (column, window, ladder, core column) for silhouette identity  
- **Negative space is design:** leave walkable floor and breathing wall plane; no prop landfill  
- **Silhouette test:** room readable as a black cutout at 64px height

### 1.4 Motion / polish grammar (shaders & CSS)

Use sparingly, as *systems*, not decoration:

- Soft volumetric god-rays from windows / ceiling strips  
- Screen-space ambient occlusion in corners (cheap)  
- Specular floor band under character feet  
- PIP: scanline + slight chromatic aberration + 12–24fps content refresh  
- Parallax: vista 0.15, mid shell 0.0 (camera), FG props 1.1  
- Micro dust / mote particles only in lit shafts  

---

## 2. Design language / taxonomy (ship grammar)

### 2.1 Ship districts (systems)

Districts are **deck neighborhoods**, not random themes:

| District ID | Purpose | Color temperature | Window policy |
|---|---|---|---|
| `cmd` | Command / ops | Cool-cyan + warm panels | Rare; tactical glass only |
| `conn` | Connectors / arteries | Neutral hull | Usually none (pressure spine) |
| `sci` | Science / labs | Cyan + glass instruments | Optional small ports |
| `crew` | Habitation | Pink-cream life accents | Common, soft curtains/filters |
| `eng` | Engineering / power | Amber + deep metal | Rare; shielded |
| `obs` | Observation / ceremony | Max vista | Required large aperture |

### 2.2 Room categories

| Category | Traversal role | Density |
|---|---|---|
| `chamber` | Destination room with purpose | Medium props |
| `artery` | Corridor / junction | Low props, strong wayfinding |
| `nook` | 0.5–1 tile alcove off artery | High intimacy |
| `bay` | 2× wide working space | High hero feature |
| `node` | Vertical shaft / lift lobby | Strong vertical silhouette |

### 2.3 Room purpose model

Every room declares:

```
purpose = verb + object
```

Examples: `command the approach`, `sample the anomaly`, `rest the crew`, `tune the core`, `watch the stars`.

If you cannot say the purpose in five words, the room is not ready.

### 2.4 Hero feature model

Exactly **one primary hero** + up to **two supporting props**.

| Room type | Primary hero | Supporting |
|---|---|---|
| Bridge-adj | Tactical table / holomap | Side chairs, wall strip display |
| Corridor | Door sequence + deck plaque | Utility panel, plant niche (rare) |
| Lab | Specimen pedestal / analyzer | Glass cabinets, PIP analysis |
| Hab | Berth / lounge seat | Soft light, personal shelf |
| Eng | Core column / conduit heart | Railings, status PIPs |
| Obs | Window + seating ledge | Telescope mount, sky PIP |

### 2.5 Signage conventions

- **Always live text** (vector/DOM), never baked into raster walls  
- Format: `DECK {n} · {ROOM_CODE}` e.g. `DECK 12 · SCI-04`  
- Optional friendly name below in softer weight: `Spectrometry`  
- Plaque sits **above doorway lip** or **mid-wall left of door** — never on floor  
- Wayfinding chevrons only in `conn` district, guide-cyan  

### 2.6 Deck numbering conventions

- Decks increase **upward** (Deck 1 = keel / eng heavy; high decks = obs / gardens)  
- Room codes: `{DISTRICT}-{NN}` per deck, stable IDs never reuse  
- Full address: `ship.deck.{n}.room.{district}-{nn}`  
- Infinite ship: generate deck numbers as integers; UI abbreviates (`D12`)  

### 2.7 Window / vista rules

| Allowed | Forbidden |
|---|---|
| `obs` always | Random windows on eng core rooms |
| `crew` often (filtered) | Windows behind cluttered prop walls |
| `sci` small ports | Multiple competing vistas in one room |
| `cmd` rare tactical slit | Vista so bright it kills silhouette |

Max **one** primary vista aperture per room.

### 2.8 PIP display rules

PIP = **live interactive or animated viewport**, not painted UI.

| Appears when | Placement |
|---|---|
| Room purpose involves monitoring / analysis / status | Eye-level panel, 16:9 or 4:3 inset |
| Corridor junctions (optional) | Small directory PIP |
| Never as wallpaper spam | Max 2 PIPs per standard room; 3 in 2× bay |

PIP content types: ship map slice, telescope feed, lab readout, crew schedule glyph, core telemetry.

### 2.9 Coherence vs distinctness rules

**Shared (coherence):** floor height, door height, trim language, palette tokens, signage typeface, module radius.  
**Unique (distinctness):** hero feature, ceiling treatment, one accent material, silhouette vertical, PIP content type.

---

## 3. Sample room pack (MVP set)

Base tile: **4:3**. Character scale: head ≈ 12–14% of room height. Floor band: lower 18–22% clear.

### R1 — `cmd-bridge-ante` · Bridge Ante-Chamber

| Field | Spec |
|---|---|
| **Purpose** | Prepare / receive command briefings before the bridge |
| **District / ID** | `cmd` · `DECK 14 · CMD-02` |
| **Visual identity** | Cool-cyan guidance rails, warm cream walls, circular holomap table as hero |
| **Traversal** | L door ←→ R door; clear center aisle around table |
| **Hero** | Holomap table (emissive top, soft bloom) |
| **Supporting** | Wall strip displays, two low stools |
| **Signage** | Plaque left of R door; chevron “BRIDGE →” |
| **PIP** | 1 wall PIP: approach trajectory / starfield tactical |
| **Vista** | Optional narrow tactical slit (not full window) |
| **Gameplay hooks** | Interact holomap; open bridge (future); crew briefing |

### R2 — `conn-spine-a` · Pressure Spine Corridor

| Field | Spec |
|---|---|
| **Purpose** | Connect districts; teach ship grammar |
| **District / ID** | `conn` · `DECK 12 · CONN-01` |
| **Visual identity** | Long ribs, repeating door lips, strong floor strip, minimal props |
| **Traversal** | Straight L→R; optional mid junction stub (up/down later) |
| **Hero** | Sequence of lit door frames + deck plaque rhythm |
| **Supporting** | One utility hatch; one plant niche max |
| **Signage** | Repeating deck plaques; directory PIP at mid |
| **PIP** | Small directory (“SCI ← · CREW →”) |
| **Vista** | None (spine rule) |
| **Gameplay hooks** | Fast travel later; tutorial wayfinding |

### R3 — `sci-lab-spectro` · Spectrometry Lab

| Field | Spec |
|---|---|
| **Purpose** | Sample / analyze anomalies |
| **District / ID** | `sci` · `DECK 11 · SCI-04` |
| **Visual identity** | Glass cabinets, clean bench, cyan instrument glow |
| **Traversal** | L→R along floor; bench sits mid-back, aisle forward |
| **Hero** | Analyzer pedestal with rotating specimen ghost |
| **Supporting** | Glass cabinet bank; wall tools rail |
| **Signage** | `SCI-04 Spectrometry` |
| **PIP** | Analysis PIP (spectrum bars / false-color plate) |
| **Vista** | One small port; filtered |
| **Gameplay hooks** | Place sample; read result; unlock lore |

### R4 — `crew-hab-nook` · Crew Habitation Nook

| Field | Spec |
|---|---|
| **Purpose** | Rest the crew |
| **District / ID** | `crew` · `DECK 9 · CREW-07` |
| **Visual identity** | Soft pink-cream, fabric berth, warmer bounce light |
| **Traversal** | L→R; furniture back-walled so floor stays clear |
| **Hero** | Lounge berth / daybed |
| **Supporting** | Personal shelf, soft lamp |
| **Signage** | Friendly name + code |
| **PIP** | Optional tiny schedule PIP (muted) |
| **Vista** | Soft window with curtain filter + gentle stars |
| **Gameplay hooks** | Rest / save / diary / outfit |

### R5 — `eng-core-bay` · Core Systems Bay (2× wide)

| Field | Spec |
|---|---|
| **Purpose** | Tune the core |
| **District / ID** | `eng` · `DECK 3 · ENG-01` |
| **Visual identity** | Vertical core column, amber status, deeper metal, catwalk rail |
| **Traversal** | L→R across bay; rail in front of core; clear floor |
| **Hero** | Glowing core column (shader emissive + slow pulse) |
| **Supporting** | Conduit bundles, status PIP pair, railing |
| **Signage** | Industrial plaque, larger type |
| **PIP** | 2 telemetry PIPs |
| **Vista** | None (shielded) |
| **Gameplay hooks** | Repair / overload / power routing |

### R6 — `obs-gallery` · Observation Gallery (optional but recommended)

| Field | Spec |
|---|---|
| **Purpose** | Watch the stars |
| **District / ID** | `obs` · `DECK 16 · OBS-01` |
| **Visual identity** | Wide aperture, seating ledge, quiet luxury |
| **Traversal** | L→R along ledge; window occupies mid-upper plane |
| **Hero** | Window vista (animated starfield / planet) |
| **Supporting** | Scope mount, quiet bench |
| **Signage** | Minimal; room name only |
| **PIP** | Optional sky-annotation PIP |
| **Vista** | Required primary aperture |
| **Gameplay hooks** | Lore look; cinematic beats; date-the-stars |

**Pack traversal spine (sample walk):**  
`OBS-01` ↔ `CMD-02` ↔ `CONN-01` ↔ `SCI-04` ↔ `CREW-07` ↔ (`lift`) ↔ `ENG-01`

---

## 4. Generic room framework

### 4.1 Tile formats

| Format | Aspect | Use |
|---|---|---|
| `tile-1x` | 4:3 | Standard chamber / artery segment |
| `tile-2x` | 8:3 (two 4:3) | Bays, galleries, long labs |
| `tile-0.5x` | 2:3 | Nooks / airlocks (advanced) |

Camera framing: always show full tile height; pan only horizontally for 2×.

### 4.2 Template grammar (slots)

```
RoomTemplate
├── shell
│   ├── floorPlane        (y = floorY, height = floorBand)
│   ├── backWall          (modules grid)
│   ├── ceilRail
│   ├── leftDoor | blank
│   ├── rightDoor | blank
│   └── windowMask?       (aperture polygon)
├── structure
│   ├── midVertical?      (hero silhouette slot)
│   ├── ribs[]
│   └── handrail?
├── props
│   ├── hero              (required)
│   └── support[0..2]
├── displays
│   ├── signage[]         (live text anchors)
│   └── pip[]             (screen quads)
├── lighting
│   ├── keyLights[]
│   ├── emissiveMasks[]
│   └── ambientProfile
└── meta
    ├── deck, district, code, purpose
    └── links (door graph)
```

### 4.3 Doorway / traversal anchors

- Door clear opening: **normalized height 0.62–0.68** of room; width **0.14–0.18**  
- Anchor points: `door.left.enter`, `door.right.enter` at floor center of opening  
- Continuity rule: adjacent rooms share door trim style + deck strip color  
- Closed wall variant: replace door with structural panel module (same grid)

### 4.4 Depth planes

| Plane | Z | Contents | Parallax |
|---|---|---|---|
| `vista` | −2 | Stars / planet / nebula | 0.15 |
| `glass` | −1 | Window refraction / frost | 0.2 |
| `shell` | 0 | Walls, floor, doors | 0 |
| `props` | +1 | Hero + support | 0.05 |
| `actor` | +2 | Player / NPCs | 0 |
| `fg` | +3 | Near rail, hanging cable, plant | 1.1 |
| `fx` | +4 | Light shafts, particles, PIP overlays | — |

### 4.5 Exterior window vs closed-wall

`apertureMode`: `none | port | gallery | slit`

- Procedural shell swaps aperture module without regenerating whole room  
- Vista texture/shader bound only if aperture ≠ `none`

### 4.6 PIP + deck/room ID support

- Signage and PIP are **data-bound**: change deck number without new art  
- Room variation knobs (safe for procedural remix):

| Knob | Range | Coherence-safe? |
|---|---|---|
| Module fill pattern | A/B/C panel layouts | Yes |
| Accent token | cyan / amber / pink | Yes within district |
| Hero swap within category | analyzer A/B | Yes |
| Prop tint | ±5% | Yes |
| Random clutter | — | **No** |
| Random extra windows | — | **No** |

### 4.7 Infinite ship generation

Semi-procedural ruleset:

1. Pick district from deck band (eng low, obs high)  
2. Pick category + purpose verb from district table  
3. Instantiate template `tile-1x` or `tile-2x`  
4. Assign hero from district hero pool  
5. Bind deck/code/signage  
6. Wire doors to corridor spine  
7. Rare: insert `obs` or `bay` as landmarks every N decks  

Output is **structured room JSON + shell params**, not a raw image.

---

## 5. Technical rendering proposal

### 5.1 What is pure art vs procedural

| Pure art (authored) | Procedural / live |
|---|---|
| Hero prop illustrations | Wall module tessellation |
| Character sprites | Door frames, rails, floor strip |
| Rare mural / unique sculpture | Signage text, deck numbers |
| Vista plates (optional hero planets) | Vista shaders / starfields |
| — | Lighting, bloom, SSAO, reflections |
| — | PIP content |

### 5.2 Vectors (SVG / path grammar)

Use vectors for:

- Room shell outline & module kits  
- Door lips, handrails, plaques  
- Wayfinding chevrons  
- Small UI chrome inside PIPs  

Benefit: crisp at any scale, recolorable, tiny payloads, perfect for infinite variants.

### 5.3 CSS / layout (web pipeline)

Useful for:

- Prototype room composer / art tools  
- PIP DOM overlays (HTML charts, text)  
- Signage typography  
- Debug overlays (anchors, collision)  

Not for final character traversal on iOS — there, mirror as SpriteKit/Metal scene graph.

### 5.4 Shaders / lighting (must-have for A+)

Minimum shader stack:

1. **Unlit albedo + emissive mask** compose  
2. **Soft key light** from ceiling strip + window  
3. **Floor specular band**  
4. **Bloom on emissives** (holomap, core, PIPs)  
5. **Window glass** (refraction lite + reflection of interior lights)  
6. **PIP post** (scanline, slight RGB split, vignette)  
7. Optional: **parallax occlusion** on wall modules (subtle)

### 5.5 Avoiding “flat static background” syndrome

Mandatory:

- Separate actor layer (characters never baked into room art)  
- At least one animated emissive (PIP or hero pulse)  
- Parallax FG element  
- Dynamic light response when PIP/hero toggles  
- Footstep specular / dust in light shafts  

Forbidden as the only deliverable: single flattened JPG of a room with painted character and painted UI.

### 5.6 Performance

Budget for mobile:

- Shell: ≤ 2k vector ops or one atlased module mesh  
- Hero props: ≤ 3 textures @ ≤ 1k edge  
- One fullscreen lighting pass  
- PIP: offscreen 256–512px, update 10–20fps  
- 2× rooms: same height, wider atlas / two shell draws  

---

## 6. Asset / scene structure (game-ready)

### 6.1 Per-room package

```
rooms/SCI-04/
  room.json              # metadata + anchors
  shell.svg              # or shell params
  hero.webp              # analyzer (+ alpha)
  hero_emissive.webp     # mask
  support_cabinet.webp
  fg_rail.webp?          # optional
  vista.webp?            # optional still; else shader
  thumbs/room_thumb.webp
```

### 6.2 `room.json` schema (reference)

See also: [`schemas/starship-room.schema.json`](./schemas/starship-room.schema.json)

```json
{
  "id": "ship.deck.11.room.SCI-04",
  "code": "SCI-04",
  "name": "Spectrometry",
  "deck": 11,
  "district": "sci",
  "category": "chamber",
  "purpose": "sample the anomaly",
  "format": "tile-1x",
  "apertureMode": "port",
  "shell": {
    "moduleKit": "hull-warm-v1",
    "floorY": 0.80,
    "doorLeft": true,
    "doorRight": true
  },
  "hero": {
    "propId": "prop.analyzer.pedestal",
    "anchor": { "x": 0.52, "y": 0.62 }
  },
  "supports": [
    { "propId": "prop.cabinet.glass", "anchor": { "x": 0.78, "y": 0.55 } }
  ],
  "signage": [
    {
      "text": "DECK 11 · SCI-04",
      "sub": "Spectrometry",
      "anchor": { "x": 0.86, "y": 0.28 }
    }
  ],
  "pips": [
    {
      "id": "pip.analysis",
      "rect": { "x": 0.12, "y": 0.22, "w": 0.22, "h": 0.18 },
      "content": "spectrum"
    }
  ],
  "vista": {
    "rect": { "x": 0.70, "y": 0.18, "w": 0.12, "h": 0.16 },
    "style": "filtered-stars"
  },
  "lighting": {
    "profile": "lab-cyan",
    "emissives": ["hero", "pip.analysis"]
  },
  "traversal": {
    "floorPoly": [[0.08, 0.82], [0.92, 0.82], [0.92, 0.95], [0.08, 0.95]],
    "doors": {
      "left": { "to": "ship.deck.11.room.CONN-01", "anchor": { "x": 0.06, "y": 0.88 } },
      "right": { "to": "ship.deck.11.room.CREW-07", "anchor": { "x": 0.94, "y": 0.88 } }
    }
  },
  "interactives": [
    { "id": "analyze", "anchor": { "x": 0.52, "y": 0.70 }, "verb": "sample" }
  ]
}
```

### 6.3 Layer checklist (every room)

- [ ] background / vista region  
- [ ] midground room shell  
- [ ] foreground accent  
- [ ] traversal floor path  
- [ ] doorway anchors  
- [ ] interactive object anchors  
- [ ] PIP screen regions  
- [ ] window / vista regions  
- [ ] lighting / emissive regions  
- [ ] metadata: type, deck, purpose  

---

## 7. Traversibility rules

| Rule | Spec |
|---|---|
| Floor plane | Continuous horizontal band; no prop collision in center aisle |
| Navigation read | Door lips + floor strip always visible |
| Doorway continuity | Matching trim + deck strip across rooms |
| Character scale | Constant; furniture sized to character, not vice versa |
| Line of sight | Hero readable; PIPs not covering actor path |
| Silhouette | Pass 64px black-card test |
| Interaction | Anchors above floor band, within reach radius |
| Camera | Locked Y; horizontal follow only in `tile-2x` |
| Occlusion | FG rail may overlap legs lightly; never hide head at doors |

---

## 8. Path to A+ quality

### 8.1 What “A+” means here

- Immediately readable purpose from a still frame  
- Warm premium materials, not gray sci-fi sludge  
- Live light and at least one living display  
- Walkable clarity (you can feel where to go)  
- Same ship across 100 rooms without boredom or chaos  

### 8.2 Anti-slop checklist (gate every room)

- [ ] Purpose in ≤5 words  
- [ ] Exactly one hero feature  
- [ ] No baked UI/text in rasters  
- [ ] No character baked into environment  
- [ ] Signage is data  
- [ ] Floor aisle clear  
- [ ] Palette tokens only  
- [ ] District window rules obeyed  
- [ ] PIP count within budget  
- [ ] Looks intentional at thumbnail size  

### 8.3 Generative art policy

Allowed:

- Authoring **hero prop candidates** under strict style cards  
- Vista plates for planets/nebulae  
- Material reference boards  

Not allowed as final room:

- Full-room generative plates as the only layer  
- AI text/signage  
- AI characters in environment plates meant for traversal  

If generative is used, it feeds **prop libraries**, not the room OS.

---

## 9. MVP scope (recommended)

### Phase 0 — Spec lock (this doc)

- Approve palette, districts, schema, tile sizes  

### Phase 1 — Room OS prototype (web)

- Vector shell renderer (1× + 2×)  
- Door graph for 6 sample rooms  
- Character walk L→R with door transitions  
- Live signage + 1 PIP type  
- One shader lighting pass  

### Phase 2 — Sample pack art-directed

- Author 6 heroes + supports  
- Bind R1–R6  
- Observation vista + eng core emissive showcase  

### Phase 3 — Remix engine

- District-weighted room generator emitting `room.json`  
- 20 generated rooms on spine of corridors  
- Deck elevator node  

### Phase 4 — Product integration

- Port scene graph to iOS (SpriteKit/Metal)  
- Semantic IDs aligned with World2 place model  
- Optional Moon Base / Voyage narrative hooks  

**MVP success:** player walks `OBS → CMD → CONN → SCI → CREW`, feels one ship, and a generator can emit a coherent new `SCI-##` without new shell art.

---

## 10. Implementation path (opinionated)

1. **Build the shell grammar first** (boring = beautiful later)  
2. **Add lighting shaders second** (instant premium)  
3. **Drop one hero prop third** (purpose appears)  
4. **Wire doors + walk fourth** (it becomes a game)  
5. **Only then** author the full sample pack  
6. **Only after pack feels good**, turn on procedural remix  

Do not start with “generate 50 rooms.” Start with **one corridor so good you want to keep walking.**

---

## Appendix A — District → deck bands

| Decks | Primary districts |
|---|---|
| 1–4 | `eng` + `conn` |
| 5–8 | `conn` + `crew` |
| 9–12 | `crew` + `sci` |
| 13–15 | `cmd` + `conn` |
| 16+ | `obs` + ceremonial `crew` |

## Appendix B — Relation to current Abbie’s World systems

| Existing | Reuse |
|---|---|
| World2 `rooms[]` / TreehouseRoomID | Evolve from plate-switcher → door graph of `room.json` |
| Moon Base cutaway emotional brief | Tone + palette kinship; cutaway becomes *map*, rooms become *walkable* |
| Semantic asset IDs | Extend: `poi.starship.deck.{n}.room.{code}` |
| Studio MCP place model | Room packs as places with traversal edges |
| Finger Lemmings tile clarity | Borrow readability discipline, not aesthetic |

---

## Appendix C — One-sentence thesis

**A premium traversible starship is a living vector architecture with art-directed heroes and shader light — not a gallery of static AI bedrooms in space.**
