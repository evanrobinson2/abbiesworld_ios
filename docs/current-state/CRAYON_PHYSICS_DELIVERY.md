# Crayon Physics delivery

**Custom-art build ready for Mac/device testing:** `6243f1555d4c93cac85a00e47fe347ffb6ef3885`. [Apple verification run](https://github.com/evanrobinson2/abbiesworld_ios/actions/runs/39148992847) passed native checks, 15 unit tests (seven recognized solutions, custom artwork decode/coverage and legacy-image absence, music lifecycle), four standalone UI tests and integrated room entry/return/reopen.

All gameplay presentation uses our custom paper, ball, trees, stars, crayon textures and boxes. Source physics and puzzle geometry are unchanged. Both actual simulator packages were audited: all ten bundled raster files match their custom sources after Apple PNG decoding, with exact alpha and at most one premultiplied-channel rounding value difference; catalogs match the canonical source and no unexpected game image files remain. Title, all seven puzzles and ending captures were reviewed.

This is a tested device candidate, not physical-device acceptance. Four canonical tracks remain Normal (default), Tense, French House and Pop, selected manually in the paused menu and persisted independently of mute. Previous c7f4734 remains a mechanics-tested mixed-art baseline, superseded for presentation.

Both apps compile the same CrayonPhysicsKit framework. The standalone app starts directly at the game title. In Abbie's World, open Abbie's Cozy Nook and tap the crayon box; closing the game returns to that existing room.

## Build on a Mac

Requires Xcode with iOS 18.5+ SDK for the host, an installed iPad simulator runtime, XcodeGen and Ruby xcodeproj 1.27.0.

The integration is currently on PR #39. In your existing `abbiesworld_ios` checkout, fetch and check out `codex/crayon-physics-integration`; or create a separate checkout:

```sh
git clone --branch codex/crayon-physics-integration https://github.com/evanrobinson2/abbiesworld_ios.git
cd abbiesworld_ios
git checkout 6243f1555d4c93cac85a00e47fe347ffb6ef3885
```

From the repository root:

```sh
brew install xcodegen
gem install xcodeproj -v 1.27.0 --user-install
cd Games/CrayonPhysics
xcodegen generate
cd ../..
ruby scripts/link-crayon-physics.rb
```

Or run `bash scripts/prepare-crayon-physics.sh standalone` (use `host` for the integrated app); it prepares both projects and opens the chosen one without changing signing.

Open `Games/CrayonPhysics/CrayonPhysics.xcodeproj` for standalone development, or `abbies.world.ios/abbies.world.ios.xcodeproj` for the host. The linking script is idempotent and must be run after generating the shared project in a new checkout.

Run standalone unit/UI checks:

```sh
bash Games/CrayonPhysics/tools/verify-on-mac.sh
```

The UI tests open all seven puzzle screens and capture portrait, landscape and large-text screenshots, including the custom ending and scrolling to replay. Ending captures use a DEBUG-only test launch route, not a claim of physical end-to-end campaign play. A separate unit test replays seven solution fixtures through the Swift stroke recognizer and native solver. Neither establishes original-executable parity or replaces drawing with a finger or Pencil. The integrated-host CI test enters through the crayon box, returns to the room and reopens the game. Logs and xcresult bundles are in `Games/CrayonPhysics/verification`.

## Build artifacts

The Crayon Physics Apple build workflow saves evidence for each commit. A simulator app ZIP is emitted only after that job succeeds. Simulator apps run on a Mac iPad simulator, not on a physical iPad. There is no device-install link yet.

## Physical iPad acceptance

Evan owns signing and installation on his Mac. After installing both targets:

- Play the complete seven-puzzle campaign through the ending and replay.
- Check real finger and Pencil drawing/erasing, reset and rotation.
- Check music/sound mute, all four styles, interruptions, background/resume and host music after returning. Listen to the full tracks for accidental vocals and musical loop joins; these full-track exports are not listening-approved seamless loops.
- Check Music style is comfortable to tap at default text size.
- Check terrain/prop stroke visibility on the actual screen and the large-text ending Close Game button near the home indicator. The label is untruncated, but comfortable bottom-edge touch spacing remains unverified.
- Inspect enlarged-text completion, ending and error states that are not covered by the current captured layouts.



Select a valid signing team in Xcode for the app and framework, connect the intended iPad, enable its required development settings, then build/run on that device. Team/account access, provisioning and a successful device run still need verification. Do not copy credentials into the repository. Successful compilation is separate from playtesting all seven solutions, ending, audio, touch/stylus, background/resume, and host entry/return.
