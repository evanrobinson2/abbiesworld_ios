# Game Oracle study backlog

Games for [Game Oracle](https://abbies-game-oracle.vercel.app) to ingest next, and what to learn from each. Requested by Evan on 2026-10-22, after the first Fritigern scene. The goal is for Abbie's World to tell one story in several presentation styles: a cinematic cut, a storybook read-aloud, a game HUD, or Telltale-style dialogue and choices. Studying the games that do this best tells us what each style needs.

Follow the Oracle rules in `prototypes/ranch-atelier/DEVELOPMENT-PRACTICES.md` §12. Keep source-reported facts, direct observations and inferences separate. Research informs our own implementation. It never justifies copying their art, text or code.

## What to capture for every title

1. **Framing**: how a scene opens and closes. Episode cards, "previously on" recaps, chapter titles, credits, end-of-episode summaries.
2. **Overlays**: what sits on top of the picture and when it appears. Subtitles and speaker names, prompts, objective text, letterboxing, diegetic text written into the world.
3. **Choice UI**: how many options, the timer, what silence means, how the game acknowledges a choice ("X will remember that"), and whether choices are shown to have changed anything later.
4. **Editing and pacing**: shot lengths, when the camera cuts or holds, push-ins, how interaction is woven into a cutscene, how long the player waits between inputs.
5. **Kid fit**: what a 6 to 10 year old could follow, what needs reading, and what could be read aloud instead.

Record a short timeline for one representative scene from each game (timestamp, shot, overlay, input), the way `prototypes/ranch-atelier/dist/fritigern/scene.js` lays out its `CUT` and `overlays.js` lays out its cards.

## Titles

### Telltale

- The cutscene study (AW-STUDY-0009, `cutscenes/CUTSCENE_STUDY.md`, page https://claude.ai/artifact/ATBvQmSr62iKEcnRH1A6MJ) turns these into a taxonomy, six style presets and the `layers.cinematics` profile; record new titles in that shape.

- **The Wolf Among Us** (Telltale, 2013 to 2014). Timed four-option dialogue with silence as a real choice, "will remember that" notices, quick-time action, five-episode structure with recaps and end-of-episode choice statistics, and a neon comic-book look. This is the reference for our `telltale` style.
- **The Walking Dead, Season One** (Telltale, 2012). A grown-up protecting a child, with choices that build trust. This is very close to the Fritigern and Alaric relationship.

### Annapurna Interactive (publisher)

- **Mixtape** (Beethoven & Dinosaur, 2025). Vignettes cut to licensed songs. A night of teenage memory told through collage, changes of play style and editing to music. Study how the song drives the cut.
- **What Remains of Edith Finch** (Giant Sparrow, 2017). Narration written into the world as floating text. Each family story has its own controls and point of view. The best reference for our `storybook` style and for text inside the world.
- **Florence** (Mountains, 2018). Almost no words. Interaction stands in for feeling: conversation puzzles get easier as the couple grows close, then harder. Useful for telling a story to children who can't read yet.
- **Kentucky Route Zero** (Cardboard Computer; the 2020 TV Edition was published by Annapurna). Theatrical staging and lighting, dialogue choices that decide who a character is rather than what happens, and acts with interludes. Study the staging and how the camera pulls back to show the whole set.
- **Sayonara Wild Hearts** (Simogo, 2019). A pop album played as a game, with track-by-track pacing and a narrator between songs.
- **Gorogoa** (Jason Roberts, 2017). Story told by rearranging illustrated panels. A good model for kid-friendly framing without text.
- **Outer Wilds** (Mobius Digital, 2019). Knowledge as progress, and a ship's log that remembers what you learned. A model for a persistent object (the helmet) that gathers history.
- **Stray** (BlueTwelve Studio, 2022). Small light HUD, a companion drone that translates the world's writing for the player, and a camera that frames a small character in a big world.

## How it feeds back into Abbie's World

- Each style becomes a preset in `overlays.js` (cards, subtitles, choice timing, HUD parts), so the same scene can be switched between styles.
- Pacing notes become defaults for the director: shot lengths, hold times and how long to wait before a prompt.
- Kid-fit notes decide when a style should read aloud, show pictures instead of words, or slow down.
- The score study (AW-STUDY-0010, `score/SCORE_STUDY.md`, page https://claude.ai/artifact/5Es88srv8cG13XiYU6FFCW) holds the Music Bible (canon) and the listening room; music for new titles follows its identity and `trace` metadata.
- The over-the-shoulder study (AW-STUDY-0011, `shoulder/SHOULDER_STUDY.md`, page https://claude.ai/artifact/F8HG8LMckTjCwQzDsHDsoz) covers the shoulder camera, collision and occlusion, the dive from board to shoulder and the player's animation, with five options (soft shoulder, the dive, a living body, touch the world, ride along). Measure its `estimate` numbers on the PC.
