RANCH CHARACTER STUDIES — 2026-10-18

Separate art pass for Abbie, Ani/Annie, Mommy, Daddy, Jeff, Alexis, Pearl and Marley.
Original authored SVG geometry; no external image assets. Editable visual defaults,
not claimed likenesses, ethnicity, age or confirmed clothing. Pearl has a smaller
child silhouette. 1920s farm-inspired dress, not a historical reconstruction.

Serve index.html over HTTP to inspect all characters, change colors and export a
styled SVG. Hero studies and 24/40/64px samples share the same SVG geometry.
The procedural simulator can keep its blips until this pass is reviewed.

INTEGRATION
manifest.json lists identities and capabilities. Every asset has viewBox 0 0 112 128.
Ground anchor is x56,y116; use this anchor for positioning on the terrain. All
people retain that anchor regardless of relative height. Marley is a dog.

For live styling insert the trusted bundled SVG inline; set custom properties on
the SVG element: --skin --hair --shirt --trousers --shoes --hat --accessory --ink.
Marley: --fur --patch --accessory (collar) --tag --nose --ink.
Properties have fallback colors, so each standalone SVG also works as an img src.
CSS variables on an HTML img do NOT cross into the SVG image document. For canvas
or image rendering serialize a styled inline SVG to an SVG Blob URL first.

svg.dataset.hat = 'none' | 'straw' | 'cap'
svg.dataset.uniform = 'none' | 'overalls' | 'apron' | 'suspenders'
These toggles apply to humans. Individual colors and clothing selections are
cosmetic and must not determine job eligibility. Save per-character customization
alongside appearance metadata, independently from simulation physics/identity.

Art construction: coherent head/torso/limbs before selective folds and stitching;
upper-left highlights and consistent right-side shadows; paper-colored apron,
weathered warm footwear and more saturated shirt accents than quiet terrain.
Handwritten wobble or procedural noise are deliberately absent.

LIMITS
Static front three-quarter characters. No directional walk frames, carry poses,
tool attachments or motion rig yet. Do not rotate these portraits flat to imply
heading; movement direction should remain a separate replay indicator until poses
are authored. 24px render is a silhouette/identity cue, not readable fine detail.
build.cjs deterministically regenerates SVGs and manifest; direct edits to those
outputs will be overwritten if it is run. Preview edits export a separate SVG.

VERIFICATION
All eight SVGs parsed as XML and rasterized in character-proof.png. Proof inspected
at large study size and 24/40/64px. Corrected selectors that initially hid root SVGs;
scoped styles per identity so inline characters retain independent fallback colors.
Local browser access was blocked by the browser client, so preview controls have
not yet been interactively verified. Raster proof resolves CSS fallback variables
for the renderer; live browser custom-property editing remains a separate check.

