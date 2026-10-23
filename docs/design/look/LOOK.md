# The Abbie's World look

Evan, 2026-10-23, on the model review page: "design this properly. I mean a real design inspired by abbie's world.
All pages and all studies need to carry this design, and I'm issuing a logo do-over: it's too 2005 mobile."
Owner: the Design lead thread. Previews: https://claude.ai/artifact/WcNpa9yNKCy4k3ySrWSPL1 (the look and logos) and
https://claude.ai/artifact/SvCdPuULhWsmVXg2Nx2F7d (the cuirass page with the Legion motif). Sources in `previews/`.

## Latest direction (Evan, 2026-10-23 03:29-03:31Z): simple, flat, classy

These override anything below that conflicts:
- "Too Rome 1999 Total War. I like the colours but cut the gradients, add class." "Terrible. Just simplify." So: flat
  colour, no gradients, no plaques, no 3D or extruded letters, no ornament. Hairlines and soft shadows only.
- Font: Roboto everywhere ("use roboto font").
- Logo: the drawn options are rejected ("I hate it"). For now the mark is just **AW**, simple, on the motif's sign colour.
- Feedback buttons: **Reject, Chat, Keep** under the right thumb (Reject was dropped by mistake and is back).
- Request more (cart) has its own camera; the top camera is a shortcut into it. The app should register as a "Send to"
  (share) destination: the Web Share Target in the manifest works on Android and desktop Chrome; iPhone web apps
  cannot register, so iPhone gets a one-tap Shortcut instead.
- Less space between the top bar and the content.

## The idea: the toy table (first proposal, kept for the structure)

Every page is a table standing under the world's own sky. Things sit on it as thick toy pieces you could pick up.

1. **The world is the backdrop.** Every page sits under the world's sky at the world's time of day. Dark theme is night.
2. **Things, not panels.** Anything you touch is a thick tile with a wooden (or marble, coral...) edge and a shadow.
   Never a flat box with an outline, never beige paper.
3. **Blocks, not links.** Buttons are painted toy blocks with an icon, and they press down 5 px.
4. **Glass is a lens.** Small and floating, it shows the sky through it. Never a frosted sheet over the world.
5. **Show the thing.** Real art and live 3D on every page; words short. Counters have no words.

Type: Roboto (Evan, 2026-10-23). The first proposal used Fredoka and Nunito.

## Motifs

Paint changes, pieces don't. At least five motifs from serious to silly live in `motifs.json` (Gallery, Legion,
Ranch, From the model, Moonbase, Under the sea, Spooky, Candy party). "From the model" is the default on pages where
one model is the star: the sky, hills and sign take the model's own colours. Everything else uses the place motif.
New motifs are made by Claude with the `motif-maker` skill, on request; there is no motif-maker page.

## Model review and model pages (Evan, 2026-10-23)

- One top bar: home mark, ← sign →, wordless counters (to look at, kept, notes sent), camera, cart.
- Inspiration on the left, Model on the right, both plain small labels. Frames and text are straight and
  aligned to the sides ("it was cute but it didn't age well").
- Turning the model is taught by a white chalk finger with motion, gone at first touch. No words.
- Feedback is one modality: **Reject**, **Chat** (talk or type in the same place; it dispatches to feedback) and **Keep**.
  All sit under the right thumb, bottom right. Voice is a centred overlay orb like ChatGPT's voice mode, with a text field.
- **Request more** is a shopping cart (top right). Each order goes to Claude as a new order and always starts as
  concept art for Evan to pick; it never bypasses the concept stage.
- **Camera** (top right) uses the device's own camera. PG layer on every photo: photos with faces may be taken, but a
  child's face is never redrawn, modelled or turned into a likeness, and nothing unclothed is ever made. The check runs
  on the server before anything is sent on.

## Logo

Evan rejected the four drawn options (little world, snow globe, house A, planet o). For now the mark is plain "AW".
The old badge stays as "Abbie's Ranch", the place.

## The model card as a callout (Evan, 2026-10-23 03:38Z)
"This model card is actually perfect as a call out from the simple view when you click on something in game."
- `prototypes/ranch-atelier/dist/look/callout.mjs` + `callout.css`: `openCallout({name, kind, description, art, glb | hero, focal, anchor})`.
  The same card as /models: name, inspiration and live model as equal squares, numbered focal points marked fair, close or off.
- Spatial presentation layer: plain DOM beside the tapped thing with a tail pointing at it, never in the scene. No scrim. Phones get a
  bottom sheet at thumb height. Escape or × closes it. Demo: /look/callout-demo.html.
- Sandbox v2 owns the tap hookup (`ranch:inspect` events from simulations/lab.mjs) and ships it.

## Model page, tighter (Evan, 2026-10-23 03:48Z)
Labels sit inset inside the frames; the Reject, Chat and Keep cluster sits right under the two squares (not pinned to the screen
bottom); less padding everywhere.

## Coming alive (Evan, 2026-10-23 03:51-03:52Z)
"It indicates a transformation from a picture and description of a thing to the thing itself, coming alive out of the picture."
- The inspiration is a print: the image and its prompt share one frame. The model has no frame and stands free on the page.
- Labels ("Inspiration", "Model") use the title's type, Title Case, no chips or shadows. Names are Title Case.
- The model appears with a 0.5 s laser print, bottom to top (skipped under reduced motion).

## The browser and two modes (Evan, 2026-10-23 04:00-04:03Z)
- See them all is the review card in small: the framed print and the free model side by side. One wordless toggle: Row (one
  card at a time, swipe) or Screen (all as a grid). Remembered per viewer (`aw-browse`).
- App mode is the flat look (Default, Rome, Efficient) and the default from the Studies and app.abbies.world. Game mode is
  the toy-table look (sky gradient, hills, thick tiles with a wooden edge, Fredoka and Nunito) with the motifs.json styles.
  The gear switches between them on every page; `?mode=game|app` picks one for a link. Tokens live in look.css.
- The look page (https://claude.ai/artifact/WcNpa9yNKCy4k3ySrWSPL1) has the same switcher plus a style editor: change any
  colour, Save (your styles) or Save as, delete your styles with a confirm.
