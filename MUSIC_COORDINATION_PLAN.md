# Music Service Coordination Plan

## Paradigm: Independent Services with Lifecycle Coordination

Each service (MusicService, WaypointGameAudioService) remains independent and manages its own audio session. They coordinate through lifecycle callbacks, not a central manager.

## Coordination Strategy

### 1. **MusicService Pauses When Game Starts**

**In MainView:**
```swift
.fullScreenCover(isPresented: $showWaypointGame) {
    WaypointNavigationView(...)
}
.onChange(of: showWaypointGame) { oldValue, newValue in
    if newValue {
        // Game is starting - pause background music
        MusicService.shared.pauseForGame()
    } else {
        // Game ended - resume background music if it was playing
        MusicService.shared.resumeAfterGame()
    }
}
```

**In MusicService:**
```swift
private var wasPlayingBeforeGame: Bool = false

func pauseForGame() {
    wasPlayingBeforeGame = isPlaying
    if isPlaying {
        pause()
    }
}

func resumeAfterGame() {
    if wasPlayingBeforeGame && isMusicEnabled {
        play()
    }
    wasPlayingBeforeGame = false
}
```

### 2. **Game Audio Stops on Dismiss**

**Already handled:** `WaypointGameAudioService` calls `stopAllAudio()` in `deinit`, which happens when the view is dismissed.

**No changes needed** - the existing pattern works.

### 3. **MusicService Checks Game State Before Starting**

**In MusicService.play():**
```swift
func play() {
    // Don't start if a game is currently active
    // (We can check this via a simple flag or notification)
    guard !isGameActive else {
        print("⚠️ MusicService: Game is active, deferring playback")
        return
    }
    
    // Normal playback logic...
}
```

**Simple flag approach:**
- `MusicService` subscribes to a notification when game starts/stops
- Or: `MainViewModel` sets a flag that `MusicService` checks

## Implementation: Notification-Based Coordination

### Option A: NotificationCenter (Lightweight)

**MusicService:**
```swift
init() {
    // Listen for game lifecycle
    NotificationCenter.default.addObserver(
        self,
        selector: #selector(gameDidStart),
        name: .gameDidStart,
        object: nil
    )
    NotificationCenter.default.addObserver(
        self,
        selector: #selector(gameDidEnd),
        name: .gameDidEnd,
        object: nil
    )
}

@objc private func gameDidStart() {
    pauseForGame()
}

@objc private func gameDidEnd() {
    resumeAfterGame()
}
```

**MainView:**
```swift
.fullScreenCover(isPresented: $showWaypointGame) {
    WaypointNavigationView(...)
}
.onChange(of: showWaypointGame) { oldValue, newValue in
    if newValue {
        NotificationCenter.default.post(name: .gameDidStart, object: nil)
    } else {
        NotificationCenter.default.post(name: .gameDidEnd, object: nil)
    }
}
```

**Extension:**
```swift
extension Notification.Name {
    static let gameDidStart = Notification.Name("gameDidStart")
    static let gameDidEnd = Notification.Name("gameDidEnd")
}
```

### Option B: Direct Reference (Simpler)

**MusicService:**
```swift
private var isGameActive: Bool = false

func setGameActive(_ active: Bool) {
    isGameActive = active
    if active {
        pauseForGame()
    } else {
        resumeAfterGame()
    }
}
```

**MainView:**
```swift
.onChange(of: showWaypointGame) { oldValue, newValue in
    MusicService.shared.setGameActive(newValue)
}
```

**Recommendation:** Option B (Direct Reference) is simpler and more explicit.

## Audio Interruption Handling

### AVAudioSession Interruption Notifications

**Easy to implement:**

```swift
// In MusicService init()
NotificationCenter.default.addObserver(
    self,
    selector: #selector(handleAudioInterruption),
    name: AVAudioSession.interruptionNotification,
    object: AVAudioSession.sharedInstance()
)

@objc private func handleAudioInterruption(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
          let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
        return
    }
    
    switch type {
    case .began:
        // Interruption started (phone call, etc.)
        print("🔇 MusicService: Audio interruption began")
        wasPlayingBeforeInterruption = isPlaying
        if isPlaying {
            pause()
        }
        
    case .ended:
        // Interruption ended
        print("🔊 MusicService: Audio interruption ended")
        if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            if options.contains(.shouldResume) && wasPlayingBeforeInterruption && isMusicEnabled {
                play()
            }
        }
    @unknown default:
        break
    }
}
```

**That's it!** iOS handles the rest - we just pause/resume appropriately.

## Summary

### What We Need:

1. **MusicService coordination methods:**
   - `pauseForGame()` / `resumeAfterGame()` - Simple state tracking
   - `setGameActive(_:)` - Called from MainView

2. **MainView integration:**
   - `.onChange(of: showWaypointGame)` - Call `MusicService.setGameActive()`

3. **Interruption handling:**
   - Subscribe to `AVAudioSession.interruptionNotification`
   - Pause on `.began`, resume on `.ended` (if appropriate)

### Benefits:

✅ **Maintains independence** - Each service manages its own audio session
✅ **Simple coordination** - Just pause/resume based on game state
✅ **No central manager** - Services remain decoupled
✅ **Easy interruption handling** - Standard iOS pattern
✅ **Works with existing code** - Game already stops audio on dismiss

### Risk Level: **Low**

- Simple state tracking (wasPlayingBeforeGame)
- Standard iOS interruption handling
- No complex coordination logic
- Each service remains independent

