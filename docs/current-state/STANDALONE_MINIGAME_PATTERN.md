# Standalone Minigame Pattern

**Based on:** Waypoint Navigation Game  
**Purpose:** Each minigame should be able to function as a standalone app OR be integrated into the main app

---

## Architecture Pattern

### Key Principle: **Self-Contained Independence**

Each minigame should be completely self-contained and not depend on the main app structure. It should work both:
1. **Standalone:** As its own app (for testing/debugging)
2. **Integrated:** As part of the main app (via fullScreenCover/sheet)

---

## File Structure Pattern

```
Views/
  Minigames/
    {GameName}/
      {GameName}View.swift          // Main game view (self-contained)
      {GameName}Canvas.swift        // SpriteKit/rendering (if needed)
      {GameName}VictoryView.swift    // Victory sequence (if needed)
ViewModels/
  {GameName}ViewModel.swift          // Game-specific view model
Models/
  {GameName}Models.swift            // Game-specific models
Services/
  {GameName}AudioService.swift      // Game-specific audio (if needed)
{GameName}StandaloneApp.swift       // Standalone entry point
```

---

## Component Breakdown

### 1. **Standalone App Entry Point**

**File:** `{GameName}StandaloneApp.swift`

```swift
//
//  {GameName}StandaloneApp.swift
//  abbies.world.ios
//
//  Standalone entry point for {Game Name} Minigame
//  This allows the game to run independently without the main app
//
//  NOTE: To run as standalone app:
//  1. Temporarily comment out @main in abbies_world_iosApp.swift
//  2. Uncomment @main below
//  3. Or create a separate Xcode target for the standalone game
//

import SwiftUI

// Uncomment the @main attribute below to run as standalone app
// (and comment out @main in abbies_world_iosApp.swift)
// @main
struct {GameName}StandaloneApp: App {
    var body: some Scene {
        WindowGroup {
            {GameName}View()
                .ignoresSafeArea()
        }
    }
}
```

**Key Points:**
- Simple App struct that wraps the main game view
- `@main` is commented out by default
- Can be easily enabled for standalone testing
- Uses `.ignoresSafeArea()` for full-screen gameplay

---

### 2. **Main Game View**

**File:** `Views/Minigames/{GameName}/{GameName}View.swift`

```swift
import SwiftUI

struct {GameName}View: View {
    @StateObject private var viewModel = {GameName}ViewModel()
    
    // Optional callbacks for integration (work without them)
    var onDismiss: (() -> Void)? = nil
    var onComplete: (() -> Void)? = nil
    
    var body: some View {
        ZStack {
            // Game background
            // Game content
            // UI elements
        }
        .onAppear {
            Task {
                await viewModel.loadAssets()
            }
        }
        .onDisappear {
            viewModel.cleanup()
        }
        .onChange(of: viewModel.gameState.gameComplete) { oldValue, newValue in
            if newValue {
                onComplete?()
            }
        }
    }
}
```

**Key Points:**
- Uses `@StateObject` to create its own ViewModel (self-contained)
- Optional callbacks (`onDismiss`, `onComplete`) for integration
- Works perfectly fine without callbacks (standalone mode)
- Manages its own lifecycle (`onAppear`/`onDisappear`)
- Handles asset loading internally

---

### 3. **Game ViewModel**

**File:** `ViewModels/{GameName}ViewModel.swift`

```swift
import Foundation
import SwiftUI
import Combine

class {GameName}ViewModel: ObservableObject {
    @Published var gameState = {GameName}GameState()
    
    private var cancellables = Set<AnyCancellable>()
    let audioService = {GameName}AudioService()
    
    // Stable key used with Game Asset API v1.
    private let gameAssetKey = "{game-name}"
    
    // MARK: - Initialization
    
    init() {
        // Initialize game state
    }
    
    deinit {
        // Cleanup timers, etc.
    }
    
    // MARK: - Asset Loading
    
    func loadAssets() async {
        print("🎮 Starting asset loading...")
        await loadCriticalAssets()
        Task {
            await loadVictoryAssets() // Pre-load in background
        }
        audioService.playBackgroundMusic()
    }
    
    private func loadCriticalAssets() async {
        // Load essential assets needed to start game
    }
    
    private func loadVictoryAssets() async {
        // Load victory sequence assets in background
    }
    
    // MARK: - Game Logic
    
    // Game-specific methods
    
    // MARK: - Cleanup
    
    func cleanup() {
        audioService.stopAllAudio()
        // Clean up timers, etc.
    }
    
    func resetGame() {
        // Reset game state
        gameState = {GameName}GameState()
        // Re-initialize
    }
}
```

**Key Points:**
- Self-contained state management
- Uses one stable game key with
  [Game Asset API v1](./GAME_ASSET_REGISTRY_ADOPTION.md)
- Own audio service instance
- Async asset loading
- Background loading for non-critical assets
- Proper cleanup in `deinit` and `cleanup()`

---

### 4. **Game Models**

**File:** `Models/{GameName}Models.swift`

```swift
import Foundation
import CoreGraphics
import UIKit

// Game-specific enums
enum {GameName}State {
    case unknown
    case good
    case bad
}

// Game-specific structs
struct {GameName}Item: Identifiable {
    let id: Int
    var position: CGPoint
    // ... game-specific properties
}

// Game state
class {GameName}GameState: ObservableObject {
    @Published var items: [{GameName}Item] = []
    @Published var gameComplete: Bool = false
    @Published var score: Int = 0
    @Published var statusMessage: String = ""
    
    // Asset images (loaded from server)
    var backgroundImage: UIImage?
    var spriteImages: [UIImage] = []
    var victoryImages: [UIImage] = []
    
    // Victory state (if applicable)
    @Published var victoryPhase: VictoryPhase = .initialImage
}

// Default configurations
extension {GameName}GameState {
    static func defaultItems() -> [{GameName}Item] {
        // Return default game configuration
    }
}
```

**Key Points:**
- All game-specific types in one file
- `ObservableObject` for reactive state
- Default configurations as static methods
- Asset storage as `UIImage?` or `[UIImage]`

---

### 5. **Game Audio Service** (if needed)

**File:** `Services/{GameName}AudioService.swift`

```swift
import Foundation
import AVFoundation

class {GameName}AudioService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    private var backgroundMusicPlayer: AVAudioPlayer?
    
    // Audio uses the same game-scoped registry as images and data.
    private let gameAssetKey = "{game-name}"
    
    override init() {
        super.init()
        setupAudioSession()
    }
    
    deinit {
        stopAllAudio()
    }
    
    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("⚠️ Failed to setup audio session: \(error)")
        }
    }
    
    func playBackgroundMusic() {
        // Load and play background music
    }
    
    func stopAllAudio() {
        backgroundMusicPlayer?.stop()
        backgroundMusicPlayer = nil
    }
}
```

**Key Points:**
- Self-contained audio management
- Resolves semantic audio keys through Game Asset API v1
- Proper cleanup
- Implements `AVAudioPlayerDelegate` if needed

---

## Integration Pattern

### In Main App

```swift
// MainView.swift
struct MainView: View {
    @State private var show{GameName} = false
    
    var body: some View {
        // ... main app content
        
        .fullScreenCover(isPresented: $show{GameName}) {
            {GameName}View(
                onDismiss: {
                    show{GameName} = false
                },
                onComplete: {
                    show{GameName} = false
                    // Handle completion (show celebration, etc.)
                }
            )
        }
    }
}
```

**Key Points:**
- Use `fullScreenCover` for immersive games
- Use `sheet` for simpler games
- Pass optional callbacks for integration
- Game works fine without callbacks

---

## Dependencies

### Shared Services (OK to Use)

These are shared but don't create tight coupling:

1. **ServerConfig.shared**
   - Provides base URL
   - Adds the read credential to registry and same-origin requests
   - Game is independent of how URL is configured

2. **ImageCache.shared**
   - Asset caching service for authenticated same-origin images
   - Game doesn't depend on main app for this
   - Do not use it for an external CDN URL because it currently adds the
     server authorization header; use the host-aware registry reader pattern

3. **Standard Swift/SwiftUI**
   - Foundation, SwiftUI, SpriteKit, AVFoundation
   - No custom dependencies

### What NOT to Depend On

❌ **MainViewModel**  
❌ **MainView**  
❌ **Other minigames**  
❌ **App-specific state** (unless via optional callbacks)

---

## Testing as Standalone

### Method 1: Comment/Uncomment @main

```swift
// In abbies_world_iosApp.swift
// @main  // Comment this out
struct abbies_world_iosApp: App {
    // ...
}

// In {GameName}StandaloneApp.swift
@main  // Uncomment this
struct {GameName}StandaloneApp: App {
    // ...
}
```

### Method 2: Separate Xcode Target (Better)

1. Create new target in Xcode
2. Set `{GameName}StandaloneApp` as the main entry point
3. Include only game-specific files
4. Can run both targets independently

---

## Asset Loading Pattern

New games use a registry key rather than constructing paths under
`/static/assets/minigames`.

```text
game: {game-name}
  backgrounds/main
  objects/collectible
  music/background
  music/victory
  ui/pause-button
```

Follow [Game Asset Registry Adoption](./GAME_ASSET_REGISTRY_ADOPTION.md) for
operator upserts, read-only Swift resolution, bundled fallbacks, caching, and
textual verification.

**Key Points:**
- Load by semantic key, not by filename or static URL
- Keep critical bundled fallbacks so the game remains playable offline
- Cache immutable revision URLs
- Handle missing assets and unsupported MIME types explicitly
- Never include the registry admin credential in an app target
- Never forward server authorization to an external CDN

---

## Example: Waypoint Navigation Game

### Files:
- `WaypointGameStandaloneApp.swift` ✅
- `Views/WaypointNavigationGame/WaypointNavigationView.swift` ✅
- `ViewModels/WaypointGameViewModel.swift` ✅
- `Models/WaypointGameModels.swift` ✅
- `Services/WaypointGameAudioService.swift` ✅

### Standalone Usage:
```swift
// Uncomment @main in WaypointGameStandaloneApp.swift
// Comment @main in abbies_world_iosApp.swift
// Run → Game launches directly
```

### Integrated Usage:
```swift
// In MainView.swift
.fullScreenCover(isPresented: $showWaypointGame) {
    WaypointNavigationView(
        onDismiss: { showWaypointGame = false },
        onComplete: { showWaypointGame = false }
    )
}
```

---

## Checklist for New Minigame

When creating a new minigame, ensure:

- [ ] **Standalone App File**
  - [ ] `{GameName}StandaloneApp.swift` created
  - [ ] `@main` commented out by default
  - [ ] Wraps main game view

- [ ] **Main Game View**
  - [ ] Uses `@StateObject` for ViewModel
  - [ ] Optional `onDismiss` and `onComplete` callbacks
  - [ ] Works without callbacks
  - [ ] Manages own lifecycle

- [ ] **Game ViewModel**
  - [ ] Self-contained state management
  - [ ] Declares one stable Game Asset API key
  - [ ] Own asset loading
  - [ ] Proper cleanup methods

- [ ] **Game Models**
  - [ ] All game types in one file
  - [ ] `ObservableObject` for state
  - [ ] Default configurations

- [ ] **Audio Service** (if needed)
  - [ ] Self-contained audio management
  - [ ] Proper cleanup

- [ ] **Asset Organization**
  - [ ] Semantic keys registered through Game Asset API v1
  - [ ] Critical assets have bundled fallbacks
  - [ ] Immutable remote revisions are cached
  - [ ] External CDN requests do not receive server credentials
  - [ ] Graceful error handling

- [ ] **Integration**
  - [ ] Can be added to MainView via `fullScreenCover`/`sheet`
  - [ ] Optional callbacks work
  - [ ] Works standalone

---

## Benefits of This Pattern

1. **Testability:** Each game can be tested independently
2. **Modularity:** Games don't depend on each other
3. **Reusability:** Games can be extracted to separate apps
4. **Maintainability:** Clear boundaries between games
5. **Debugging:** Easy to isolate issues to specific games
6. **Flexibility:** Can add/remove games without affecting others

---

## Next Steps for New Games

When porting Phaser games:

1. **Create standalone app file** (copy pattern from Waypoint)
2. **Create game view** (self-contained, optional callbacks)
3. **Create view model** (own state, asset loading)
4. **Create models** (game-specific types)
5. **Create audio service** (if needed)
6. **Test standalone** (uncomment @main)
7. **Integrate** (add to MainView with callbacks)

---

**This pattern ensures each minigame is a complete, independent module that can function on its own or as part of the larger app.**

