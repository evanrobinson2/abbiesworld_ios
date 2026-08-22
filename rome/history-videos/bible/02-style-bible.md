# Style Bible — The Tiered Register System

Status: **Direction locked. Base register pending final selection from style tests.**

---

## The core idea

We do not choose one style and apply it for forty minutes. We use **three rendering
registers**, and which register a frame is rendered in tells the viewer how much we
actually know. This is Principle 9 made physical.

The viewer is never told this. They learn it in about two minutes, and thereafter
every frame carries an epistemic signal for free.

| Register | Means | Use when |
| --- | --- | --- |
| **R1 — Realised** | We know this happened, roughly like this | Ammianus or archaeology supports it; the frame may go inside the moment |
| **R2 — Reconstructed** | Plausible, inferred, undocumented in detail | We are filling gaps responsibly; the frame becomes observational |
| **R3 — Unrecoverable** | History genuinely fails here | The record is silent, contradictory, or the moment is unwitnessed |

---

## R1 — Realised

**ADOPTED: layered cut-paper.** Derived from the reference analysed in
`research/reference-video/style-analysis.md`, with palette and composition
deliberately diverged from the source.

Flat digital illustration imitating layered cut paper: stacked planes with soft drop
shadows, visible handmade paper fibre throughout, hard scissor-cut edges, torn
deckle edges for anything damaged or organic. **Figures are featureless
silhouettes.** Light is drawn as flat translucent shape, never rendered
illumination. No brushwork anywhere.

Palette, four colours, rigidly held: deep indigo, bone, iron grey, tarnished gold.

Screened against four benchmark subjects and passed all four:

| Test | Result | File |
| --- | --- | --- |
| Crowd scale | Multitude resolves into receding torn-paper bands; stays legible to the horizon | `papercut-01-crowd.png` |
| Intimate emotion | Carries without faces; gesture and negative space do the work | `papercut-02-hands.png` |
| Firelight | Light reads as hard gold wedges lying on the ground, not glow | `papercut-03-firelight.png` |
| Grime and aftermath | Torn deckle edges convey mud and wreckage with no painted dirt; restrained, not lurid | `papercut-04-aftermath.png` |

### Why this register solves three standing problems

1. **Character continuity.** No faces means no face to keep consistent across
   hundreds of generations. Identity is silhouette, posture and costume shape —
   specifiable, inspectable, stable. Character sheets become silhouette sheets.
2. **Parallax.** The style is made of separated planes. The aesthetic and the
   delivery constraint in `00-scope-and-decisions.md` §4.2 are the same thing.
3. **Epistemic honesty.** Nothing here pretends to be a photograph, so the work
   cannot accidentally claim we know how a moment looked.

### Corrective rules — added after screening

These exist because the screen exposed the source aesthetic's devotional grammar
arriving alongside its craft.

- **Break symmetry by default.** The reference is relentlessly centred and
  iconic, and it will sanctify whatever is placed in the middle of the frame. That
  violates Principle 5. Subjects sit off-centre; light falls from one side; radial
  and mirrored compositions are reserved for moments that genuinely warrant
  ceremony, and used consciously.
- **Gold means light and heat. Nothing else.** Fire, sun, lamp flame. Never
  decoration, never scattered in terrain, never wealth or ornament. Scarce gold in a
  cold palette stays legible; sprinkled gold becomes noise. (Screen defect: gold
  nuggets in the foreground earth of `papercut-01-crowd.png`.)
- **No cloak-and-halo iconography.** Bright blue drapery, centred seated figures
  and radiant framing read as sacred art. Suppress explicitly in prompts.
- **Same hand for both peoples.** Gothic and Roman subjects get identical treatment:
  same cut quality, same detail budget, same dignity. Verify in matched pairs.

## R2 — Reconstructed

**Style:** ink and wash — confident black brush line over sepia and grey-blue
washes, limited palette, areas of flat solid black, visible paper texture.

Used where we are inferring. The line stays confident (we are not hedging about
whether people existed) but colour drops back and detail thins toward the edges of
what we can defend.

Behaviour:
- The frame becomes observational — further back, less privileged access, fewer
  close faces.
- Excellent for crowd logistics, camp life, movement across country, and any
  composite of "this is what these weeks were like" rather than "this is what
  happened on this afternoon."
- Strong silhouette separation makes this the easiest register to parallax.

Reference: `assets/style-tests/style-b-ink-and-wash.png`

## R3 — Unrecoverable

**Style:** charcoal and graphite on toned paper, smudged tone, visible construction
lines, deliberately unfinished, dissolving to bare paper.

Used where the record fails. The image visibly cannot complete itself. Distance
dissolves into blank paper — certainty falls off with depth, literally.

Behaviour:
- No invented faces on named individuals.
- Where several arrangements are plausible, R3 can show more than one, or show none.
- **The Marcianople banquet is the pilot's showcase R3 moment.** For the missing
  seconds inside that room, the image does not go in. We stay outside on charcoal —
  movement, a door closing — and return to R1 only when Ammianus resumes telling us
  what happened.

Reference: `assets/style-tests/style-c-charcoal.png`

---

## Transition rules

- **Register changes on a cut, never within a frame.** No morphing, no crossfade
  between registers. The change is the signal; blurring it destroys the signal.
- **Do not flicker.** A register should hold for a beat, not alternate frame to
  frame, or the grammar reads as decoration instead of meaning.
- **Establish the grammar early.** The pilot should contain at least one clean
  R1 → R3 → R1 sequence so the viewer is taught the language on real material.
- **When in doubt, drop a register.** Claiming less than we know is a smaller sin
  than claiming more.

## Rules that apply to all registers

1. **No text of any kind in any image.** See `00-scope-and-decisions.md` §4.3.
2. **No caricature.** No character rendered with a heavier, uglier, or more
   grotesque hand than another. Applies especially to Lupicinus.
3. **No invented ornament.** The model decorates reflexively — the star-boss shield
   in the gouache style test is invented and unsourced. Every decorative element
   must trace to an approved prop board or be removed.
4. **Late-antique material culture only.** 4th century. No medieval plate, no mail
   hauberks, no fantasy. This must be stated in every generation prompt; it is not
   inherited reliably.
5. **Depth planes declared.** Every frame card states whether it is built for
   parallax, and if so, what occupies foreground, midground, and background.
6. **Generated at ~3× final linear resolution**, composed with the crop move in mind.

---

## Open questions

1. **Do R2 and R3 need restating in cut-paper terms?**
   The ink-wash and charcoal registers were chosen to sit beside a painterly base.
   Against a flat cut-paper R1 they may now be too large a jump. Likely successors:
   R2 as the same cut paper with fewer layers, thinner palette and more bare ground;
   R3 as uncut paper — blank stock, torn edges, the shapes absent entirely.
   *That version of R3 is arguably better than charcoal: history failing is
   represented by paper that was never cut.*

2. **Resolution.** Screens came out near 1536×1024, short of the 3× headroom in
   `00-scope-and-decisions.md` §4.1. Production frames need either a
   higher-resolution generator or an upscale pass. Flat vector-like art upscales
   unusually well, so this is probably tractable — but it is unproven.

3. **Is R2 needed in the 90-second pilot at all?**
   Possibly the pilot only needs R1 and R3. Introducing three registers in 90
   seconds may be too dense. *Resolve at beat board.*

3. **Does R3 read as "unfinished work" rather than "unknowable history"?**
   Risk is real. Mitigation is that R3 appears only at genuine gaps and always in
   the same visual language. *Resolve by screening the pilot on someone cold.*
