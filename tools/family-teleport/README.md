# Family Teleport: from a family photo to toy characters

The demo page (`/teleport`, see `prototypes/ranch-atelier/TELEPORT.md`) works today with
stand-in characters whose colours can be picked from a photo on the device. This folder holds
the pipeline that turns a family photo into modeled, rigged toy figures, and the kit tools.

## Privacy rule

Photos of the family and anything derived from them (character sheets, Midjourney images,
GLBs of the kids) are private. They live only in `tools/family-teleport/private/`, which is
git-ignored, and on Evan's own devices. Never commit them, upload them to R2 or the model
store, publish them in an Artifact or a deploy, or paste them into a public page. The
page loads a private figure from the viewer's own device (a file picker), never from a URL.

## Pipeline (per person)

1. **Photo**: Evan takes one photo of everyone, front-on, in good light.
2. **Character sheet** (`private/<id>/sheet.json`, schema in `character-sheet.schema.json`):
   name, grown-up or kid, height relative to Dad, skin, hair colour and style, glasses, the
   outfit's colours, and one signature detail ("always wears the dinosaur hoodie"). The page's
   photo picker fills the colours; the rest is a minute of Evan's input.
3. **Concept art**: a Midjourney turnaround of a toy version of the person, run on the Mac in
   Evan's own Midjourney account, with the photo as an image prompt. Record job ids and the
   chosen pick in `private/<id>/provenance.json`. Prompt template:
   `chunky vinyl toy figure of a [age] [kid|adult] with [hair], [outfit], big head small body,
   soft rounded shapes, front side and back turnaround on white, Tiny Glade style, kid
   friendly --ar 3:1 --style raw`
   If the Mac is offline, use the page's procedural figure and record that.
4. **Model**: the modeler builds the figure in Blender from the turnaround with the same part
   names the page animates (`body`, `head`, `arm`, `leg`), at about 3k triangles, and exports
   `private/<id>/figure.glb`. Score it with `tools/model-challenge/harness.py` against the
   turnaround.
5. **Teleport**: on the presenting device, load the GLB through the page's crew screen (to
   come: a "Load figure" button per person). It replaces that person's procedural body.

## Model orders

Madlib answers the kit cannot match become model orders. The page lists them under "New
model orders" and downloads `model-order.json` (`kind: family-teleport/model-order`). Build
order: by the world where the model first appears, low detail first, upgraded as the story
reaches it. New kit recipes go in `prototypes/ranch-atelier/dist/teleport/kit.mjs`; then
regenerate the manifest:

```
node --no-warnings --experimental-loader ./prototypes/ranch-atelier/dist/scripts/character-motion-loader.mjs tools/family-teleport/kit-manifest.mjs
```

The script also checks that every recipe builds at all three detail levels and that the demo
commands parse.
