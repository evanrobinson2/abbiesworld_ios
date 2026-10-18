# Crayon Physics delivery

Both apps compile the same CrayonPhysicsKit framework. The standalone app starts directly at the game title. In Abbie's World, open Abbie's Cozy Nook and tap the crayon box; closing the game returns to that existing room.

## Build on a Mac

Requires Xcode with iOS 18.5+ SDK for the host, an installed iPad simulator runtime, XcodeGen and Ruby xcodeproj 1.27.0.

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

The UI test opens all seven puzzle screens and captures screenshots. It does not solve them or establish reference-physics parity. Logs and xcresult bundles are in `Games/CrayonPhysics/verification`.

## Build artifacts

The Crayon Physics Apple build workflow saves evidence for each commit. A simulator app ZIP is emitted only after that job succeeds. Simulator apps run on a Mac iPad simulator, not on a physical iPad. There is no device-install link yet.

## Physical iPad

Select a valid signing team in Xcode for the app and framework, connect the intended iPad, enable its required development settings, then build/run on that device. Team/account access, provisioning and a successful device run still need verification. Do not copy credentials into the repository. Successful compilation is separate from playtesting all seven solutions, ending, audio, touch/stylus, background/resume, and host entry/return.
