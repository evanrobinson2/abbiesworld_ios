# How things are used in Abbie's World: the interaction grammar

Evan, 2026-10-23: "choose interaction mode according to our unwritten grammar incorporating our learnings about meta
etc." This page writes that grammar down. It sits beside the information grammar (`CLAUDE.md`, "How Abbie's World
shows information"; `docs/oracle/hud/HUD_STUDY.md`) and the game-feel laws (`GAME_FEEL.md`). Those say how the game
*shows* things. This one says how the player *does* things. The first place built on it is Grace's basement
(AW-STUDY-0024, `prototypes/ranch-atelier/dist/studies/basement/play.html`).

## The one verb: touch the thing

1. **Touch the thing you mean.** There is no verb bar, no menu and no cursor mode. Tapping something means "go there
   and use it", and the thing decides what using it means. A switch flips, a chair is sat on, a clipboard is read
   and a disk goes into the drive. Tapping the floor means "walk there".
2. **Approach is not commitment.** Walking up to something never uses it. The player sits only by touching the
   chair, and switches the light only by touching the switch. The world may *invite* (the chair's cushion catches
   the light, the switch's glow dot pulses), but it never decides for the child.
3. **Every touch answers within one frame**, with motion, sound and a little light (GAME_FEEL law 4). A thing that
   can't be used yet still answers: a wobble, a soft "boop", or the character's thought. Never an error.

## Close-ups are how you handle small things

4. **A small thing comes to you.** For something with parts (a switch plate, a clipboard, a screen to wash) the
   camera eases in to a close-up and the child works it directly: tap each toggle, drag the cloth across the glass.
   This is GAME_FEEL law 3 (direct manipulation, previewed in the world) at the scale of a hand.
5. **Leaving is always the same.** Tap anywhere outside the thing, swipe down, or press Escape, and the camera eases
   back out. No close button.
6. **Nested worlds are camera moves.** Sitting at a computer swoops the camera into its screen. Inside, the inner
   world has its own era and rules (a real DOS keyboard). Standing up swoops back out. Each layer is a whole game
   inside the last, the "creative journey": the café, then its basement, then the computer in the basement.

## The character thinks out loud

7. **Inner voice is the narrator.** What only the player needs to know at a story moment ("It's dark in here... it
   feels old.") is the character's own thought. Evan, 2026-10-23 09:17Z: it is a caption at the bottom of the screen
   in the place's era font (the basement uses the 16-bit VT323), plain high-contrast white, no outline, no panel.
   At most one line, and it fades when she moves on. Her spoken voice is reserved for a recorded child's voice.
8. **Choices follow beneath, like a terminal.** When there is a real fork, the choices are lines under her thought:
   "> Try the switches", "> Go back up". Tapping a line, or tapping the thing itself in the world, does the same.
   There is never a dialog box.
9. **Hints come from her, not from the game.** After a while without progress she wonders aloud ("Maybe the middle
   one is upside down?"). The game itself never speaks.

## State lives on things

10. **Lists are paper.** A to-do list is a real clipboard in the room, in Grace's handwriting. You read it by
    picking it up (a close-up). Ticks are pencil marks that appear on it when a job is done. There is no quest log.
11. **Progress is the room changing.** Lights come on, the screen comes clean, the drive light blinks, coins pile
    up in a jar. These follow information modes diegetic first, then spatial, then meta. An overlay is used only
    for the one thing that needs precision.
12. **Nothing fails.** Wrong switch combinations just make different light. Washing a dry screen just smears. The
    piece goes back, the light stays dim, she thinks about it.

## Sound and music follow the same grid

13. **Every touch has a material sound** (wood, concrete, rug, plastic, glass). Music is meta: it tells the child's
    body where the story is. The basement's faint 8-bit tune grows as she nears Grace's computer, because the
    computer is calling her.
14. **One signal drives everything.** Lights on means the bulb glows, the room's colours appear, the furnace hum
    steps back, and her thought changes.

## Grown-ups

15. **Grown-up things live behind a door** (GAME_FEEL law 12). Captions under the voice are the only words in play,
    and they are for the grown-up reading along.

## Climbing: tap what shines

Learned in the school jump (AW-STUDY-0032). Holds a hand can reach shine like a worn spot where small hands have been.
Tap one and the hand that can reach it goes there; the child never chooses a hand and never has to let go first. When
both hands could go, the game picks the one that keeps the most holds in reach further on, so a climb can't trap you.
Tapping your own hand lets it go. Being seen costs ground, not the run: you slide back to the last cover. The rules are
`simulations/climb-kit.mjs`; any game that climbs imports them.

## Checklist for a new interaction

- What does she touch, and what does that thing do on its own?
- If it has parts: what is the close-up, and what does the child's finger do in it?
- What does she think the first time, and what if she is stuck?
- Which sound does each material make?
- What changes in the room afterwards (the information mode)?
- Does any part of it still need a word on screen? If so, it is her thought, as a caption at the bottom.
