# Humanoid Rig POC

A proof-of-concept for reference-conditioned 2D humanoid character generation.

## Hypothesis

A modern image model can use a highly constrained visual construction reference
as geometry, and repaint that geometry as a new character while preserving
enough structural consistency that deterministic code can turn the result into
an animated 2D puppet.

**Key distinction:** The model does NOT infer the skeleton. The skeleton and
part geometry are ours. The image model is effectively painting a predefined
puppet.

## Definition of Success

1. ✅ ONE canonical humanoid rig defined (`rig-schema.json`)
2. ✅ ONE machine-generated construction sheet (`templates/`)
3. Character appearance reference provided
4. GPT Image receives both references plus constrained prompt
5. It generates artwork conforming to the construction sheet
6. Deterministic code extracts body parts
7. Each part attaches to known pivots/sockets
8. Assembled character renders correctly
9. Character plays idle and walk animations
10. Repeatable for multiple characters WITHOUT manual rigging

## Directory Structure

```
AssetSources/HumanoidRigPOC/
├── README.md
├── rig-schema.json           # Canonical rig specification
├── templates/
│   ├── construction-template.png      # Assembled neutral pose
│   ├── construction-template-overlay.png
│   ├── exploded-sheet.png             # Parts in separate cells
│   ├── exploded-sheet-overlay.png
│   └── rig-spec.json                  # Runtime rig spec with cell coords
├── animations/
│   ├── idle.json
│   └── walk.json
├── references/               # Character appearance references
├── characters/
│   └── {character-id}/
│       ├── reference.png             # Input reference (if provided)
│       ├── generated-exploded.png    # GPT Image output
│       ├── generation.json           # Generation metadata
│       ├── parts/
│       │   ├── head.png
│       │   ├── torso.png
│       │   └── ...
│       ├── extraction.json
│       ├── validation.json
│       └── contact-sheet.png
└── batch-results.json        # Batch experiment results
```

## Pipeline Scripts

All scripts are in `scripts/humanoid_rig_poc/`:

### 1. Generate Construction Templates

```bash
python3 scripts/humanoid_rig_poc/generate_template.py
```

Produces PNG templates and JSON spec from the same source of truth, so the
visual guide and rig metadata cannot silently diverge.

### 2. Generate Character

```bash
export OPENAI_API_KEY="your-key"
python3 scripts/humanoid_rig_poc/generate_character.py \
  --character-id my-character-001 \
  --description "A friendly child wizard in purple robes"
```

Options:
- `--reference PATH` - Character appearance reference image
- `--method assembled|exploded|both` - Generation approach (default: exploded)
- `--model MODEL` - OpenAI image model to use

### 3. Extract Parts

```bash
python3 scripts/humanoid_rig_poc/extract_parts.py \
  --character-id my-character-001
```

Extracts each body part from its known cell. No AI segmentation - purely
deterministic based on the rig spec.

### 4. Validate

```bash
python3 scripts/humanoid_rig_poc/validate.py \
  --character-id my-character-001
```

Checks:
- Alpha quality (no halos, no dirty edges)
- Socket coverage (opaque pixels around pivots)
- Component connectivity (no fragmented parts)

### 5. Generate Contact Sheet

```bash
python3 scripts/humanoid_rig_poc/contact_sheet.py \
  --character-id my-character-001
```

Creates a visual QA image showing template, generated output, extracted parts,
assembled pose, and joint test positions.

### 6. Batch Experiment

```bash
python3 scripts/humanoid_rig_poc/batch_experiment.py \
  --count 10 \
  --max-retries 2
```

Runs the full pipeline on 10 different character descriptions and reports:
- First-pass success rate
- Success after retry
- Failures by category
- Average latency

## Web Preview

The asset-viewer includes a Humanoid Rig POC page at `/humanoid-rig`:

```bash
cd prototypes/asset-viewer
npm install
npm run dev
# Open http://localhost:5174/humanoid-rig
```

Features:
- Live skeleton animation preview
- Idle and walk animation playback
- Part inspection
- Skeleton overlay toggle
- Template viewing

## Rig Specification

The canonical rig defines 17 body parts:

| Part | Z-Index | Parent |
|------|---------|--------|
| hair_back | 5 | head |
| thigh_left | 20 | pelvis |
| shin_left | 21 | thigh_left |
| foot_left | 22 | shin_left |
| thigh_right | 20 | pelvis |
| shin_right | 21 | thigh_right |
| foot_right | 22 | shin_right |
| upper_arm_left | 30 | torso |
| forearm_left | 31 | upper_arm_left |
| hand_left | 32 | forearm_left |
| upper_arm_right | 30 | torso |
| forearm_right | 31 | upper_arm_right |
| hand_right | 32 | forearm_right |
| pelvis | 35 | root |
| torso | 40 | pelvis |
| head | 50 | torso |
| hair_front | 55 | head |

Each part specifies:
- Pivot point (normalized and pixel coordinates)
- Proximal/distal sockets
- Hidden overlap regions for joint coverage
- Bounding box
- Default rotation range

## Animation Format

Animations are JSON files with keyframed tracks:

```json
{
  "name": "walk",
  "duration": 0.8,
  "loop": true,
  "tracks": {
    "thigh_left.rotation": {
      "keyframes": [
        { "time": 0.0, "value": 25 },
        { "time": 0.4, "value": -20 },
        { "time": 0.8, "value": 25 }
      ],
      "interpolation": "ease-in-out"
    }
  }
}
```

Supported track types:
- `{bone}.rotation` - Rotation in degrees
- `{bone}.y` - Y translation in pixels
- `{bone}.scaleY` - Y scale factor

## Failure Codes

| Code | Description |
|------|-------------|
| GEOMETRY_DRIFT | Part shape doesn't match template |
| WRONG_PART | Incorrect content in cell |
| MISSING_PART | Cell is empty |
| EXTRA_PART | Unexpected content outside cells |
| CELL_OVERFLOW | Part extends beyond cell bounds |
| PART_TOO_SMALL | Insufficient coverage in cell |
| SOCKET_UNCOVERED | Pivot/socket lacks opaque coverage |
| ALPHA_DIRTY | Background leaking into sprite |
| ALPHA_HALO | Excessive semi-transparent pixels |
| DISCONNECTED_COMPONENT | Part fragmented into pieces |
| JOINT_GAP | Visible gap when joint rotates |
| STYLE_DRIFT | Art style inconsistent |
| LEFT_RIGHT_CONFUSION | L/R parts swapped |
| GENERATION_FAILURE | OpenAI API error |

## Design Principles

1. **Geometry is code-owned.** The model may alter appearance but never
   skeleton topology, bone names, joint positions, pivot semantics, part
   identity, animation data, or layer contract.

2. **Visual conditioning over prose.** Show the model exact positions rather
   than describing them in text.

3. **Deterministic extraction.** Zero pose estimation in the happy path.
   Every cell position is known from the rig spec.

4. **Validation before use.** Every part is checked for alpha quality, socket
   coverage, and connectivity before assembly.

5. **Isolation for repair.** Track failures per-part so targeted regeneration
   can fix individual pieces without redoing the whole character.

## Non-Goals

This POC deliberately does not address:
- Arbitrary anatomy / quadrupeds
- 360-degree characters
- Generated animation / video
- Facial lip sync
- Finger articulation
- Physics simulation
- Universal auto-rigging
- ML pose estimation
- Live2D / Spine integration
- Production UI / billing

## Question Being Answered

> Given a fixed visually represented humanoid construction grammar, GPT Image
> can repaint arbitrary supported characters into that grammar reliably enough
> that automated validation + retries make runtime skeletal animation practical.

The batch experiment results provide evidence for or against this statement.
