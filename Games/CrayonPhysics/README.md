# Crayon Physics iPad implementation

Full-game integration remains in progress. All seven original puzzles and ending are imported, including all five source joints. `CrayonPhysicsCore` uses an adapted Box2D-Lite solver at fixed 1/60 steps; SpriteKit handles rendering and input. Both joint anchors, accumulated impulse and relaxation are preserved. Native core tests and eight-scene stability checks pass. Original-executable parity, recognized-stroke solutions and physical iPad acceptance remain pending; see `../handoffs/coder-source-mechanics.md` and the core's `PROVENANCE.txt`.

## Build on a Mac

Requires Xcode with iOS 17+ SDK and XcodeGen. No Apple toolchain is available on the current Windows development host.

```sh
cd ios
xcodegen generate
xcodebuild -project CrayonPhysics.xcodeproj -scheme CrayonPhysics -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
open CrayonPhysics.xcodeproj
```

Choose an Apple signing team and connected iPad in Xcode to install. Bundle identifier is `com.abbiesworld.crayonphysics`; version 0.1.0, build 1. These are source settings, not proof an application was built. The generated project is reproducible from `project.yml`.

## Source import

```sh
python tools/import_reference.py /path/to/original/crayon
```

Imports source level geometry and referenced original sprites into `CrayonPhysics/Resources`, with SHA-256 provenance. It does not modify the source game. Original readme is bundled for attribution. No executable or recovered pseudocode is included in the application.

The public SwiftUI entry is `CrayonPhysicsExperience(context:onExit:)` in `CrayonPhysicsKit`. Standalone uses `.standalone` and returns to its launcher. Abbie's World uses `.playroom` from the crayon box in the treehouse Cozy Nook; the host retains its room state and owns music pause/resume. The embedded game does not change the host audio session. Host integration is in draft PR39 of `evanrobinson2/abbiesworld_ios`.

## Verification still required

- Compile and run the new native core with Apple SDKs. The earlier SpriteKit baseline compiled in both apps and passed the standalone seven-puzzle UI navigation smoke test; that evidence does not validate this solver revision.
- Compare drawing raster scoring and adapted solver against the original executable. Upstream Box2D-Lite plus recovered circle collision code is not a bit-for-bit fidelity claim.
- Solve every puzzle in source order, exercise joints and reset, verify completion/replay and ending.
- Test finger and Pencil, multitouch, interrupted strokes, safe areas, app backgrounding and audio on physical iPad.
- Validate actual host room entry/return at runtime; compilation alone does not cover authenticated navigation or audio restoration.

The bundle contains original `_ghost — Lullaby`, converted to `music-main.m4a`, and A/V's licensed `paper-pluck` integration candidate with provenance/attribution. Rejected procedural sound files are excluded from the build. The board is the audition; this integration does not claim accepted final audio. Music and sound controls are independent; drawing responds to motion and stops on rest/cancel, menus, backgrounding and exit. Missing music is recorded by `GameAudio.status`.

For automated Mac compilation and XCTest execution, run `bash tools/verify-on-mac.sh`. It selects an available iPad simulator (or honors `SIMULATOR_DESTINATION`) and preserves logs/results. GitHub Actions now supplies Apple CI. Physical-device signing/delivery remains DevEx's outstanding work.

Build specification follows the [XcodeGen project specification](https://github.com/yonaskolb/XcodeGen/blob/master/Docs/ProjectSpec.md).
