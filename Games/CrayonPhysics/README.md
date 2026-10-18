# Crayon Physics iPad implementation

Full-game integration work in progress, **not a verified playable or faithful build**. All seven original puzzles and ending are imported, including all five source joints. The first Swift/SpriteKit backend is provisional: drawing fitting, physics parity and transition behavior still need source/runtime confirmation. Coordinate mapping, dimension convention, goal threshold, drawn-body mass and fallen-ball recovery now have static executable evidence; see `../handoffs/coder-source-mechanics.md`.

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

The standalone playroom screen is an integration placeholder. A real host playroom can open the game through `GameSession.openBox()` and observe/route `returnToPlayroom()`; no external playroom project or navigation API has been supplied.

## Verification still required

- Compile and run the app with Apple SDKs; no Swift typecheck or simulator test has yet run.
- Trace original drawing/body creation, solver/time step, coordinate transform, deletion and star tests. SpriteKit is not behaviorally identical to the original Box2D implementation.
- Solve every puzzle in source order, exercise joints and reset, verify completion/replay and ending.
- Test finger and Pencil, multitouch, interrupted strokes, safe areas, app backgrounding and audio on physical iPad.
- Integrate approved HUD, final A/V files, and actual playroom entry/return.

The bundle contains original `_ghost — Lullaby`, converted to `music-main.m4a`, and A/V's licensed `paper-pluck` integration candidate with provenance/attribution. Rejected procedural sound files are excluded from the build. The board is the audition; this integration does not claim accepted final audio. Music and sound controls are independent; drawing responds to motion and stops on rest/cancel, menus, backgrounding and exit. Missing music is recorded by `GameAudio.status`.

For automated Mac compilation and XCTest execution, run `bash tools/verify-on-mac.sh`. It selects an available iPad simulator (or honors `SIMULATOR_DESTINATION`) and preserves logs/results. It does not sign or deploy to a physical device. Mac access details remain required.

Build specification follows the [XcodeGen project specification](https://github.com/yonaskolb/XcodeGen/blob/master/Docs/ProjectSpec.md). Project generation itself still requires a Mac verification pass.
