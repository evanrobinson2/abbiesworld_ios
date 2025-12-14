# Music Playback Implementation Plan

## Overview
Implement background music playback system that cycles through music files from the server, with shuffle/repeat controls accessible via Settings.

## Architecture

### 1. **MusicService** (New Service)
**Location:** `Services/MusicService.swift`

**Responsibilities:**
- Fetch music assets from server on startup (via AssetsService)
- Cache playlist in memory and UserDefaults (for offline access)
- Manage playback queue (shuffle/normal order)
- Handle repeat mode (repeat all, repeat one, no repeat)
- Play next/previous song automatically
- Handle song selection (play specific song, then continue with queue)
- Persist settings (music on/off, shuffle on/off, current song)

**Key Features:**
- Uses `AVAudioPlayer` (similar to WaypointGameAudioService pattern)
- Implements `AVAudioPlayerDelegate` for track completion
- Reactive with `@Published` properties for UI binding
- Caches audio data to disk for offline playback
- Handles audio session management

**State Management:**
```swift
@Published var isPlaying: Bool = false
@Published var currentSong: MusicTrack?
@Published var playlist: [MusicTrack] = []
@Published var isShuffleEnabled: Bool = false
@Published var isMusicEnabled: Bool = true
@Published var repeatMode: RepeatMode = .all // .all, .one, .none
@Published var isLoading: Bool = false
```

**Methods:**
- `loadPlaylist()` - Fetch from AssetsService, cache to UserDefaults
- `play()` - Start/resume playback
- `pause()` - Pause playback
- `playNext()` - Advance to next song (respects shuffle)
- `playPrevious()` - Go to previous song
- `playSong(_ track: MusicTrack)` - Play specific song, then continue queue
- `toggleShuffle()` - Enable/disable shuffle
- `setRepeatMode(_ mode: RepeatMode)` - Change repeat mode
- `toggleMusic()` - Enable/disable music (on/off)

### 2. **MusicTrack Model** (New Model)
**Location:** `Models/MusicTrack.swift`

**Structure:**
```swift
struct MusicTrack: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let url: String // Server path like "/static/assets/music/song.mp3"
    let size: Int
    let mimeType: String
    
    // Display name (cleaned up)
    var displayName: String {
        name.replacingOccurrences(of: ".mp3", with: "")
            .replacingOccurrences(of: "_", with: " ")
    }
}
```

### 3. **MusicSettingsViewModel** (New ViewModel)
**Location:** `ViewModels/MusicSettingsViewModel.swift`

**Responsibilities:**
- Bridge between MusicService and SettingsView
- Expose music controls to UI
- Handle song selection UI

**Properties:**
- References `MusicService.shared`
- Exposes all music state for SettingsView

### 4. **SettingsView Updates**
**Location:** `Views/Components/SettingsView.swift`

**New Section: "Music Controls"**
- **Music Toggle:** On/Off switch (binds to `MusicService.isMusicEnabled`)
- **Shuffle Toggle:** On/Off switch (binds to `MusicService.isShuffleEnabled`)
- **Song Selector:** 
  - Scrollable list of all available songs
  - Shows currently playing song (highlighted)
  - Tap to play selected song
  - Shows play/pause indicator
  - Displays song name (cleaned up, e.g., "Bubblegum Skies" instead of "Bubblegum Skies.mp3")

**UI Layout:**
```
Settings
├── Music Controls
│   ├── [Toggle] Music: On/Off
│   ├── [Toggle] Shuffle: On/Off
│   └── [List] Select Song
│       ├── ▶️ Bubblegum Skies (currently playing)
│       ├── Dancing Through the Meadow variant 1
│       ├── Dancing Through the Meadow variant 2
│       ├── Sunshine & Sneakers
│       └── Sunshine in My Pocket
└── [Other settings...]
```

### 5. **Integration Points**

**MainViewModel:**
- Initialize `MusicService.shared` on app startup
- Load playlist when app loads (similar to how ingredients are loaded)
- No direct music control needed (handled by MusicService lifecycle)

**App Lifecycle:**
- Start music playback when app becomes active (if enabled)
- Pause music when app goes to background (optional - can continue)
- Resume on foreground (if was playing)

## Implementation Details

### Caching Strategy

**Memory Cache:**
- Playlist stored in `MusicService.playlist: [MusicTrack]`
- Current song audio data cached in `AVAudioPlayer` instance

**Disk Cache:**
- Playlist metadata cached to UserDefaults (JSON encoded)
- Audio files cached to `Documents/MusicCache/` directory
- Cache key: `music_playlist_<timestamp>`
- On startup: Check cache age, refresh if > 24 hours old

**Cache Invalidation:**
- Refresh playlist on app startup if cache is stale
- Manual refresh option in Settings (future enhancement)

### Playback Logic

**Normal Playback:**
1. Play songs in order: Track 1 → Track 2 → Track 3 → ...
2. When last song ends:
   - If repeat mode = `.all`: Loop back to first song
   - If repeat mode = `.none`: Stop playback
   - If repeat mode = `.one`: Repeat current song

**Shuffle Playback:**
1. Create shuffled queue on shuffle enable
2. Maintain shuffle order until shuffle disabled
3. When song ends, play next in shuffled queue
4. If repeat = `.all`, reshuffle when queue exhausted

**Song Selection:**
1. User selects song from Settings
2. Play selected song immediately
3. After song completes:
   - If shuffle enabled: Continue with shuffled queue (excluding played songs)
   - If shuffle disabled: Continue with normal queue from selected song position

### Error Handling

- Network errors: Use cached playlist if available
- Audio loading errors: Skip to next song, log error
- Missing files: Remove from playlist, continue
- Audio session errors: Log, disable music gracefully

## File Structure

```
abbies.world.ios/
├── Models/
│   └── MusicTrack.swift (NEW)
├── Services/
│   ├── MusicService.swift (NEW)
│   └── AssetsService.swift (existing - will use)
├── ViewModels/
│   └── MusicSettingsViewModel.swift (NEW - optional, may not need)
└── Views/
    └── Components/
        └── SettingsView.swift (UPDATE - add music section)
```

## Settings UI Mockup

```
┌─────────────────────────────────┐
│ Settings                    [X] │
├─────────────────────────────────┤
│                                 │
│ Music Controls                  │
│ ┌─────────────────────────────┐ │
│ │ Music:        [●────○] On    │ │
│ │ Shuffle:      [○────●] Off   │ │
│ └─────────────────────────────┘ │
│                                 │
│ Select Song                     │
│ ┌─────────────────────────────┐ │
│ │ ▶️ Bubblegum Skies          │ │ ← Currently playing
│ │   Dancing Through the...    │ │
│ │   Dancing Through the...    │ │
│ │   Sunshine & Sneakers       │ │
│ │   Sunshine in My Pocket     │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Other settings sections...]    │
└─────────────────────────────────┘
```

## Implementation Steps

1. **Create MusicTrack model** - Simple data structure
2. **Create MusicService** - Core playback logic
3. **Integrate with AssetsService** - Fetch music assets on startup
4. **Add caching** - UserDefaults for playlist, disk for audio files
5. **Update SettingsView** - Add music controls section
6. **Test playback** - Verify shuffle, repeat, song selection
7. **Add error handling** - Graceful degradation
8. **Polish UI** - Icons, animations, feedback

## Technical Considerations

- **Audio Session:** Use `.playback` category (allows background playback)
- **Memory Management:** Release AVAudioPlayer when not needed
- **Threading:** All UI updates on MainActor
- **State Persistence:** Save settings to UserDefaults
- **Performance:** Lazy load audio files (load on-demand, not all at once)

## Future Enhancements (Not in Initial Implementation)

- Volume control slider
- Repeat mode selector (All/One/None) - start with just All/None
- Playback progress indicator
- Now playing info in drawer
- Fade in/out between songs
- Playlist reordering

