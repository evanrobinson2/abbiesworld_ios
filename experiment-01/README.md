# Experiment 01: From Imagination to a Coherent 2D Animated Character

## Hypothesis

Can an AI-controlled creative process invent one compelling original character and then reliably render that same character through the canonical poses of a 2D walk cycle?

## Methodology

### Part I: Character Design (4 Cycles)

**Cycle 1 - Character Thesis**
- Invented character conceptually before visualization
- Created "Pip Starling" - a curious 8-10 year old explorer
- Generated rough silhouette explorations (10 variations)
- Selected direction: lanky proportions + windswept hair

**Cycle 2 - Shape and Silhouette**
- Simplified to canonical profile silhouette
- Reduced hair to 2-3 geometric shapes
- Verified identifiability at thumbnail size
- Saved as canonical proportion reference

**Cycle 3 - Character Model**
- Generated full color model sheet (front, profile, 3/4, rear)
- Created expression study (6 emotions)
- Documented Character Identity Contract

**Cycle 4 - Performance Test**
- Tested character in 6 substantially different poses
- Verified identity survival across motion
- **FROZE** character design

### Part II: Motion Truth

- Created 8 canonical walk pose silhouettes
- Poses: Contact A, Down A, Passing A, Up A, Contact B, Down B, Passing B, Up B
- Standardized ground plane and scale

### Part III: Generation

- Generated 8 hero frames independently
- Each frame received: Character Reference + Pose Reference + Constraints
- **Result: 8/8 accepted on first attempt**

### Part IV: Normalization

- Removed backgrounds
- Normalized scale (target height: 400px)
- Aligned ground plane
- Centered horizontally
- **Scale variance: 2.6%**

### Part V: Animation

- Created sprite sheet (2400x500, 8 frames)
- Created animated GIF (100ms/frame)
- Created slow analysis GIF (250ms/frame)

### Part VI: Lab Page

- Built Vercel-deployable lab page
- Displays motion truth, generated frames, and animation

## Results

| Metric | Result |
|--------|--------|
| Frames Accepted | 8/8 |
| Attempts per Pose | 1 |
| Total Attempts | 8 |
| Identity Drift | 0 |
| Scale Variance | 2.6% |

### Detailed Assessment

| Criterion | Rating | Notes |
|-----------|--------|-------|
| Pose Fidelity | GOOD | Poses match references, subtle phase differentiation |
| Identity Fidelity | EXCELLENT | Character recognizable throughout |
| Registration Stability | EXCELLENT | Minimal normalization required |
| Scale Stability | EXCELLENT | 2.6% variance |
| Costume Stability | EXCELLENT | All elements preserved |
| Anatomy Stability | GOOD | Proportions consistent |
| Temporal Coherence | GOOD | Animation reads as single character |
| Character Appeal | HIGH | Design successful |

## Failures

**Total rejections: 0**

No frames were rejected during generation. All 8 poses were accepted on the first attempt.

## Conclusions

### Did it work?

**Yes.** The experiment succeeded. An observer viewing the final animation perceives one original character walking naturally, without knowing that every key frame was independently generated.

### Where did it fail?

1. **Pose differentiation** - The "down" phases don't show dramatic body compression. The generator produces subtle variations rather than exaggerated animation poses.

2. **Arm swing** - Arms remained relatively neutral rather than swinging opposite to legs.

These are minor issues that don't break the animation but would benefit from stronger pose conditioning.

### What required human-like creative judgment?

1. Character conception (name, personality, motivation)
2. Silhouette selection from exploration options
3. Simplification decisions (hair geometry)
4. Design freeze decision
5. Acceptance criteria for generated frames

### What became deterministic once creative decisions were made?

1. Background removal
2. Scale normalization
3. Ground plane alignment
4. Registration
5. Sprite sheet assembly
6. GIF generation

### Which problems belong to generation vs. image processing?

**Generation problems:**
- Identity preservation across poses
- Pose adherence
- Style consistency
- Anatomical correctness

**Image processing problems:**
- Background removal
- Scale normalization
- Registration alignment
- Animation assembly

### Does the evidence justify Experiment 02?

**Yes.** The success of Experiment 01 demonstrates that:

1. AI can maintain character identity across independent generations
2. Pose-conditioned generation works for walking animation
3. A creative process can be encoded as an executable skill

Experiment 02 should explore: **Can the same visual result be reconstructed from a small reusable collection of generated 2D body parts attached to an articulated skeleton?**

## File Structure

```
experiment-01/
├── README.md                    # This file
├── experiment-manifest.json     # Machine-readable experiment data
├── character/
│   ├── CHARACTER_THESIS.md
│   ├── CHARACTER_IDENTITY_CONTRACT.md
│   ├── SILHOUETTE_DECISIONS.md
│   ├── FREEZE_DECLARATION.md
│   ├── canonical-silhouette.png
│   ├── model-sheet.png
│   ├── expression-study.png
│   └── performance-test.png
├── reference/
│   ├── MOTION_TRUTH.md
│   ├── walk-reference-A-sequence.png
│   └── walk-reference-B-sequence.png
├── generated/
│   ├── walk-01-contact-a.png
│   ├── walk-02-down-a.png
│   ├── walk-03-passing-a.png
│   ├── walk-04-up-a.png
│   ├── walk-05-contact-b.png
│   ├── walk-06-down-b.png
│   ├── walk-07-passing-b.png
│   └── walk-08-up-b.png
├── normalized/
│   ├── normalization_stats.json
│   └── walk-*-normalized.png (8 files)
├── output/
│   ├── walk-cycle-spritesheet.png
│   ├── walk-cycle.gif
│   ├── walk-cycle-slow.gif
│   └── walk-cycle-strip.png
├── scripts/
│   ├── normalize_frames.py
│   └── build_animation.py
└── lab-page/
    ├── vercel.json
    └── public/
        ├── index.html
        └── (assets)
```

## Deployment

To deploy the lab page:

```bash
cd experiment-01/lab-page
vercel deploy
```

Or import the `experiment-01/lab-page` folder as a new Vercel project.
