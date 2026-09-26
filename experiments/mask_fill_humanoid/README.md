# Mask-fill humanoid (bicep island)

Hypothesis: 2D humanoid part generation **can** be spatially constrained if we pass a region mask plus a fabric/character reference, then ask the model to fill only that region.

**Verdict: Evan is right — on OpenAI `images.edit`.** A transparent-hole mask constrained the fill to the bicep silhouette. Fabric transferred. Prompt-only did not. `/api/create` cannot take a pixel mask.

## Layout

```
inputs/     synthesized clay figure, masks, fabric
outputs/    request metadata (no secrets) + PNGs
scripts/    synthesize_inputs.py, run_experiment.py
```

## Inputs (Pillow, no photos)

- `inputs/humanoid.png` — opaque 1024×1024 front-view A-pose clay kid
- `inputs/character.png` — same figure, used as style reference
- `inputs/fabric.png` — orange herringbone knit / sweater swatch
- `inputs/mask_bicep.png` — **the API mask** (see convention)
- `inputs/mask_bicep_white_hypothesis.png` — white-bicep visual only; not sent
- `inputs/bicep_region_overlay.png` — red overlay of the intended island
- `inputs/layout.json` — joint coordinates; character-left arm is image-right

## Mask convention (verified)

OpenAI `images.edit` uses **alpha, not white/black**:

| Pixel | Effect |
|---|---|
| **alpha = 0 (transparent)** | **EDIT** |
| **alpha = 255 (opaque)** | **KEEP** |

This is the opposite of “white = edit, black/transparent = keep.”

`mask_bicep.png` is a transparent hole over the character-left / image-right upper arm. A white-bicep bitmap with no alpha hole would be treated as KEEP-everywhere, so it was not sent.

OpenAI’s own docs also say masking is prompt-guided, not a hard lasso. On this simple clay figure it was nearly pixel-tight.

## Finding: `/api/create` cannot take a pixel mask

Inspected iOS `CreateRequest` (`RecipeItem.swift`) and the live server (`abbiesworld-server-production/src/server.py`, `src/models.py`).

Accepted fields: `recipeItems`, `freeTextDescription`, `referenceImageIds`, optional `quality` / `model` (iOS client), plus pack + `imageWidth` / `imageHeight`.

There is **no** `mask` field and **no** raw image/mask multipart slot. References must already live on the server (`/static/...` or `ref_*` after `POST /api/reference-image`). A probe that included `mask` still only validated `recipeItems` (`400 recipeItems must be an array`).

So the mask-alignment bet can only be tested on **OpenAI `images.edit`**. `/api/create` was used for prompt-only condition A.

## Conditions (low / cheapest first)

All OpenAI calls used `gpt-image-2.5-flare`, `quality=low`, `1024x1024`. No hard failures.

| ID | API | What | Result |
|----|-----|------|--------|
| A | `/api/create` + `images.generate` | Prompt only: “clay kid left bicep, knitted orange sweater sleeve” | New full-frame clay photo. No spatial lock. `/api/create` actually drew with **sunburst** despite requesting flare. |
| B | `images.edit` | Humanoid + mask + prompt, no fabric | Orange rib-knit **only** on the bicep capsule. Body unchanged. |
| C | `images.edit` | Humanoid + fabric + mask + “fill ONLY…” | Same island; fill is the **herringbone swatch**. |
| D | `images.edit` | Humanoid + character + fabric + mask | Same as C. Extra character ref did not matter (it is a copy of the figure). |

Pixel-change vs original (`threshold=18`):

| Output | Edit-region changed | Keep-region changed | Bicep mean RGB |
|---|---:|---:|---|
| A create | 79% | **98%** | 199, 177, 163 |
| A openai | 79% | **97%** | 170, 97, 60 |
| B mask | 78% | **0.22%** | 219, 97, 49 |
| C fabric | 82% | **0.45%** | 226, 106, 45 |
| D both refs | 81% | **0.34%** | 224, 104, 45 |

## Output paths

- `experiments/mask_fill_humanoid/outputs/A_prompt_only_create.png`
- `experiments/mask_fill_humanoid/outputs/A_prompt_only_openai.png`
- `experiments/mask_fill_humanoid/outputs/B_mask_prompt_openai.png`
- `experiments/mask_fill_humanoid/outputs/C_mask_fabric_openai.png`
- `experiments/mask_fill_humanoid/outputs/D_mask_character_fabric_openai.png`
- `experiments/mask_fill_humanoid/outputs/preview_strip.png`
- `experiments/mask_fill_humanoid/outputs/*_meta.json` and `run_summary.json` (no secrets)

## Verdict

1. Prompt-only cannot constrain a body part. Both `/api/create` and `images.generate` invented a whole new 3D clay kid and ignored our silhouette.
2. A real pixel mask on `images.edit` **does** spatially constrain the fill. Keep-region drift was under 0.5%. The rest of the stick figure is the original pixels.
3. Fabric transfer works: B invented a generic rib knit; C/D stamped our herringbone swatch into the same island.
4. This is usable as a **2D rig slot / mesh island** (carve the mask). It is a flat decal in the mask shape, not a 3D wrap around the arm.
5. `/api/create` cannot do this today. To ship it, the server needs an `images.edit` path that accepts `image` + `mask` (alpha=0 = edit), or the iPad must call OpenAI edit directly.
