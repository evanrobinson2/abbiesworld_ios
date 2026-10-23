# Game canon

Facts about Abbie's World that every game, study and feature follows. Add a line when Evan makes something canon, with
his words and the date. Design grammar lives in `GAME_FEEL.md`, `docs/design/INTERACTION_GRAMMAR.md` and the HUD study;
this file is about what things *are* in the world.

## Gold coins are Daddy's core memories (Evan, 2026-10-23 09:05Z)
- An 8-bit gold coin. Memory places hide them: Grace's basement 10, the school roof 1; the Moon base gives a key.
- One count across every place: `simulations/memory-coins.mjs` (`aw-memory-coins`). Finding one plays the golden
  reward (`simulations/coin-reward.mjs`). In the backpack they ride as a little pile of coins in the front half.

## Player inventories are backpacks (Evan, 2026-10-23 15:53Z, AW-STUDY-0046)
> "player inventories are backpacks, and they are opened fully 'half shell' style even though they need not physically
> match that, we can just cleave the mesh ... she should be able to pick from 10 different styles, and then customize 5
> different facets in different ways, and one of the vanity badges she can earn in the game for completing quests is
> backpack charms."
- One inventory: the store is `simulations/inventory.mjs` (`aw-inventory`); the backpack is how it looks and opens
  (`simulations/backpack.mjs`, `aw-backpack`). Never draw a pocket, a bag of slots or a grid.
- It opens "half shell": the mesh is cleaved into two halves that open like a clamshell, both insides facing you,
  things in both halves. Not physically accurate, on purpose.
- Ten styles: Classic, Explorer, Astronaut, Bunny, Saddlebag, Turtle shell, Roll-top, Retro, Wicker, Rocket.
- Five facets: Colour, Pattern, Pocket, Straps (strap colour and hardware metal), Lining.
- Charms are vanity badges, one for each quest she completes, hanging on the backpack. They are earned, never bought.
  The first ones come from Daddy's core memories (first coin, all of the basement, the school roof, every memory) and
  from quest items (the café key, the Moon base key). A quest without a signal yet calls `earnCharm(id)` when done.
- When her figure wears the backpack in the world, the charms are diegetic: other characters can see them and react.

## Inventory is first-class (Evan, 2026-10-23)
- It lives in the top bubble (the chronograph) and appears only once she carries something or has a charm.
- Picking up: Abbie's inner voice (a small girl's voice of wonder) says one line, then the thing drops into the backpack.
- First item: the café register key that unlocks Grace's basement.
