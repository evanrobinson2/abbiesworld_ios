# Audio Coordination Pattern

**Status:** ✅ **IMPLEMENTED** - Pattern established and working

## Overview

The app uses **independent audio services with lifecycle coordination** rather than a centralized audio manager. This approach keeps services decoupled while ensuring they don't conflict.

## Architecture

### Services

1. **MusicService** (Main App)
   - Singleton: `MusicService.shared`
   - Manages background music playlist
   - Pauses when games start, resumes when games end

2. **Game Audio Services** (Minigames)
   - Each minigame has its own audio service
   - Examples: `WaypointGameAudioService`, `GoonPopperAudioService`
   - All inherit from `BaseGameAudioService` for consistency
   - Stop automatically when game view is dismissed

### Coordination Flow

```
User opens minigame
  ↓
MainView.onChange detects game state change
  ↓
MusicService.setGameActive(true) called
  ↓
MusicService pauses background music (remembers state)
  ↓
Game audio service starts playing
  ↓
[Game plays with its own audio]
  ↓
User closes minigame
  ↓
Game audio service stops (in deinit)
  ↓
MainView.onChange detects game closed
  ↓
MusicService.setGameActive(false) called
  ↓
MusicService resumes background music (if it was playing)
```

## Implementation Details

### MusicService Coordination

**Location:** `Services/MusicService.swift`

```swift
func setGameActive(_ active: Bool) {
    if active {
        wasPlayingBeforeGame = isPlaying
        if isPlaying {
            pause()
        }
    } else {
        if wasPlayingBeforeGame && isMusicEnabled {
            play()
        }
        wasPlayingBeforeGame = false
    }
}
```

**Key Features:**
- Remembers if music was playing before game started
- Pauses music when game becomes active
- Resumes music when game ends (only if it was playing before)

### BaseGameAudioService

**Location:** `Services/BaseGameAudioService.swift`

Provides common functionality for all minigame audio services:

- Consistent audio session setup
- Standard background music loading
- Proper cleanup in `deinit`
- Protocol conformance (`GameAudioServiceProtocol`)

**Subclasses must override:**
- `assetBaseURL: String` - Base URL for game assets
- `musicFilename: String` - Name of the music file

### MainView Integration

**Location:** `Views/MainView.swift`

For each minigame, add:

```swift
.fullScreenCover(isPresented: $showGameName) {
    GameNameView(...)
}
.onChange(of: showGameName) { oldValue, newValue in
    // Coordinate music with game lifecycle
    MusicService.shared.setGameActive(newValue)
}
```

**Current Games:**
- ✅ WaypointGame - Integrated
- ⏳ GoonPopper - Ready for integration
- ⏳ MemoryGame - Ready for integration
- ⏳ Future games - Follow same pattern

## Benefits

✅ **Decoupled Services** - Each service manages its own audio independently  
✅ **Simple Coordination** - Just pause/resume based on game state  
✅ **No Central Manager** - Services remain independent  
✅ **Consistent Pattern** - All games follow the same approach  
✅ **Automatic Cleanup** - Game audio stops when views are dismissed  
✅ **State Preservation** - Main music remembers if it was playing

## Audio Session Management

### Category: `.playback`
- Allows background audio
- Required for music playback

### Options: `.mixWithOthers`
- Game audio services use this option
- Allows game audio to mix with system sounds
- Prevents conflicts with other audio sources

### Session Activation
- Each service calls `setActive(true)` independently
- iOS handles session management automatically
- No conflicts because services coordinate via lifecycle

## Adding a New Minigame with Audio

### Step 1: Create Audio Service

```swift
class NewGameAudioService: BaseGameAudioService {
    override var assetBaseURL: String {
        let base = ServerConfig.shared.baseURL
        return "\(base)/static/assets/music/newgame"
    }
    
    override var musicFilename: String {
        return "background.mp3"
    }
}
```

### Step 2: Add to ViewModel

```swift
class NewGameViewModel: ObservableObject {
    let audioService = NewGameAudioService()
    
    func loadAssets() async {
        // ... load other assets ...
        audioService.playBackgroundMusic()
    }
    
    func cleanup() {
        audioService.stopAllAudio()
    }
}
```

### Step 3: Integrate in MainView

```swift
@State private var showNewGame = false

.fullScreenCover(isPresented: $showNewGame) {
    NewGameView(...)
}
.onChange(of: showNewGame) { oldValue, newValue in
    MusicService.shared.setGameActive(newValue)
}
```

## Troubleshooting

### Issue: Music doesn't pause when game starts
**Solution:** Ensure `MusicService.shared.setGameActive(true)` is called in `MainView.onChange`

### Issue: Game audio doesn't play
**Solution:** Check that audio service calls `playBackgroundMusic()` in `loadAssets()`

### Issue: Audio conflicts/crashes
**Solution:** Ensure all services use `.mixWithOthers` option in audio session setup

### Issue: Music doesn't resume after game
**Solution:** Check that `MusicService.shared.setGameActive(false)` is called when game closes

## Future Enhancements

- [ ] Volume control per service
- [ ] Fade in/out transitions
- [ ] Audio priority system (if needed)
- [ ] Multiple audio tracks per game
- [ ] Sound effects coordination

---

**Last Updated:** December 2025  
**Pattern Status:** ✅ Stable and working
