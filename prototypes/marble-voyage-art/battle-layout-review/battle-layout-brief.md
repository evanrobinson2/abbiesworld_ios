# Battle screen: make the opponent unmistakable

Art direction by Codex for Evan, 26 September 2026. Based on the supplied 1480 × 1086 game screenshot and a read-only inspection of the current working tree. This is a design proposal and implementation handoff, not a verified app change.

## Recommended composition

Put the playable board on the left and the current enemy on the right. Keep Abbie’s identity, health, turn and navigation in a short header. The board should be the largest uninterrupted surface; the active opponent should be the largest character. Place the captive in a separate, explicitly friendly rescue block.

The accompanying `battle-layout-proposal.html` lets Evan compare the source screenshot with the proposal, show composition callouts, and preview the opponent’s distance/attack wording. `proposed-battle-screen.png` is a rendered design reference. The peg arrangement and secondary portraits illustrate layout; they are not a replacement level or a claim about the current seeded roster.

## What the supplied screen communicates poorly

- The portrait band occupies roughly 40% of the screenshot’s height, but its portraits use only a small fraction of that area. Its mostly empty glass surface competes with the actual game.
- The board is constrained to about 40% of the screenshot width. Its small pegs sit over a brightly colored fox painting; warm orange pegs merge with warm orange character details.
- The main opponent is confined to a small square among other small squares. “BAD GUYS” identifies a group, while the actual target’s identity is in a separate tiny sentence.
- The fox portrait looks like another combatant. The screenshot does not visibly expose the rescue label, even though the source contains one.
- “4 out · ATK 16” compresses the mechanic into shorthand. The lane dots are too small to explain distance by themselves.
- “Cage” is bound to `totalDamageDealt`, while the captive has no HP. That wording tells the wrong story. “Hurt” is similarly less clear than “Damage taken.”
- The expanded log and music transport claim permanent space, including an empty log before the first shot.

## Visual specification

### Header

Use a bounded single row for Leave, Abbie’s portrait and health, turn/action state, location, and one music button. Avoid a full-width empty instrument panel. Do not shrink labels until they disappear. On shorter or narrower screens, drop secondary location copy before sacrificing health, target identity, or touch targets.

Abbie’s selected Midjourney portrait, job `00a6a09a-870c-4dab-9352-4625330acd99`, candidate 3, is now the default happy/idle catalog asset and appears in this proposal. Preserve her curls, blue eyes and raspberry adventurer costume as the identity reference for future expressions.

### Board and powers

Allocate approximately 70% of the usable width to the board column at the supplied tablet-like aspect ratio, with about a quarter for the enemy panel and the remainder for margins/gutter. Preserve the board’s 4:3 geometry. In the 1440 × 1024 reference composition the board is 1012 × 759, versus approximately 590 pixels wide in the 1480-pixel source screenshot. Normalized by screen width, that is about 1.76× the board width and roughly 3× its area. These are composition estimates, not device-point measurements.

Use one quiet, dark teal playing surface with bright pegs and clear silhouettes. Keep scenery near the edges or behind the outer frame. Remove the large character face from behind the aiming and collision field. The first pass can use a restrained fill; an actor-free regional board plate can follow later. Do not cover pegs, paths, or labels with scenic detail or effects.

Maintain real flight space between launcher and pegs. This serves aim and trajectory reading; it is different from blank decorative panel space. The prototype peg field is illustrative: preserve actual level geometry and SpriteKit physics in implementation.

Place the three powers in a horizontal tray outside the board’s hit area, with their existing icons, names and remaining counts. Keep child-friendly touch targets. Use existing mechanics: Refresh makes new pegs appear; Fire burns pegs touched; Split makes one ball become three. The prototype buttons demonstrate selection/help only.

### Active enemy

Use the full name **Porcupine Boxer** beside **FIGHTING NOW**. Give the character a large cutout with a visible face, gloves, quills and feet. A focused backing surface is sufficient; avoid framing every character with equally strong glowing boxes.

Place a readable health number, e.g. **44 / 44**, beside a substantial bar. Keep the name, art, health and intent together. Normal peg damage must visibly travel to or react on this same target. Only the active enemy receives the strongest emphasis.

Suggested information priority: name → recognizable silhouette → health → imminent danger → remaining foes. Use roughly 22–28 pt for the primary enemy name, 17–20 pt for key numbers, and 14–16 pt for explanatory copy in the actual SwiftUI layout, then verify at device scale. Those are starting targets, not raw screenshot-pixel sizes. Do not translate the prototype’s scaled desktop CSS pixels directly into iOS points.

### Intent and distance

Bind the display to the actual front foe and `resolvedEnemyAttack`, not a static description. At four lanes away: **“4 steps away”** and **“Moves closer after your shot. Hits for 16 when she reaches Abbie.”** At lane 1: **“Reaches you after this shot”** with its imminent damage. At lane 0: **“In striking range — attacks after your shot if she survives.”** Flying foes need their own wording because they attack from any lane.

The current rules advance ground foes before checking their attack, so a foe at lane 1 can attack at the end of the upcoming shot. A warning must account for that boundary. Do not simply show “no attack” whenever the current lane is above zero.

Use a short track with an Abbie end label and a clear position indicator as a supporting visual. Text carries the meaning; color and tiny dots alone must not carry it.

### Other foes and rescue

Keep the other living foes in a quiet, compact queue with identifiable art and readable health. Their bars must update when a bomb damages everyone, even while a different foe remains the current target. Queue entries should not imply manual target selection if the game continues to use automatic front targeting.

Give Fox a distinct block labeled **Rescue Fox — defeat all 3 foes**. Use friendly color and explicit language. No enemy-colored HP bar and no false cage health. Keep this label visible under width pressure. Bind the count and rescue state to the real roster; the mockup’s count is illustrative.

### Secondary controls

Keep only a music button during normal play; open transport and volume in a popover. Put battle history in a disclosure or details panel. After a shot, briefly expose useful feedback next to the affected character or in a compact result row. Name totals **Damage dealt** and **Damage taken**. Avoid a permanent tall empty log before any shot exists.

Respect Reduce Motion and keep damage readable without shake/flashes. Test text at larger accessibility sizes and retain at least the project’s existing touch-target minima.

## Current code findings and likely implementation scope

`PlinkBattleHostView.swift` owns the layout. `fightLayer` stacks `fightTopBar`, `fightPortraitBar`, and the remaining `fightBoardPane`. `fightPortraitBar` contains flexible `Rectangle` dividers with width but no explicit height bound. This is a plausible contributor to the expanded band seen in the screenshot; it has not been proven by running the app. The source’s intent comment says “keep height compact,” but the layout does not enforce that contract.

`fightBoardPane` calculates `MarbleVoyagePlateLayout.fitSize(in:)` from the remaining bounds. Reducing its height therefore reduces its width. This directly explains why the board contracts when the band above grows. Feed, powers and music currently overlay the board pane rather than participating in dedicated layout regions.

`fightRescueCell` contains the missing visible rescue copy, while sibling cells compete for flexible width. The redesign should give the rescue block an intentional width and text priority rather than allowing it to compress out of sight.

`PeggleScene.drawBackdrop` paints the same land image under the pegs with a light darkening wash. Separate the playfield backdrop treatment from the surrounding scenic plate. Preserve the established 4:3 board contract and scene coordinate behavior; do not stretch the board to fill a rectangle.

`PlinkAttackerKind.catalogImage(for:)` prefers a portrait for idle and attack whenever one is bundled. For the proposed large opponent, explicitly select the intended full-body combat asset in the appropriate view. Do not accidentally show an unrelated portrait or change every use of the loader without checking its callers.

The first repair could bound the existing portrait band and preserve more board height. The recommended final layout is the board-plus-opponent split shown here. It needs a focused UI refactor, copy changes and backdrop treatment; no combat balance change or new character generation is necessary to establish the hierarchy.

Cursor already has changes in several of these files in the shared working tree. The design pass intentionally did not patch SwiftUI or SpriteKit. Cursor should inspect the current diff, incorporate this layout into that work, and update the design-rule checks to test the actual layout contract rather than bypassing them.

## Review before calling it finished

- At the original device size, identify Abbie, the active enemy, and the captive without opening a tooltip.
- Confirm the board grows while preserving 4:3, actual aiming coordinates, all pegs, margins and launcher clearance.
- Capture opening, damaged foe, lane 1 danger, melee, flying foe, bomb damage to the queue, next-foe promotion, and rescue complete.
- Test short/wide landscape bounds and larger text; move secondary detail out of the way instead of shrinking primary text to fit.
- Verify music/feed popovers and power buttons never swallow board input while closed.
- Keep portrait identity consistent across happy, hurt, defeated and wink states. The new default profile is installed; the other states still need matching art.
- Verify in the app after a successful build. No build was attempted here because of the previously reported package-manifest warning. The HTML review is not evidence of SwiftUI runtime behavior.
