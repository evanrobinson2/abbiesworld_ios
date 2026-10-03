# PlinkCore — Abbie's Plink

Abbie's World pegboard prototype **inspired by Peglin physics + Peggle clear-oranges**, not a Peglin clone.

**Loop:** pick orb → aim (laser = true path) → shoot → light pegs → lit pegs pop on exit → clear oranges. Yellow **crit** multiplies plink (retroactive). Green **refresh** restores lit blues mid-shot.

**Orb knobs (Peglin vocabulary):** `fireForce · gravityScale · bounciness · mass · radius`  
**World knobs:** `gravity · tilt · wall e · wood drag · max speed`

Orbs: Sparkle · Bounceberry · Pebble · Zipbolt · Puff

See `PEGLIN_KNOWLEDGE_MAP.md` for the design map.

```sh
cd prototypes/PlinkCore
xcodebuild -scheme PlinkCore -destination 'platform=iOS Simulator,name=iPad (A16),OS=26.3.1' \
  -derivedDataPath /tmp/PlinkCoreBuild build
xcrun simctl install booted /tmp/PlinkCoreBuild/Build/Products/Debug-iphonesimulator/PlinkCore.app
xcrun simctl launch booted world.abbies.PlinkCore
```
