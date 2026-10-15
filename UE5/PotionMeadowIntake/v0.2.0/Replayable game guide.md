# Abbie's Potion Meadow — Cliff Region

Choose **Easy**, **Medium**, **Hard**, or **Surprise me**. Surprise me selects one of those three difficulties. Every new adventure receives a new seed, enemy positions, ingredients and rock obstacles. Retry preserves the board seed so Abbie can learn from the previous attempt.

The goal is always to reach level 3, cheer up pumpkin goon 3, and enter the picnic clearing. There is no timer and movement costs no hearts. Click a square to walk; click a goon to approach, then click again to challenge. Hovering a goon previews its next reply, including shield protection and whether Abbie's attack will finish it.

| Difficulty | Starting hearts | Starting heart / star potions | Ingredients | Rocks | Goon hearts |
|---|---:|---:|---:|---:|---|
| Easy | 8 | 2 / 2 | 3 berries + 3 flowers | 3 | 2, 4, 6, 8 |
| Medium | 6 | 1 / 1 | 2 berries + 2 flowers | 9 | 2, 4, 6, 8 |
| Hard | 6 | 1 / 1 | 2 berries + 2 flowers | 15 | 2, 6, 8, 10 |

Abbie deals 2 per challenge. Goon 0 deals none. Goon 1 replies for 1 heart; goons 2 and 3 reply for 2, except goon 2 on Easy replies for 1. A defeated goon does not reply. The first three goons raise Abbie to level 3; the pumpkin is the final challenge.

A heart potion restores 4 hearts, up to the maximum. A star potion blocks 3 incoming hits. Full-health heart potions and duplicate active shields are preserved. Berries brew heart potions and flowers brew star potions at the cauldron. Each brew consumes one ingredient. All ingredients can be reached before fighting; later difficulties reward collecting and brewing before committing to the stronger encounters.

The generator rejects layouts with disconnected walkable regions, inaccessible ingredients or cauldron, an unreachable finish, or a goon without an accessible neighboring square. A deterministic fallback removes rocks if placement cannot satisfy those constraints. The rule solver verifies a winning plan using the available potions and reachable ingredients; it is used in QA, not to choose Abbie's actions.

## Feel and controls

The original effects include spring movement, squash-and-stretch, collectible bobbing and halos, hovering path/target previews, rising outcome text, liquid bubbles, cauldron bubbles, shield orbits, small damage shake, level-up pops and picnic confetti. Eight original synthesized musical effects provide soft footsteps, collection pops, potion/brew sounds, challenge accents, level-up, victory and retry cues. These are adaptations of presentation ideas studied in Desktop Dungeons: Rewind, Peglin and Abbie's World's animated opener; their art, audio and native effect files were not copied.

**Bubbles: gentle** disables ambient motion, spring movement, shake and moving particles, while retaining persistent state feedback and fading cues. **Sound** can be muted. These preferences and picnic win counts persist locally. In-progress boards are not saved when the application closes.

1 / 2: drink heart / star. R: retry same seed. N: new board of current difficulty. M: choose difficulty. Escape: close help, open difficulty menu, then return to Abbie's World. The win and retry dialogs own input and prevent clicks from reaching the board underneath.

This is a complete small single-player replayable adventure, using static illustrated cutouts in Unreal Slate. It has no skeletal character animations, online accounts, multiplayer, campaign progression, or voice narration.
