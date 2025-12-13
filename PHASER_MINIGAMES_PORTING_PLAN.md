# Phaser Minigames Porting Plan for Swift iOS

**Date:** December 2025  
**Source:** `/Users/evanrobinson/abbies_world_2023/abbiesworld`  
**Target:** Swift iOS App (abbies.world.ios)

---

## Executive Summary

**Total Games Available:** 15  
**Functional Games:** 10  
**Non-Functional (Need Fixes):** 5  
**Recommended Porting Order:** Based on complexity and kid appeal

**Current Status:** Waypoint Navigation game is complete. Ready to port additional minigames.

---

## Game Inventory & Status

### ✅ **Fully Functional Games (Ready to Port)**

#### 1. **FindJungle** ✅
- **Type:** Hidden Object Finder
- **Complexity:** Medium
- **Assets:**
  - 4-5 backgrounds (`background1.png` - `background5.png`)
  - 170+ object sprites (`0.png` - `169.png`)
  - UI elements (`ui1.png` - `ui5.png`, `foundImage.png`, `playButton.png`)
  - Magnifier tool (`magnifier.png`)
- **Mechanics:**
  - Timer-based gameplay
  - Random object selection (5 objects to find from 25 available)
  - Hint system with magnifier
  - Score tracking
  - Multiple backgrounds
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐⭐ (High - visual search is engaging)

#### 2. **FindPirates** ✅
- **Type:** Hidden Object Finder
- **Complexity:** Medium
- **Assets:** Similar structure to FindJungle
- **Mechanics:** Same as FindJungle
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐⭐ (High - pirate theme)

#### 3. **FindCarnival** ✅
- **Type:** Hidden Object Finder
- **Complexity:** Medium
- **Assets:** 5 backgrounds + objects
- **Mechanics:** Same pattern as other Find games
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐⭐⭐ (Very High - carnival theme)

#### 4. **FindPrincess** ✅
- **Type:** Hidden Object Finder
- **Complexity:** Medium
- **Assets:** 20 objects to find
- **Mechanics:** Same pattern
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐⭐⭐ (Very High - princess theme)

#### 5. **FindFarm** ✅
- **Type:** Hidden Object Finder
- **Complexity:** Medium
- **Assets:** Similar structure
- **Mechanics:** Same pattern
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐⭐ (High - farm animals)

#### 6. **Tracer3** ✅
- **Type:** Territory Capture / Tracer Game
- **Complexity:** High
- **Assets:**
  - Level backgrounds (4 levels: `1.back.png`, `1.front.png`, etc.)
  - Player sprites (20 variants: `players/1.png` - `20.png`)
  - Goon sprites (7 variants: `goons/goon1.png` - `goon7.png`)
  - Trail sprites (11 variants: `trail/1.png` - `11.png`)
  - Prize images (4 prizes: `prize1.png` - `prize4.png`)
  - UI controls (`ui/up.png`, `down.png`, `left.png`, `right.png`)
  - Starfield background (`starfield.png`)
  - **Audio:** 20+ voice lines and sound effects (`.wav`, `.mp3`)
- **Mechanics:**
  - Area capture by tracing paths
  - Circuit completion logic
  - Perimeter growth
  - Multiple levels
  - Goon enemies
  - Victory conditions
- **Swift Port Complexity:** High (complex geometry calculations)
- **Kid Appeal:** ⭐⭐⭐ (Medium - more complex gameplay)

#### 7. **enchantedforest** ✅
- **Type:** World Map / Navigation Game
- **Complexity:** Medium
- **Assets:**
  - World map (`cupcakeforest.png`)
  - Player sprite (`abbie.png`)
  - Exhaust spritesheet (`exhaust.png` - 9×8 frames)
  - Back button (`back2.png`)
  - Exclamation marker (`exclamation.png`)
- **Mechanics:**
  - Player movement on world map
  - Camera following
  - Navigation between areas
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐ (Medium - exploration)

#### 8. **goonpopper** ✅
- **Type:** Popper Game (Click to Pop)
- **Complexity:** Low-Medium
- **Assets:**
  - 3 backgrounds (`b1.png`, `b2.png`, `b3.png`)
  - 15 goon sprites (`goon1.png` - `goon15.png`)
  - Play button (`play.png`)
  - Red X marker (`redx.png`)
- **Mechanics:**
  - Click goons to pop them
  - Timer-based gameplay
  - Score tracking
  - Random goon movement
- **Swift Port Complexity:** Low-Medium
- **Kid Appeal:** ⭐⭐⭐⭐⭐ (Very High - simple, satisfying)

#### 9. **clippingMask** ✅
- **Type:** Demo/Example
- **Complexity:** Low
- **Assets:** Simple background and prize images
- **Swift Port Complexity:** Low
- **Kid Appeal:** ⭐⭐ (Low - demo only)

#### 10. **scripts/main.js** ✅
- **Type:** Main World Map
- **Complexity:** Medium
- **Assets:**
  - World map (`abbiesworld.png`)
  - Player (`abbie.png`)
  - Characters (`mrfrog.png`, `mrsrabbit.png`)
  - Clouds (4 variants)
  - Exhaust spritesheet
- **Mechanics:** Main navigation hub
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐⭐ (High - main hub)

---

### ❌ **Non-Functional Games (Need Fixes First)**

#### 11. **FindSpace** ❌
- **Status:** Broken (syntax errors)
- **Fixes Needed:**
  1. Add `scene = this;` in preload function
  2. Fix missing semicolon
  3. Fix `self.tweens` context issue
- **After Fix:** Same complexity as other Find games
- **Kid Appeal:** ⭐⭐⭐⭐⭐ (Very High - space theme)

#### 12. **bubblepopper** ❌
- **Status:** Broken (syntax error - stray "me" on line 91)
- **Fix:** Remove line 91
- **After Fix:** Similar to goonpopper
- **Kid Appeal:** ⭐⭐⭐⭐ (High)

#### 13. **Tracer2** ❌
- **Status:** Broken (module import issues)
- **Fixes Needed:**
  - Add `type="module"` to HTML script tags
  - Add import statements to `game.js`
  - Fix duplicate `</script>` tag
- **After Fix:** Similar complexity to Tracer3
- **Kid Appeal:** ⭐⭐⭐ (Medium)

#### 14. **MyTracerGame** ❌
- **Status:** Broken (module import issues)
- **Fixes Needed:** Add import statements
- **After Fix:** Similar to Tracer3
- **Kid Appeal:** ⭐⭐⭐ (Medium)

#### 15. **puzzle** ⚠️
- **Status:** Partially Functional (runtime errors)
- **Fixes Needed:**
  - Add `let initialPiecePosition;`
  - Add `let pointerOffset;`
- **Assets:**
  - Background (`Background.png`)
  - 4 puzzle images (`puzzle1.png` - `puzzle4.png`)
- **Mechanics:**
  - Drag-and-drop puzzle pieces
  - 4×4 grid (16 pieces)
  - Random puzzle selection
- **After Fix:** Medium complexity
- **Swift Port Complexity:** Medium
- **Kid Appeal:** ⭐⭐⭐⭐ (High - puzzle solving)

---

## Asset Organization Analysis

### Common Asset Patterns

#### 1. **Find Games Pattern** (FindJungle, FindPirates, FindCarnival, FindPrincess, FindFarm, FindSpace)
```
assets/
  images/
    backgrounds/
      background1.png
      background2.png
      ...
    objects/
      0.png
      1.png
      ... (numbered sequentially)
    ui/
      ui1.png
      ui2.png
      ...
      foundImage.png
      playButton.png
    magnifier.png
```

#### 2. **Popper Games Pattern** (goonpopper, bubblepopper)
```
assets/
  images/
    b1.png, b2.png, b3.png (backgrounds)
    goon1.png, goon2.png, ... (enemy sprites)
    play.png (play button)
```

#### 3. **Tracer Games Pattern** (Tracer3, Tracer2, MyTracerGame)
```
assets/
  images/
    levels/
      1.back.png, 1.front.png
      2.back.png, 2.front.png
      ...
    players/
      1.png, 2.png, ... (player variants)
    goons/
      goon1.png, goon2.png, ...
    trail/
      1.png, 2.png, ... (trail sprites)
    prize1.png, prize2.png, ...
    ui/
      up.png, down.png, left.png, right.png
  sounds/
    *.wav, *.mp3 (voice lines and effects)
```

#### 4. **Puzzle Game Pattern**
```
images/
  Background.png
  puzzle1.png, puzzle2.png, puzzle3.png, puzzle4.png
```

#### 5. **World Map Pattern** (enchantedforest, scripts/main.js)
```
assets/
  images/
    worldmap.png (or cupcakeforest.png)
    abbie.png (player)
    mrfrog.png, mrsrabbit.png (characters)
    cloud1.png, cloud2.png, ... (decorative)
    exhaust.png (spritesheet)
```

---

## Recommended Porting Strategy

### Phase 1: Quick Wins (Low-Medium Complexity, High Kid Appeal)

**Priority Order:**
1. **goonpopper** ⭐⭐⭐⭐⭐
   - Simple mechanics
   - High kid appeal
   - Good for testing porting patterns
   - **Estimated Time:** 4-6 hours

2. **FindPrincess** ⭐⭐⭐⭐⭐
   - High kid appeal
   - Reusable pattern for other Find games
   - **Estimated Time:** 6-8 hours

3. **FindCarnival** ⭐⭐⭐⭐⭐
   - High kid appeal
   - Can reuse FindPrincess pattern
   - **Estimated Time:** 4-6 hours (after FindPrincess)

### Phase 2: Medium Complexity Games

4. **FindJungle** ⭐⭐⭐⭐
   - More objects than FindPrincess
   - Reuses FindPrincess pattern
   - **Estimated Time:** 4-6 hours

5. **FindFarm** ⭐⭐⭐⭐
   - Same pattern
   - **Estimated Time:** 4-6 hours

6. **FindPirates** ⭐⭐⭐⭐
   - Same pattern
   - **Estimated Time:** 4-6 hours

7. **puzzle** ⭐⭐⭐⭐ (after fixing)
   - Different mechanics (drag-and-drop)
   - Good variety
   - **Estimated Time:** 6-8 hours

### Phase 3: Complex Games

8. **Tracer3** ⭐⭐⭐
   - Complex geometry calculations
   - Multiple levels
   - Audio integration
   - **Estimated Time:** 12-16 hours

9. **enchantedforest** ⭐⭐⭐
   - World navigation
   - Camera system
   - **Estimated Time:** 8-10 hours

10. **FindSpace** ⭐⭐⭐⭐⭐ (after fixing)
    - Fix Phaser version first
    - Then port
    - **Estimated Time:** 4-6 hours

### Phase 4: Lower Priority

11. **bubblepopper** (after fixing)
12. **Tracer2** (after fixing)
13. **MyTracerGame** (after fixing)
14. **clippingMask** (demo only)
15. **scripts/main.js** (main world map - may integrate differently)

---

## Swift Porting Architecture Recommendations

### ⚠️ **CRITICAL: Standalone App Pattern**

**Each minigame MUST follow the standalone app pattern** (see `STANDALONE_MINIGAME_PATTERN.md` for details).

**Key Requirements:**
- ✅ Self-contained view with `@StateObject` ViewModel
- ✅ Optional callbacks (`onDismiss`, `onComplete`) for integration
- ✅ Works perfectly without callbacks (standalone mode)
- ✅ Own asset loading and state management
- ✅ Standalone app entry point file (`{GameName}StandaloneApp.swift`)

**Example Structure:**
```
{GameName}StandaloneApp.swift       // Standalone entry point
Views/Minigames/{GameName}/
  {GameName}View.swift              // Main view (self-contained)
  {GameName}Canvas.swift            // Rendering (if needed)
ViewModels/
  {GameName}ViewModel.swift         // Game-specific view model
Models/
  {GameName}Models.swift           // Game-specific models
Services/
  {GameName}AudioService.swift     // Game-specific audio (if needed)
```

**Why This Matters:**
- Each game can be tested independently
- Games don't depend on each other
- Easy to debug and maintain
- Can be extracted to separate apps if needed

### 1. **Shared Components**

Create reusable Swift components:

```swift
// Base game protocol
protocol MinigameProtocol {
    func loadAssets() async
    func startGame()
    func pauseGame()
    func resetGame()
    func cleanup()
}

// Base view model
class BaseMinigameViewModel: ObservableObject {
    @Published var gameState: GameState
    @Published var score: Int = 0
    @Published var timer: TimeInterval = 0
    
    let audioService: AudioService
    let assetService: AssetService
}

// Asset loading service
class MinigameAssetService {
    func loadFindGameAssets(gameName: String) async -> FindGameAssets
    func loadTracerGameAssets() async -> TracerGameAssets
    func loadPopperGameAssets() async -> PopperGameAssets
}
```

### 2. **Game-Specific Structure**

**Follow the standalone pattern for each game:**

```
Views/
  Minigames/
    FindPrincess/
      FindPrincessView.swift          // Self-contained
      FindPrincessCanvas.swift        // SpriteKit rendering
    FindCarnival/
      FindCarnivalView.swift
      FindCarnivalCanvas.swift
    GoonPopper/
      GoonPopperView.swift
      GoonPopperCanvas.swift
    Tracer3/
      Tracer3View.swift
      Tracer3Canvas.swift
    Puzzle/
      PuzzleView.swift
      PuzzleCanvas.swift
    EnchantedForest/
      EnchantedForestView.swift
      EnchantedForestCanvas.swift

ViewModels/
  FindPrincessViewModel.swift
  FindCarnivalViewModel.swift
  GoonPopperViewModel.swift
  Tracer3ViewModel.swift
  PuzzleViewModel.swift
  EnchantedForestViewModel.swift

Models/
  FindPrincessModels.swift
  FindCarnivalModels.swift
  GoonPopperModels.swift
  Tracer3Models.swift
  PuzzleModels.swift
  EnchantedForestModels.swift

Services/
  FindPrincessAudioService.swift (if needed)
  Tracer3AudioService.swift (if needed)
  // etc.

// Standalone app entry points
FindPrincessStandaloneApp.swift
FindCarnivalStandaloneApp.swift
GoonPopperStandaloneApp.swift
Tracer3StandaloneApp.swift
PuzzleStandaloneApp.swift
EnchantedForestStandaloneApp.swift
```

**Each game is completely independent and can run standalone!**

### 3. **Asset Organization on Server**

Mirror the Phaser structure:
```
/static/assets/minigames/
  find_princess/
    backgrounds/
    objects/
    ui/
  find_carnival/
    backgrounds/
    objects/
    ui/
  goonpopper/
    images/
  tracer3/
    images/
      levels/
      players/
      goons/
      trail/
      ui/
    sounds/
  puzzle/
    images/
```

---

## Technical Considerations

### 1. **Find Games Porting**

**Key Components:**
- SpriteKit for rendering
- Touch detection for object finding
- Timer system (already have pattern from Waypoint game)
- Hint system (magnifier overlay)
- Score tracking

**Reusable Pattern:**
```swift
class FindGameViewModel: BaseMinigameViewModel {
    var backgrounds: [UIImage] = []
    var objects: [FindObject] = []
    var objectsToFind: [FindObject] = []
    var foundObjects: Set<Int> = []
    
    func handleObjectTap(at point: CGPoint) {
        // Check if tapped object is in objectsToFind
        // Mark as found
        // Update score
    }
}
```

### 2. **Popper Games Porting**

**Key Components:**
- SpriteKit physics for goon movement
- Touch detection for popping
- Timer system
- Score tracking

**Simpler than Find games:**
```swift
class PopperGameViewModel: BaseMinigameViewModel {
    var goons: [GoonSprite] = []
    var background: UIImage?
    
    func handleTap(at point: CGPoint) {
        // Find goon at point
        // Animate pop
        // Remove goon
        // Update score
    }
}
```

### 3. **Tracer Games Porting**

**Key Components:**
- Complex geometry calculations (CGPath, CGPoint)
- Path tracing with touch
- Circuit detection
- Area calculation
- Multiple levels

**Most Complex:**
- Need to port geometry utilities from JavaScript
- Path intersection detection
- Area calculation algorithms
- Perimeter reshaping logic

### 4. **Puzzle Games Porting**

**Key Components:**
- Drag-and-drop with SpriteKit
- Grid snapping
- Piece validation
- Completion detection

**Medium Complexity:**
```swift
class PuzzleGameViewModel: BaseMinigameViewModel {
    var puzzlePieces: [PuzzlePiece] = []
    var grid: GridLayout
    
    func handleDrag(piece: PuzzlePiece, to position: CGPoint) {
        // Snap to grid
        // Validate position
        // Check completion
    }
}
```

---

## Asset Migration Checklist

### For Each Game:

- [ ] **Create standalone app structure**
  - [ ] Create `{GameName}StandaloneApp.swift` (copy from Waypoint pattern)
  - [ ] Create `{GameName}View.swift` with optional callbacks
  - [ ] Create `{GameName}ViewModel.swift` (self-contained)
  - [ ] Create `{GameName}Models.swift`
  - [ ] Create `{GameName}AudioService.swift` (if needed)
  
- [ ] **Identify all assets**
  - [ ] Background images
  - [ ] Sprite images
  - [ ] UI elements
  - [ ] Audio files (if any)
  
- [ ] **Organize assets**
  - [ ] Create server directory structure
  - [ ] Upload assets to server
  - [ ] Verify asset URLs
  
- [ ] **Update asset references**
  - [ ] Update Swift code to use server URLs
  - [ ] Use ImageCache service (already exists)
  - [ ] Handle asset loading errors gracefully
  
- [ ] **Test standalone**
  - [ ] Uncomment `@main` in standalone app
  - [ ] Comment `@main` in main app
  - [ ] Test game runs independently
  
- [ ] **Test integration**
  - [ ] Add to MainView with `fullScreenCover`
  - [ ] Test with callbacks
  - [ ] Verify works in main app context

### Asset Naming Conventions

**Current Phaser:** `assets/images/objects/0.png`  
**Swift Server:** `/static/assets/minigames/find_princess/objects/0.png`

**Pattern:**
- Use snake_case for game names: `find_princess`, `goonpopper`, `tracer3`
- Keep original asset names
- Organize by type: `backgrounds/`, `objects/`, `ui/`, `sounds/`

---

## Implementation Priority Matrix

| Game | Kid Appeal | Complexity | Port Time | Priority |
|------|-----------|-----------|-----------|----------|
| goonpopper | ⭐⭐⭐⭐⭐ | Low-Med | 4-6h | **HIGH** |
| FindPrincess | ⭐⭐⭐⭐⭐ | Medium | 6-8h | **HIGH** |
| FindCarnival | ⭐⭐⭐⭐⭐ | Medium | 4-6h | **HIGH** |
| FindJungle | ⭐⭐⭐⭐ | Medium | 4-6h | Medium |
| FindFarm | ⭐⭐⭐⭐ | Medium | 4-6h | Medium |
| FindPirates | ⭐⭐⭐⭐ | Medium | 4-6h | Medium |
| puzzle | ⭐⭐⭐⭐ | Medium | 6-8h | Medium |
| FindSpace | ⭐⭐⭐⭐⭐ | Medium | 4-6h | Medium* |
| enchantedforest | ⭐⭐⭐ | Medium | 8-10h | Low |
| Tracer3 | ⭐⭐⭐ | High | 12-16h | Low |

*After fixing Phaser version

---

## Next Steps

### Immediate Actions:

1. **Choose First Game to Port**
   - Recommended: **goonpopper** (simplest, high appeal)
   - Or: **FindPrincess** (establishes Find game pattern)

2. **Set Up Asset Structure**
   - Create server directories
   - Upload assets for chosen game
   - Test asset loading

3. **Create Base Components**
   - `BaseMinigameViewModel`
   - `MinigameAssetService`
   - Shared timer/score components

4. **Port First Game**
   - Follow Waypoint game pattern
   - Use SpriteKit for rendering
   - Implement game mechanics
   - Test on device

### Long-term:

5. **Port Remaining Games** (following priority order)
6. **Fix Broken Games** (if needed)
7. **Create Game Selection UI** (carousel/menu)
8. **Add Progress Tracking** (scores, completion)
9. **Add Achievements** (optional)

---

## Questions to Consider

1. **Game Selection UI:** How should kids navigate between games?
   - Carousel (like current ingredient selection)?
   - Grid view?
   - World map (like enchantedforest)?

2. **Progress Tracking:** Should games track:
   - High scores?
   - Completion status?
   - Time records?

3. **Unlocking System:** Should games unlock progressively?
   - Or all available from start?

4. **Audio:** For games with voice lines (Tracer3):
   - Include all audio?
   - Or simplify for iOS?

---

**Ready to start porting!** Recommend beginning with **goonpopper** or **FindPrincess** to establish patterns for the rest.

