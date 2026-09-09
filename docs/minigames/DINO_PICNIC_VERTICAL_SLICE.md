# Dino Picnic Vertical Slice

Status: implementation-ready product and test contract

Target: Abbie’s current iPad

Round length: 45–60 seconds

## Product bet

Dino Picnic tests whether character requests, aiming, exaggerated reactions, and changing outcomes create voluntary replay.

This is not a polished reskin of Balloon Pop. The player makes a choice, develops a small physical skill, helps a character, and sees a different response.

Continue beyond the vertical slice only if Abbie understands the interaction without explanation and voluntarily feeds another dinosaur or starts another round.

## First-round loop

1. A dinosaur flies in, notices the picnic, and asks visually for one of three snacks.
2. The three snacks remain visible and touchable.
3. Abbie touches anywhere in the safe play area and pulls or flicks toward the dinosaur.
4. The chosen snack launches immediately with sound, haptic feedback, and a readable trail.
5. A generous magnetic assist bends near-misses toward the dinosaur.
6. The dinosaur catches or playfully reacts to the snack.
7. A picnic-party meter fills. It never drains.
8. The dinosaur changes path, request, or personality and the loop repeats.
9. After five feeds, the characters hold a short picnic celebration.
10. Abbie chooses **Again** or **Done**.

## Removed from the current DinoSnacks prototype

- Architectural grid and row/column labels
- HUD toggle
- Power slider and numeric power input
- Remaining-food depletion
- Dinosaur theft
- Game-over screen
- Fixed ten-dinosaur obligation
- Accuracy score
- Punishing miss feedback
- Debug position dumps in normal play

The physics and useful diagnostics may remain behind development flags.

## Meaningful choices

The first slice needs three choices that visibly change play:

- Snack: berry, sandwich, or cookie
- Dinosaur: two personalities selected deterministically from the session seed
- Celebration: wiggle dance or heart burst

A requested snack produces the biggest reaction. A different snack still succeeds and produces a funny surprise; it is never “wrong.”

## Gentle assistance

- Start with an aim corridor wider than the visible dinosaur.
- Apply magnetic steering when the projected path passes near the target.
- After two wide misses, show a short dotted trajectory for the next launch.
- After three seconds without input, pulse the snacks and demonstrate one small pull.
- Ignore touches inside close, pause, and parent-control regions.
- Keep infinite snacks and automatically return a failed launch.
- Count a feed once, using an idempotent launch identifier.

## Session variation

At least two dimensions change between rounds:

- Dinosaur personality and color
- Requested snack sequence
- Horizontal and curved flight paths
- Reaction animation
- Celebration choice
- Background detail layer

Variation is seeded so automated tests can reproduce a round exactly.

## Delight contract

Every launch includes:

- Elastic stretch sound with pitch based on pull distance
- Release whoosh
- Light haptic
- Squash on launch
- Trail or speed streak

Every feed includes:

- Catch anticipation
- Munch or surprised vocalization
- Crumb, heart, or sparkle effect
- Character squash-and-stretch
- Party-meter movement
- Short status phrase that describes what happened

No single reaction should block the next launch for more than 1.5 seconds.

## First art and audio pack

### Bundle budget

- One layered picnic background, maximum 2048 pixels wide and target under 1MB
- Two dinosaur personalities
- Three snack sprites
- One picnic-party meter
- Three reaction effects
- One short celebration
- Essential sound effects and one music loop

Everything needed for the round is bundled or installed atomically before play.

### Dinosaur animation budget

Replace the existing 154 loose transparent frames with an atlas:

- 8–12 flight frames
- 3 anticipation frames
- 4 catch/eat frames
- 3 surprise frames
- 4 celebration frames

Target 24–32 unique frames per personality after reuse. Do not load the 154-frame source sequence at runtime.

### Audio budget

- `stretch`
- `release`
- `near_miss`
- Two distinct `munch` sounds
- Two dinosaur vocal reactions
- `party_meter`
- `celebration`
- One trimmed Flying Picnic loop

Record source, author/tool, generation prompt when applicable, license, date, and transformations for every asset.

## StoryBoard mapping

The first build uses a bundled `abbies-play-pack/v1` fixture. The same content should later compile from StoryBoard:

- Project → Dino Picnic play world
- Scene → one picnic round
- Developed beats → arrive, request, launch, react, celebrate
- Character canonical media → dinosaur atlas and portrait
- Music cue → picnic loop and celebration transition
- Canonical production artifact with `application/vnd.abbies-world.quest+json` → round configuration
- Avoid feedback → excluded dialogue, imagery, and reactions

Example quest profile:

```json
{
  "id": "dino-picnic-first-round",
  "template": "dino_picnic",
  "roundLengthSeconds": 60,
  "feedGoal": 5,
  "snackIds": ["berry", "sandwich", "cookie"],
  "dinosaurIds": ["dino-breezy", "dino-giggly"],
  "failureState": "none",
  "completionReward": 5,
  "curiosityBonus": 1,
  "ratingAffectsReward": false
}
```

Pack data configures native behavior; it never contains executable code.

## Economy contract

- Award five Star Seeds after the first completed round.
- Award one curiosity bonus when at least two snack types were tried.
- Use the quest-run ID as the idempotency key.
- Replaying remains rewarding as play, but does not duplicate the first-completion grant.
- The reward never depends on speed, accuracy, choosing the requested snack, or avoiding assistance.
- Event-derived or preparation quests are never paywalled.

## Structured events

Emit one-line JSON or stable key-value logs for:

- `dino_picnic.launch`
- `dino_picnic.ready`
- `dino_picnic.first_touch`
- `dino_picnic.snack_selected`
- `dino_picnic.snack_launched`
- `dino_picnic.assist_applied`
- `dino_picnic.feed_completed`
- `dino_picnic.round_completed`
- `dino_picnic.reward_granted`
- `dino_picnic.replay_selected`
- `dino_picnic.exit`
- `dino_picnic.error`

Include session seed, pack ID/version, quest-run ID, elapsed milliseconds, and non-sensitive game state. Do not log raw family notes or identity labels.

## Deterministic test hooks

- `-launchDinoPicnic` opens the game directly.
- `-autoPlayDinoPicnic` runs the complete success path.
- `-dinoPicnicSeed <integer>` fixes requests, paths, and reactions.
- `-dinoPicnicForceAssist` proves the magnetic-assist path.
- `-dinoPicnicOffline` proves the bundled/installed pack path.

The automated path must launch five unique snack IDs, trigger at least one assist, complete exactly one round, grant the reward exactly once, and leave no active timer or audio after exit.

## Simulator acceptance

- Build for the matching iPad simulator.
- Verify portrait and landscape behavior or enforce one orientation deliberately.
- Confirm all controls respect safe areas and remain at least 60 points.
- Complete the deterministic autoplay path.
- Capture the ready, first reaction, and celebration states.
- Verify structured event order and exactly-once reward behavior.
- Close and reopen the game; prove timers, audio, textures, and observers were released.
- Run offline with the network unavailable.

## Physical-iPad gate

Engineering proof:

- Installs and launches on Abbie’s current iPad.
- Touch-anywhere pull works outside protected controls.
- Audio and haptics occur without clipping or lag.
- No layout clipping in the chosen orientation.
- Closing the game restores the main app’s music and interaction.

Engagement observation:

- Time to first meaningful action
- Whether explanation was required
- Which reaction held attention
- Whether assistance was noticed or frustrating
- Whether Abbie fed another dinosaur
- Whether Abbie selected **Again** without prompting

Record observations descriptively. Do not infer ability, diagnosis, motivation, or learning from one session.

## Stop conditions

Do not produce a large art batch or additional levels if:

- Abbie does not understand the pull/flick interaction after the idle demonstration.
- Reactions interrupt play or feel repetitive.
- She leaves before the second dinosaur without returning.
- She completes the round but does not choose another action.

Change the mechanic or character response first. More content cannot repair a weak loop.

## Implementation boundary

Integrate under the main iOS target:

```text
Views/Minigames/DinoPicnic/
ViewModels/DinoPicnicViewModel.swift
Models/DinoPicnicModels.swift
Services/DinoPicnicAudioService.swift
```

Reuse the existing DinoSnacks pull, projectile, spawning, and collision work selectively. Do not copy its debug UI, duplicate audio manager, or standalone-app lifecycle into production.
