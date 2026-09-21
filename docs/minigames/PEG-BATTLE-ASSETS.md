# Peg Battle assets — spend your time where it pays

Pegs, the marble, aim, pop, HUD, and decorators are **code**. Do not paint those.

The generated wallpaper-and-clip-art pass is what made the last video look like a web page, not a toy. Until the board is fun, more generated interiors will not help.

## Do not paint (already in the engine)

| Thing | Why |
| --- | --- |
| Block pegs | SVG rounded bricks |
| `strength` / `gone` / `present` / `sticky` / `valuable` / paint / star / heart | Badges on those bricks |
| In-flight marble | Programmatic orb, sized against PegglePy (`ballRad` 12 / `pegRad` 25) |
| Aim dots, hearts, POWER call, comic POW/WOOF | Code FX |
| Felt playfield | CSS / Swift fill so bricks read |

## Give us these, in this order

Ranked by **your minutes vs what the kid sees**.

### 1. One Bad Doggo plate — do this first

**Your time:** one drawing. **Benefit:** the whole duel stops looking like stock clip-art.

Front 3/4, confident, same collar/fur, kid-safe goofy dog. White or lime studio so we can carve. We derive hurt + defeated later from this one identity. Do **not** paint three different dogs.

If a creature-card Bad Doggo already exists in your plates, point at that file and skip this.

### 2. Say whether Abbie is on-screen

**Your time:** a yes/no. **Benefit:** we stop guessing the comic layout.

If yes, we reuse an existing Abbie portrait from the app. Do not draw a new battler until the board is right.

### 3. Five ball *card* stickers — only after the board feels good

**Your time:** five small stickers, same size. **Benefit:** the hand reads as toys, not emoji.

Star, Bubble, Paint, Rocket, Boomerang. These are **cards**, not the marble that flies. The flying orb stays code.

Glyphs already work. Skip this if you would rather play first.

### 4. Hurt + defeated of the *same* dog

**Your time:** two poses of plate #1, not new designs. **Benefit:** hit and win land.

Wait until #1 is locked.

## Do not spend time on yet

- Pavilion interiors / arena wallpaper (the board is felt on purpose)
- Peggle Land placement (you already own that)
- Extra enemies, safari gardens, more boards
- Peg tilesets, orb sprites, muddy drips, dashed-slot art
- Another image-model pass

## Later, if the toy is fun

| Asset | Why it can wait |
| --- | --- |
| One felt/wood *frame* around the board | Dressing, not gameplay |
| Second opponent plate | Same pipeline as Bad Doggo |
| Card backs | Deck already has color chips |

## How to give us #1

Drop one PNG into the pack when you have it. We carve and wire `bad-doggo/confident`. Until then the generated portrait stays a **72px chip** so it cannot steal the board.
