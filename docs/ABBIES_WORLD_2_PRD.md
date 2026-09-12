# ABBIE'S WORLD 2 — PRODUCT REQUIREMENTS DOCUMENT

## 1. PRODUCT VISION

Abbie's World 2 is a child-directed exploration and creation game for iPad built around a simple loop:

**EXPLORE → PLAY → EARN → CREATE → COLLECT → PERSONALIZE**

The world is made of illustrated overland maps containing interactive points of interest, or POIs.

Some POIs are:
- personal spaces
- creation spaces
- collection spaces
- minigames

The player earns:
- **Gems** — spendable currency
- **Ingredients** — creative components used to generate cards
- **Cards** — persistent player-created collectibles
- **Decorations** — objects that can be placed in the player's home

The game should feel visually rich without requiring a traditional animation-heavy production pipeline.

Most content can be:
- static 2D art
- layered assets
- lightweight effects
- transitions
- dynamic generation

The app itself should be a lightweight game shell that downloads a manifest-driven content pack from the server.

**The app owns:**
- navigation
- interaction
- economy
- card creation
- home decoration
- music playback
- minigame hosting

**The content pack owns:**
- world backgrounds
- POI art
- interiors
- music
- SFX
- iconography
- decorations
- ingredient art
- card presentation assets
- minigame-specific media


## 2. CORE GAMEPLAY LOOP

The player starts on an overland map.

From there, they can:

### A. NAVIGATE
- Move between adjacent maps or zones
- Pan or otherwise explore the current map

### B. INSPECT A POI
- Tap an interactive location
- See its identity
- See its purpose
- See possible rewards
- See entry cost if any

### C. ENTER A POI
- Open its interior screen or minigame
- POI music overrides current map music

### D. PLAY
- Complete some interaction
- This can be:
  - puzzle
  - trivia
  - reaction game
  - matching game
  - riddle
  - sequence
  - escape-room chain
  - video interaction
  - another simple game mechanic

### E. RECEIVE REWARDS
Rewards may include:
- Gems
- Ingredients
- Cards
- Decorations
- Combinations of the above

### F. CREATE CARDS
The player:
- spends 1 gem
- supplies 3 ingredient categories:
  - Creature
  - Function / Costume / Power
  - Context / Place
- generates a card
- accepts or rejects the result

### G. MANAGE COLLECTION
- Every accepted card remains permanently available
- Player selects up to 5 cards for active deck

### H. CUSTOMIZE HOME
- Place earned decorations
- Some decorations may be interactive
- Every player begins with a jukebox


## 3. V1 WORLD STRUCTURE

### HOME WORLD

Contains:
- Abbie's Treehouse
- Ani's Treehouse
- Card Factory

The Home World overland map is a base background with empty placement pads.

POIs are composited independently over those pads.

Current Home World layout:
- 3 empty placement pads
- one for Abbie's Treehouse
- one for Ani's Treehouse
- one for Card Factory

The Home World should feel:
- green
- cozy
- cultivated
- safe
- magical
- playful


### ADVENTURE / FARMING WORLD

Contains four reward POIs:
- Creature Ingredient POI
- Function / Costume Ingredient POI
- Context Ingredient POI
- Gem / Currency POI

The Adventure World should feel:
- rugged
- rustic
- orange / ochre
- rocky
- frontier-like
- still playful and child-friendly

Its overland map should contain:
- exactly 4 empty placement pads
- no baked-in POI structures
- large chunky readable map features


## 4. POI CONTRACT

Every POI should be described by a common configuration object.

Each POI may define:
- id
- name
- mapId
- exteriorAsset
- placementCoordinates
- interiorAsset
- tapHitbox
- lore
- description
- entryCost
- rewardConfiguration
- minigameType
- lightMusicTrack
- intenseMusicTrack
- icon
- embellishmentSlots
- interactiveDecorationHooks

A POI does not need to be a literal building.

A POI can be:
- cave
- portal
- tree
- observatory
- magical machine
- crystal formation
- arena
- laboratory
- pavilion
- workshop
- other readable interactive landmark


## 5. MUSIC MODEL

Each map and each POI has 2 tracks:

### LIGHT / INTRO
Used when:
- entering location
- browsing
- exploring
- reading
- waiting

### INTENSE
Used when:
- minigame begins
- challenge escalates
- active gameplay starts
- reward sequence ramps up

The two tracks for the same location should share:
- recognizable melodic motif
- instrumentation family
- thematic identity

Runtime behavior:

```
MAP LIGHT
→ POI LIGHT
→ POI INTENSE
→ POI LIGHT
→ MAP LIGHT
```

Music should transition with smooth fades.

V1 music requirements:

- 2 maps × 2 tracks = 4 tracks
- 8 POIs × 2 tracks = 16 tracks
- **TOTAL = 20 tracks**

Suggested music pair model:
| Location | Light | Intense |
|----------|-------|---------|
| Home World | warm whimsical | energetic magical adventure |
| Adventure World | rustic exploratory | driving rugged action |
| Abbie Treehouse | pink sparkly magical | exuberant energetic magic |
| Ani Treehouse | purple dreamy mystical | playful kinetic mystical |
| Card Factory | inventive mechanical | high-energy creation sequence |
| Card Vault | curious archive | treasure-search excitement |
| Creature POI | wild curiosity | playful chase |
| Function POI | transformation workshop | power-up energy |
| Context POI | wonder and portals | dimensional travel |
| Gem POI | treasure anticipation | jackpot collection |


## 6. ASSET BOOTSTRAP ARCHITECTURE

Asset bootstrap should be treated as a first-class system.

The app should not assume all content ships inside the binary.

At launch:

1. App loads bundled bootstrap configuration
2. App contacts Abbie's World server
3. App downloads latest asset manifest
4. App compares manifest with local cached asset versions
5. App downloads missing or updated required assets
6. App stores assets locally
7. Game launches when required core assets are ready
8. Optional assets may continue downloading in background

The game should continue working offline using the most recent cached asset pack.


## 7. ASSET MANIFEST

The server should expose a manifest describing all content.

Suggested fields per asset:

- assetId
- type
- url
- version
- hash
- dimensions
- transparencyRequirement
- required
- optional
- usage
- mapId
- poiId
- tags
- metadata

Example asset categories:

- maps
- POI exteriors
- POI interiors
- logos
- backgrounds
- decorations
- ingredient art
- card frames
- card backs
- HUD icons
- game icons
- reward icons
- VFX
- SFX
- music
- minigame assets


## 8. ASSET CLASSES

### A. WORLD ASSETS
High-impact.

Current:
- Title Screen Background
- Abbie's World Logo Badge
- Home World Overland Map
- Adventure / Farming Overland Map

### B. POI ASSETS
High-impact.

Each POI usually needs:
- exterior
- interior

Current POIs:
- Abbie Treehouse
- Ani Treehouse
- Card Factory
- Card Vault
- Creature Ingredient POI
- Function / Costume Ingredient POI
- Context Ingredient POI
- Gem / Currency POI

### C. GAMEPLAY ICONOGRAPHY
Still needed.

Examples:
- gem icon
- creature ingredient icon
- function ingredient icon
- context ingredient icon
- card icon
- deck icon
- vault icon
- home icon
- decoration icon
- music icon
- play icon
- locked icon
- reward icon
- success icon
- retry icon
- map transition icon

### D. INGREDIENT VISUALS

Creature ingredients:
- cat, cheetah, bat, dragon, octopus, robot, others

Function ingredients:
- astronaut, wizard, superhero, chef, laser eyes, racer, others

Context ingredients:
- outer space, underwater, jungle, volcano, castle, candy world, others

### E. CARD SYSTEM ASSETS

Need:
- card frame
- card back
- rarity/performance decoration system
- category indicators
- generation/reveal effect
- loading state
- keep/reject state

### F. HOME DECORATION ASSETS

Need:
- starter jukebox
- furniture, posters, plants, trophies, toys, lamps
- magical objects
- seasonal objects

### G. VFX / INTERACTION ASSETS

Can be lightweight and code-driven:
- glow, pulse, sparkle
- tap feedback
- reward burst
- card reveal
- success, failure
- map transition
- POI selection state

### H. AUDIO / SFX

Still needed:
- button press
- POI open
- gem pickup
- ingredient pickup
- card reveal
- reward success
- error
- retry
- decoration placement
- jukebox interaction
- map transition
- minigame start
- minigame complete


## 9. VISUAL PRODUCTION RULES

Every generated image should be treated as a game asset, not merely as an illustration.

Prompts should consider:
- compositing
- transparent backgrounds where needed
- readable silhouettes
- large shapes
- simplified detail
- small-screen readability
- empty embellishment areas
- UI overlay areas
- state overlays
- future unlocks
- animation hooks

Visual direction:
- chunky
- cute
- cel-shaded or illustrated
- exaggerated
- simplified
- playful
- magical
- designed for a smart six-year-old
- sophisticated rather than babyish
- **explicitly not chibi**

Important game-asset rule:

A visually complete asset may still need to remain intentionally incomplete in decoration.

Examples:
- empty shelves
- open floor areas
- bare wall sections
- hooks, ledges, empty pedestals
- banner mounts, portal frames, display niches


## 10. CARD FACTORY SYSTEM

Inputs:
- 1 Gem
- 1 Creature ingredient
- 1 Function ingredient
- 1 Context ingredient

Flow:

1. Player enters Card Factory
2. Player selects 3 ingredients
3. Game builds structured generation payload
4. Client sends request to server
5. Server generates card image
6. Client shows creation/reveal sequence
7. Player chooses: Keep or Reject

If kept:
- card is added to collection
- optionally added to active deck


## 11. CARD DATA MODEL

Persist metadata independently from image.

Suggested fields:

- cardId
- playerId
- creatureIngredient
- functionIngredient
- contextIngredient
- prompt
- generatedImageUrl
- createdAt
- accepted
- activeDeck
- rarity
- score
- generationStatus

The game should not depend on image availability for card identity.


## 12. CARD VAULT

The Card Vault is the collection manager.

Player can:
- view every accepted card
- inspect card details
- choose active deck
- remove cards from active deck
- add cards to active deck

Constraint:
- active deck maximum = 5

The Vault should continue functioning even if some generated images are still loading.


## 13. PLAYER HOMES

Each player owns one home.

V1:
- Abbie Treehouse
- Ani Treehouse

Rules:
- owner can decorate
- visitors can view
- visitors cannot modify

Each home is:
- base interior asset
- decoration layer
- interactive decoration layer
- optional music state

Decoration instance data:
- assetId
- x, y
- scale
- rotation
- zIndex
- interactive
- state


## 14. JUKEBOX

Every player starts with a jukebox.

The jukebox:
- controls music in the home
- can eventually unlock tracks
- can expose music earned elsewhere
- may become a collectible progression surface

Home music can override map music while inside the home.


## 15. MINIGAME SYSTEM

The host game should expose a lightweight minigame contract.

A minigame receives:
- playerState
- poiId
- difficulty
- rewardConfiguration
- lightMusicTrack
- intenseMusicTrack
- asset references
- optional seed

A minigame returns:
- completed
- score
- performanceTier
- rewards
- optionalUnlocks
- optionalStateChanges


## 16. REWARD MODEL

POIs can reward:
- Gems
- Creature ingredients
- Function ingredients
- Context ingredients
- Cards
- Decorations
- Unlocks

Rewards may vary based on:
- completion
- score
- performance tier
- difficulty
- randomness


## 17. HUD

Persistent top HUD should show:
- Gems
- Ingredient counts
- Active deck count / 5
- Player identity/avatar

Tap or expand should open a larger drawer containing:
- full inventory
- active deck
- ingredient categories
- decorations
- music / jukebox control
- settings


## 18. PLAYER STATE

Suggested player state:

- playerId
- name
- gems
- creatureIngredients[]
- functionIngredients[]
- contextIngredients[]
- cards[]
- activeDeck[]
- decorations[]
- homeLayout
- unlockedMusic[]
- progression
- settings


## 19. SERVER RESPONSIBILITIES

Server should handle:
- asset manifest
- asset hosting
- generation requests
- card image generation
- persistence if desired
- generation queue
- generation status
- retrieval of generated assets
- optional player-state sync
- future content updates


## 20. ASSET BOOTSTRAP MVP

Before deep gameplay implementation, build the content bootstrap layer.

Minimum:

1. Fetch manifest
2. Parse asset list
3. Download required files
4. Cache locally
5. Verify hashes/versions
6. Expose lookup methods
7. Handle missing assets gracefully
8. Show download state during first launch
9. Support offline fallback

Example lookup interface:

```swift
asset("map.home")
asset("map.adventure")
asset("poi.abbieHome.exterior")
asset("poi.abbieHome.interior")
asset("poi.cardFactory.exterior")
asset("poi.cardFactory.interior")
asset("ui.gem")
music("home.light")
music("home.intense")
```


## 21. BOOTSTRAP UX

First launch:
- show title screen or lightweight loading screen
- fetch manifest
- download required P0 assets
- show progress
- launch once critical assets are ready

Optional assets:
- may download in background
- should not block gameplay

Missing asset fallback:
- placeholder
- retry
- continue where safe


## 22. SUGGESTED IMPLEMENTATION ORDER

### PHASE 1 — CONTENT BOOTSTRAP
- manifest format
- downloader
- cache
- versioning
- asset lookup
- offline support

### PHASE 2 — WORLD SHELL
- title screen
- Home World map
- POI placement
- POI tapping
- interior screen
- music switching

### PHASE 3 — HUD + PLAYER STATE
- gems
- ingredient counts
- deck count
- player state persistence

### PHASE 4 — HOMES
- player homes
- interior display
- decoration placement
- jukebox

### PHASE 5 — CARD FACTORY
- ingredient selection
- server generation request
- queue/polling
- reveal
- keep/reject

### PHASE 6 — CARD VAULT
- collection browser
- active deck manager
- max 5 cards

### PHASE 7 — ADVENTURE WORLD
- second map
- 4 POIs
- minigame loader
- reward handling

### PHASE 8 — MUSIC + SFX
- 20 location tracks
- transitions
- pickup sounds
- UI sounds
- reward sounds

### PHASE 9 — ICONOGRAPHY
- gem, ingredient categories
- card, deck, home, vault
- decoration, jukebox
- lock, retry, success
- transitions

### PHASE 10 — POLISH
- VFX, transitions
- loading states
- missing asset handling
- additional decorations
- additional ingredients
- balancing


## 23. V1 SUCCESS CRITERION

A six-year-old should be able to:

```
open the game
→ see the title screen
→ enter Home World
→ see Abbie Treehouse, Ani Treehouse and Card Factory
→ navigate to Adventure World
→ enter a POI
→ play a minigame
→ earn an ingredient
→ earn a gem
→ return to Card Factory
→ select Creature + Function + Context
→ spend 1 gem
→ generate a creature card
→ keep the card
→ view it in the Card Vault
→ place it in the active five-card deck
→ visit their treehouse
→ place a decoration
→ use the jukebox
→ hear the correct light/intense music transitions
```

If that works and feels delightful, V1 is real.


## 24. CURRENT CONTENT STATUS

### Already selected or in progress:
- Title Screen Background
- Abbie's World Logo Badge
- Home World Overland Map
- Abbie Treehouse Exterior
- Abbie Treehouse Interior
- Ani Treehouse Exterior
- Ani Treehouse Interior
- Card Factory Exterior
- Card Factory Interior

### Still needed:
- Adventure World Overland Map
- Card Vault Exterior / Interior
- Creature POI Exterior / Interior
- Function / Costume POI Exterior / Interior
- Context POI Exterior / Interior
- Gem POI Exterior / Interior
- iconography
- card frame / card back
- decorations
- ingredient icon system
- SFX
- 20 music tracks
- runtime VFX
- bootstrap manifest

The remaining work is now primarily:
- **CONTENT COMPLETION**
- **ASSET BOOTSTRAP**
- **GAMEPLAY IMPLEMENTATION GLUE**
- **MUSIC / ICONOGRAPHY / SFX** (noted for later)
