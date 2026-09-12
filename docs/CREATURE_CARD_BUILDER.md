# Abbie's World — Creature Card Builder

## 1. Game Concept

Creature Card Builder is a minigame embedded inside **Abbie's World**.

The entire game is:

> Pick three ingredients → create a creature → wait for it to hatch → reveal its card → add it to your collection → make another one.

There is no combat system in the MVP.

There are no traditional minigames inside this minigame.

There are no numerical stats, deck strategy, or economy required.

**Making the cards is the game.**

The fun comes from:

* choosing combinations
* imagining what they might become
* watching them generate
* seeing the surprise result
* collecting favorites
* making weird combinations
* building a personal deck

---

## 2. Player Fantasy

The player is a creature inventor.

Every creature is built from exactly three understandable ingredients:

### Creature

**Who is it?**

Examples:

* Girl
* Dragon
* Bunny
* Robot
* Cat
* Alien
* Dinosaur
* Monster

---

### Outfit

**What powers does it have?**

The outfit is not cosmetic.

The outfit is a magical uniform that confers abilities.

Examples:

* Lightning Racer
* Astronaut
* Ninja
* Firefighter
* Wizard
* Superhero
* Knight
* Pirate
* Ice Explorer

A dragon wearing an astronaut outfit becomes a **space-powered dragon**.

A bunny wearing a ninja outfit becomes a **ninja bunny**.

---

### Buddy

**What personality does it have?**

A small animal companion influences the creature's personality, mood, style, pose, and secondary visual treatment.

Examples:

#### Bat

* spooky
* gothic
* mischievous
* nocturnal
* darker styling

#### Cheetah

* fast
* competitive
* energetic
* athletic
* confident

#### Puppy

* happy
* loyal
* playful
* friendly

#### Owl

* clever
* mysterious
* calm
* magical

#### Peacock

* dramatic
* proud
* colorful
* glamorous

The Buddy should normally appear visually with the creature, but its more important role is to influence the resulting creature's personality.

---

## 3. Core Formula

Every card is generated from:

```text
CREATURE + OUTFIT + BUDDY = NEW CREATURE CARD
```

Example:

```text
Dragon + Lightning Racer + Bat = Nightbolt Dragon
```

Another:

```text
Bunny + Astronaut + Cheetah = Comet Bunny
```

The AI interprets the combination rather than merely pasting the three elements together.

---

## 4. Target Player

Primary target: **approximately age 6**

Therefore:

* no typing required
* no prompt writing
* no complicated menus
* no reading required to make a card
* large tappable choices
* visual-first interface
* immediate feedback
* forgiving navigation
* no destructive actions without confirmation
* generation should continue even if the child leaves the screen

A child should understand the primary interaction without an adult explaining it.

---

## 5. Entry Point in Abbie's World

Creature Card Builder appears as one activity within Abbie's World.

Possible world representation:

* Creature Lab
* Magic Card Machine
* Creature Factory
* Imagination Lab

Entering it opens the builder.

Leaving it returns directly to the surrounding Abbie's World experience.

Generation jobs continue after leaving.

---

## 6. Main Builder Screen

The builder contains three large selections.

### Step 1: PICK A CREATURE

Horizontal visual carousel/grid.

Each option consists primarily of an illustration/icon.

```text
[ ABBIE ] [ DRAGON ] [ ROBOT ] [ BUNNY ] [ CAT ]
```

Tap one. Selected item enlarges/highlights.

---

### Step 2: PICK AN OUTFIT

```text
[ ⚡ RACER ] [ 🚀 SPACE ] [ 🥷 NINJA ] [ 🧙 MAGIC ]
```

The artwork should clearly show the uniform.

The player is selecting a **power identity**, not clothes in a dress-up sense.

---

### Step 3: PICK A BUDDY

```text
[ BAT ] [ CHEETAH ] [ PUPPY ] [ OWL ] [ UNICORN ]
```

The companion should be visually obvious.

---

## 7. Combination Preview

Once all three are selected, show them together before generation.

```text
     🐉
   DRAGON

     +

     ⚡
LIGHTNING RACER

     +

     🦇
    BAT
```

The child does not need to know what the finished creature will look like.

That uncertainty is part of the game.

Show one primary action: **MAKE IT!**

---

## 8. Generation Behavior

When the player presses **MAKE IT**:

The app immediately creates a persistent creation record.

Do not make the player wait on the generation screen.

The new creature enters the **Creation Queue**.

The player can immediately:

* make another creature
* look at existing cards
* leave the minigame
* leave Abbie's World
* close the app

Generation continues server-side.

---

## 9. Concurrency

Support up to **3 active generations simultaneously**.

These should be visually represented as three creation chambers/incubators.

```text
┌─────────┐ ┌─────────┐ ┌─────────┐
│ MAKING  │ │ MAKING  │ │ MAKING  │
│ 🐉⚡🦇 │ │ 🐰🚀🐆 │ │ 🤖🥷🦉 │
└─────────┘ └─────────┘ └─────────┘
```

Additional requests may sit in a waiting queue.

Do **not** simply disable creation after three requests.

Instead: 3 generating + additional recipes waiting.

The child should never have to understand concurrency.

---

## 10. Persistent Queue

Jobs are owned by the server.

The app is merely displaying their status.

Possible states:

```text
queued → generating → assembling → ready → revealed → failed
```

Closing the application must not cancel generation.

Returning later should restore all jobs.

---

## 11. Creation Screen

There should be a persistent **Making** area.

It shows every creature currently being created.

For each unfinished creature, show the ingredient icons rather than an empty spinner.

```text
Dragon + Racer + Bat

✨ MAKING...
```

The visual can animate lightly: bubbling, glowing, shaking, sparks, magical smoke.

This makes waiting feel like creation rather than network latency.

Do not expose percentages unless they're real.

---

## 12. Completed Generation

When generation finishes, the card should not necessarily immediately reveal itself.

State becomes: **READY!**

The creation chamber can glow/shake.

The player taps it.

---

## 13. Card Reveal

The reveal is one of the major rewards of the game.

Sequence:

1. Card appears face-down.
2. Short anticipation animation.
3. Tap or swipe.
4. Card flips.
5. Creature artwork appears.
6. Name appears.
7. Tiny celebratory effect.
8. Buddy reacts if animation is eventually supported.

Example:

**NIGHTBOLT DRAGON**

*Lightning Racer*

*"Fast, fearless, and happiest after dark."*

No lengthy text. The image should carry most of the reward.

---

## 14. AI-Generated Identity

Before image generation, the server should derive a small structured creature concept.

Example:

```json
{
  "name": "Nightbolt Dragon",
  "personality": "Mischievous, fearless, and incredibly fast",
  "powerName": "Midnight Lightning",
  "visualConcept": "A powerful dragon in an electric racing uniform with gothic nighttime accents and a tiny bat companion."
}
```

This structured intermediate object becomes input to image generation.

This step allows `Dragon + Lightning Racer + Bat` to become a coherent concept rather than a literal collage.

---

## 15. Card Contents

Every card contains:

* generated creature name
* generated illustration
* Creature identity
* Outfit identity
* Buddy identity
* one short generated personality sentence
* optional power name

Example:

```text
NIGHTBOLT DRAGON

Lightning Racer

Buddy: Bat

Power: Midnight Lightning

Mischievous, fearless,
and happiest after dark.
```

All text is rendered deterministically by the app/server compositor.

The image generator should not generate the card typography.

---

## 16. Card Visual Layout

Cards share one canonical visual system.

The generated artwork changes. The card itself does not.

The layout owns:

* border
* title placement
* ingredient icons
* text placement
* visual masks
* dimensions
* fonts
* background framing
* collectible-card treatment

This means 100 generated cards should unmistakably look like one collection.

---

## 17. Collection

The game contains a **My Cards** screen.

This is the player's deck/collection.

Grid view:

```text
[CARD] [CARD] [CARD]
[CARD] [CARD] [CARD]
[CARD] [CARD] [CARD]
```

Tap a card to enlarge it.

There is no requirement that cards be used for battle.

Owning the collection is itself the reward.

---

## 18. Card Detail

Tapping a card opens:

* full-size card
* Creature
* Outfit
* Buddy
* generated name
* personality
* power
* creation date

Primary interactions:

* Back
* Favorite
* Make Another Like This

Optional later: regenerate artwork, add decoration, print, share with parent, animate.

---

## 19. Favorites

Cards can be marked: ❤️ Favorite

Favorites can be filtered in the collection.

This gives the child lightweight authorship over which AI outputs she considers successful.

---

## 20. Duplicate Recipes

Duplicates are allowed.

If the player creates `Dragon + Lightning Racer + Bat` twice, generate another interpretation.

This is desirable. The game should communicate: "Let's see what we get this time."

The generative variability is part of the toy.

Do not enforce recipe uniqueness.

---

## 21. Failed Generations

Failures should not look technical.

Never display: `HTTP 500`, `generation timeout`, `provider error`

Instead: "Oops! The creature machine got confused."

Offer: **TRY AGAIN**

Retry using the existing recipe.

A failed generation should not consume or delete anything.

---

## 22. Latency Strategy

This game should optimize for: **speed over maximum image quality**

It should have its own server generation configuration.

Configuration controls: image model, image quality, resolution, aspect ratio, generation timeout, retry count, concurrency, prompt version, style version, reference-image behavior.

Do not inherit StoryBoard's highest-quality generation defaults.

This is an interactive game. Latency matters more than print fidelity.

---

## 23. Image Generation Target

The generated image should primarily be: **one strong creature illustration**

Not a fully generated card.

Preferred:

* portrait composition
* clear face
* recognizable creature
* recognizable outfit
* visible buddy
* strong silhouette
* uncluttered background
* child-friendly
* consistent style

Then the card renderer places that illustration in the canonical template.

---

## 24. Persistent Player State

Creature Builder maintains:

```text
collection
favorites
active generation jobs
queued generation jobs
unrevealed completed cards
revealed cards
recipe provenance
```

This state should be tied to the existing Abbie's World player identity.

Do not create another login/account system.

---

## 25. Reentry Behavior

When the player returns to Creature Builder:

If there are newly completed cards, prominently show: **2 CREATURES ARE READY!**

with glowing face-down cards.

The user may reveal them before building anything else.

If generations are active, show them still creating.

The world should feel persistent.

---

## 26. Audio

Each ingredient should have tactile/audio feedback.

Examples:

* Creature selected: "Dragon!"
* Outfit selected: "Lightning Racer!"
* Buddy selected: "Bat!"
* MAKE IT: magical machine sound.
* READY: short chime.
* Reveal: distinctive card-flip + celebration.

Voiceover/text-to-speech is optional, but the UX must work for a player who cannot confidently read.

---

## 27. Content Model

Each selectable ingredient should be a reusable object.

### Creature

```json
{
  "id": "dragon",
  "name": "Dragon",
  "icon": "...",
  "promptDefinition": "...",
  "referenceAssets": []
}
```

### Outfit

```json
{
  "id": "lightning-racer",
  "name": "Lightning Racer",
  "icon": "...",
  "powerConcept": "extreme speed and electrical energy",
  "promptDefinition": "..."
}
```

### Buddy

```json
{
  "id": "bat",
  "name": "Bat",
  "icon": "...",
  "personality": ["spooky", "mischievous", "gothic", "nocturnal"],
  "promptDefinition": "..."
}
```

---

## 28. Server Generation Request

The client sends IDs, not arbitrary prompts:

```json
{
  "creatureId": "dragon",
  "outfitId": "lightning-racer",
  "buddyId": "bat"
}
```

Server resolves the canonical ingredient definitions.

Server creates:

1. semantic creature concept
2. creature name
3. personality
4. power
5. image prompt
6. illustration
7. final card
8. persistent collection entry

This prevents clients from controlling prompt architecture.

---

## 29. Queue API

Game-specific endpoint:

```http
POST /api/games/creature-builder/generations
```

Request:

```json
{
  "creatureId": "dragon",
  "outfitId": "lightning-racer",
  "buddyId": "bat"
}
```

Response:

```json
{
  "generationId": "gen_123",
  "cardId": "card_456",
  "status": "queued"
}
```

Player state endpoint:

```http
GET /api/games/creature-builder/state
```

Response:

```json
{
  "active": [],
  "queued": [],
  "readyToReveal": [],
  "collection": []
}
```

The client can restore itself completely from this response.

---

## 30. Game Screens

The complete MVP needs only five primary views:

1. **Creature Builder** — Choose Creature + Outfit + Buddy.
2. **Creation Queue** — See things being made.
3. **Reveal** — Open completed creatures.
4. **My Cards** — Browse collection.
5. **Card Detail** — View one creation.

That is the entire game.

---

## 31. Navigation

Inside the minigame:

```text
BUILD | MAKING | MY CARDS
```

A newly ready card can show a badge: `MAKING (2!)`

The experience should not require nested navigation.

---

## 32. Initial Content

MVP does not need hundreds of ingredients.

Start with roughly:

```text
8 Creatures × 8 Outfits × 8 Buddies = 512 possible recipes
```

And because repeated recipes can produce different interpretations, effective variety is much larger.

---

## 33. Suggested Initial Creature Set

* Abbie
* Dragon
* Robot
* Bunny
* Cat
* Dinosaur
* Alien
* Monster

---

## 34. Suggested Initial Outfit Set

* Lightning Racer
* Astronaut
* Ninja
* Wizard
* Knight
* Firefighter
* Superhero
* Pirate

Each must communicate a power fantasy, not merely clothing.

---

## 35. Suggested Initial Buddy Set

* Bat
* Cheetah
* Puppy
* Owl
* Unicorn
* Peacock
* Frog
* Fox

Each Buddy needs a very obvious personality archetype.

---

## 36. No Artificial Scarcity

For MVP:

* ingredients are not consumable
* generation does not cost coins
* there are no cooldowns
* cards do not expire
* no loot-box mechanics
* no paid rerolls

The player should be encouraged to experiment freely.

---

## 37. Progression

Formal progression is unnecessary for MVP.

The natural progression is:

```text
empty collection → first card → many combinations → favorites → personal deck
```

Later, Abbie's World could unlock new ingredients through the surrounding world.

---

## 38. Decorations — Future Phase

Later add a fourth optional step: **DECORATION**

Examples: crown, sunglasses, cape, flower, bow, backpack

Unlike Creature / Outfit / Buddy, decorations do not change the creature's fundamental identity.

They are cosmetic modifications.

Conceptual hierarchy:

```text
Creature = identity
Outfit = powers
Buddy = personality
Decoration = personalization
```

Do not add Decorations until the three-part loop is working well.

---

## 39. What Makes the Game Fun

The game depends on five things:

1. **Choice** — The child controls recognizable ingredients.
2. **Anticipation** — She does not know exactly what the combination will produce.
3. **Transformation** — The AI synthesizes the ingredients into something new.
4. **Reveal** — There is a rewarding moment when the creature appears.
5. **Collection** — The creation becomes permanent.

If those five things work, the game works.

It does not require another gameplay mechanic.

---

## 40. MVP Definition of Done

The game is complete enough to test when a child can:

1. enter Creature Builder from Abbie's World
2. choose a Creature
3. choose an Outfit
4. choose a Buddy
5. press MAKE IT
6. immediately begin another creation
7. have up to three images generating simultaneously
8. leave Creature Builder
9. close the application
10. return later
11. see completed creatures waiting
12. reveal a generated card
13. see it permanently added to My Cards
14. favorite it
15. create another combination

And the player should be able to do all of this without typing anything.

---

## 41. Product Test

Hand the iPad to Abbie without explaining the mechanic.

If she can discover:

> "I pick this creature, give it this outfit, and give it this animal, and then it makes my card!"

then the core interaction succeeds.

If she spends most of her time trying combinations and saying:

> "What happens if I do THIS?"

then the game succeeds.

That curiosity loop is the game.
