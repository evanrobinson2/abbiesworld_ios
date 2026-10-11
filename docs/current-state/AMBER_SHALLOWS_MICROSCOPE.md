# Abbie’s Microscope

Home World now has a small brass microscope on a wooden table at normalized
(0.63, 0.72). Entering it opens the real Amber Shallows 3D game in a WKWebView;
Back to Abbie’s World exits through the existing POI navigation flow.

- Archetype: `poi.microscope`; route: `.microscope`.
- Dedicated pad: `hardpoint.home.microscopePad`.
- No inventory cost, rewards, forced goals, or external website navigation.
- Original sculpted water bear, two darker wild bears, automatic and tapped
  food, golden pellets, plants, bubbles, swarms, and bounded streamed world.
- Shared World 2 music routing continues to own audio.
- Progress uses a native save key scoped to household and profile. Web content
  uses an ephemeral data store, receives only its own saved garden, and gets no
  authentication credentials. Saves are bounded to 512 KB.
- Backgrounding stops simulation/render work. Closing flushes progress and
  tears down the web scene; web-process termination offers a retry.
- One-time per-player migration adds the dedicated microscope pad to older
  home-map overrides without replacing existing edits.

## Offline resource contract

Game key `amber-shallows`, asset key `runtime/microscope`, revision 1.
`Resources/AmberShallows/amber-shallows-registry.json` describes the bundled
HTML resource and includes its content hash and upstream source revision.
The native host resolves that bundled record. No new server route is needed.
The record is ready to mirror into Game Asset API v1 through trusted developer
tooling; this change does not publish anything to the asset server.

The single HTML file includes compiled JavaScript, styles, sculpt data, glTF,
and textures. There are no runtime external modules, CDN dependencies or local
web-server requirements. Small-screen controls are adapted for landscape use.
Three.js and source-asset attribution ship beside the resource.

## Rebuild

Source: https://github.com/evanrobinson2/3d-tardigrade-demo at `5276f83`.
With esbuild installed, run:

```sh
python3 scripts/amber_shallows/bundle.py /path/to/3d-tardigrade-demo/outputs/amber-scene --esbuild /path/to/esbuild
python3 scripts/amber_shallows/verify.py
```

## Verification

The committed offline artifact passed browser rendering and feeding checks,
resource/hash validation, and JavaScript syntax validation. Changed Swift files
passed parser checks. Added XCTest coverage for registration, map validity,
and old-map migration, plus a UI smoke test for entering and exiting.

The available Xcode installation lacks the required iOS platform. Full iOS
compilation, XCTest execution, WKWebView file-origin loading, native save/restore,
and iPad performance remain device/simulator validation items before release.
