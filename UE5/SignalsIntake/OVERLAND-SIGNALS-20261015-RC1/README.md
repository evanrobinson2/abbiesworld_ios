# Original overland POI and indicator semantics

Two local JSON catalogs for a renderer prototype:

- `indicator-catalog.json`: top-level `indicators` array, **48 distinct indicators**, six in each of eight families. Each includes stable ID, plain purpose, glyph plus ASCII fallback, sRGB color, shape, pattern, priority, applicable states, preview action and accessible labels.
- `poi-catalog.json`: top-level `pois` array, **24 original semantic POI roles**, eight per review round: exploration/economy, hazard/magic, quests/events. Each references valid indicator IDs and proposes named integration hooks.
- `validation.json`: count, uniqueness and reference checks. `build_catalog.py` reproduces both catalogs without dependencies.

Families cover discovery/treasure, threat/hazard, magic/status, resources, quest/social, travel/services, settlement/control, events/weather. Shapes and patterns repeat consistently within families; glyphs and labels identify individual roles. Color supplements these signals. Do not draw the Unicode glyph as the only visible cue: fonts may lack it, so an ASCII fallback and text label are supplied.

Hover, focus or tap reveals a short preview; clicking opens details only. Preview actions must not spend, move, harvest, fight, accept quests or change control. Proposed `on_confirm` hooks describe a possible later gameplay interaction; no handler exists in these deliverables. They are not browser or system approval requirements. Enter/Space should mirror click; Escape restores marker focus. Motion is optional, and states use static marks.

Unknown locations must use a generic family name, question glyph and `unknown_accessibility_label`. Never expose a concealed POI identity or reward through hover text, accessible names or preview content. Once discovered, fill label/state/distance templates from actual engine evidence. Missing facts remain unknown; safety, contents and destination are not inferred. State overlays are in `state_presentation`; use only states listed for that indicator or POI. A POI may retain several indicators, for example a crossing plus an unresolved hazard; resolving one condition must not erase unrelated conditions.

Review round 1 checks discovery and economic readability. Round 2 checks distinct hazard/magic meanings and concurrent states. Round 3 checks quest tracking and temporary events. Priority 1 is ambient, 2 useful, 3 important, 4 urgent. Urgent markers may outrank ambient markers in clustering, but every placed instance must remain keyboard reachable. Selection and tracking should be independent of gameplay state.

These are original semantic design proposals, using familiar general map conventions without copied visual assets or franchise designs. No claim of surveying thousands of games or an external corpus is made. No browser, model generation, Blender, shared registry, staging or frozen release changes were performed. **Gameplay is not implemented; native validation is false.** Contrast, hit areas, font coverage, screen-reader behavior, occlusion and engine integration require validation in the final renderer.
