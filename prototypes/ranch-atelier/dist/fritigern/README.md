# Fritigern, scene 1: the wagon

A blocking study for the Fritigern story (Marcianople, 376 AD). Alaric waits in a wagon at the edge of the Gothic camp and watches his father come back through the town gate, wounded, carrying a Roman officer's helmet.

Open `/fritigern/` on the Atelier site. Everything is built procedurally in the browser from the papercraft grammar, so there are no assets to download.

- `paper.js`: the papercraft construction grammar (facet, tint, plate, strip, pleats, creases), ported from `tools/paper-warrior/paper.py`.
- `props.js`: era props built only from the grammar: ridge helmets (Intercisa and Berkasovo types), oval and round shields, figures, ox wagon, ox, tent, campfire, gatehouse, torch.
- `scene.js`: layout, 40-second timeline, camera shots, atmosphere and the sightline test.
- `provenance.json`: what every asset is and where it came from.
- Era reference: `docs/fritigern/EQUIPMENT.md` at the repo root.

## Query parameters

`?shot=director|wide|alaric|over|reverse|follow|helmet|plan|orbit`, `&t=` seconds (pauses there), `&ui=0` hides the overlay, `&rays=1` draws the sightline, `&layout=a|b` picks one of two wagon placements.

## Sightline test

On load the scene samples every quarter second of the walk and casts rays from Alaric's eyes to Fritigern's head, chest and hips against every wagon, tent, person, tree, wall and the ground. The result is drawn as the coloured strip under the timeline (light green: visible, dark green: close enough to read his face, amber: partly hidden, red: blocked) and is available as `window.__sightline`.
