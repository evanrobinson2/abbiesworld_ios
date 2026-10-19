# Theme builder v2 — high-level directions

Updated 2026-10-18 after Evan's correction: users choose a mood; the theme manager composes the surface colors. The primary drawer now offers complete presets, season, weathering and blossom amount. Individual colors and identity opt-in are collapsed under Advanced.

## Current integration

`applyToThree(group, THREE)` remains the adapter. Call after building/cloning each group and on `ranch-theme-change`. Each mesh must carry its original `part` as `mesh.userData.themeSurface`. The 3D chat has connected the asset library; this chat owns the Themes preview. Other scenes remain pending. This chat did not deploy.

State version 2 adds `season` (`original`, `spring`, `summer`, `autumn`, `winter`), `weathering` and `bloom` (0–1). `usePreset` sets a complete coherent direction; `composePalette` combines the seasonal palette with optional overrides. Season UI clears manual overrides. Version-1 saved custom palettes remain readable under the same storage key. Identity colors stay original by default; seasons never override them. `resetTheme` removes flowers, resets roughness/mottling, restores colors and disables identity recoloring.

Presets: Original atelier, Blossoming spring, Sunlit summer, Weathered orchard, Quiet winter. Winter changes palette only: no snow or leaf loss. Weathering uses gentle nonperiodic shader mottling, fading and increased roughness on bark/roof/plaster/timber/metal/fabric/soil. It does not alter source geometry. Blossoms are actual five-petal instanced geometry on explicitly named Rounded canopy foliage. Unknown plants are not inferred from color. A tree at 80% has 380 petal instances across four canopies; no blossoms are placed on animal/worker/building parts.

Adapters are idempotent. Shared materials for the *same* original surface are supported; unrelated semantic surfaces must not share a material. Shader state is held in a WeakMap, not serialized userData. Blossom cleanup only disposes generated adornments, never original mesh geometry/material. Cache original groups and apply after cloning; do not cache decorated clones. `resolveColor` alone supports colors but not roughness, mottling, or flowers. No new external dependencies.

## Validation of v2

`node tests/theme-engine.test.mjs` passes identity opt-in, original/unmapped fallback, persistence, invalid input, clamped effects, complete seasonal palettes, real blossom creation, repeated application, blossom removal, material reset, and blocked storage. Browser visually checked spring flowers and autumn building weathering with no shader errors. A 390×844 viewport fixture verified primary controls, collapsed Advanced, slider update and drawer layout. Screenshot: `tests/themes-v2-preview.png`. Header heights match shared styling (76px desktop / 68px phone). Temporary mobile test fixture removed.

---

# Themes integration — 2026-10-18

Implemented `dist/themes.html`, `themes.css`, `themes.js`, `theme-engine.js`, and `theme-contract.json`. The Themes page previews any of the 101 static assets, offers original/meadow/autumn/coastal palettes and custom role colors, and saves preferences locally. It uses shared navigation, app-style fonts, and the existing right drawer collector (`.controls`). No shared renderer, navigation, routing, or deployment edits were made by this chat.

## Renderer integration

Import `{initTheme, resolveColor, applyToThree}` from `/theme-engine.js`, then `await initTheme()` before building meshes. All exports are also available as `window.RanchThemes` after the module loads.

```js
const color = new THREE.Color().setRGB(...resolveColor(part), THREE.SRGBColorSpace);
// Keep original part data for reset and identity protection.
mesh.userData.themeSurface = part;
window.addEventListener('ranch-theme-change', () => {
  applyToThree(assetGroup, THREE);
  render();
});
```

Use independently owned materials; do not recolor shared material instances across unrelated surfaces. Apply themes to newly loaded models and regenerated thumbnails too. `applyToThree` only handles single-material meshes carrying `userData.themeSurface`; custom/multi-material renderers should call `resolveColor` per surface. The API never changes original part colors. `getTheme()` returns a copy; `setTheme(state)` validates colors, saves, and emits the event; `usePreset(id)` retains the explicit identity opt-in; `resetTheme()` clears overrides and disables identity recoloring. Mutators return `{theme,saved}` so callers can report storage failure. Same-origin tabs synchronize via storage events.

The Themes preview supports live recoloring now. Existing asset-library, simulation, 2D, and other 3D renderers need integration; this work does not claim they already respond. Root chat owns `/themes` rewrite/navigation and deployment. The page references `/app-style.css` and `/navigation.js` supplied by the integration chat.

## Material provenance and regeneration

101 JSON models / 2,176 surfaces were annotated. All 2,176 matched named GLB nodes/materials using geometry bounds and triangle counts, plus existing names where available. **No hex-color matching.** 1,516 surfaces receive semantic roles; 660 intentionally remain `unmapped` (ambiguous material purpose such as accessory, ink, glass, stone, or straw). Original positions, normals, and color arrays were compared before/after and remained equal. GLBs were not modified.

Fields: `role`, `defaultColor` (original sRGB RGB float array), `materialName`, `surfaceName`, and `roleSource`. Skin/hair/fur roles always preserve original colors until `recolorIdentity:true`. Unknown/missing roles and absent palette entries also preserve original colors. Original preset has no overrides; color controls show category defaults as starting suggestions, not a claim that every original surface uses one color.

`theme_metadata.py` is the shared explicit mapping. Four generators now call it at export; Marley inherits the organic export function. `annotate-theme-assets.py` can re-annotate legacy exports from corresponding GLBs and marks ambiguous geometry matches unmapped. Generator syntax compiled successfully; full Blender regeneration was not rerun.

## Validation

- `node tests/theme-engine.test.mjs`: identity opt-in, unmapped preservation, invalid color rejection, persistence, reset, immutability, and blocked-storage handling passed.
- Existing `dist/npm test` bridge suite passed.
- Browser verified desktop original/autumn recoloring, right drawer, reload persistence, and reset. Rendered 390×844 iframe verified phone layout and drawer opening/closing; this is viewport validation, not physical phone testing.
- Screenshot: `tests/themes-preview.png`. Existing silhouettes/structure were retained; palette changes remain readable at phone scale. No new drawing principles were inferred.

No independent deployment performed.
