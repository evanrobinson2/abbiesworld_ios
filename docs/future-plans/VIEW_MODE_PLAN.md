# View Mode System - Implementation Plan

## Overview
Add a view mode selection system that allows switching between different main view layouts. Start with DEFAULT (current) and add a new 4-CAROUSEL mode with style selection.

## Acceptance Criteria
1. ✅ Default view works unchanged
2. ✅ View mode selectable from Settings menu
3. ✅ 4th carousel bottom-aligned with preview drawer
4. ✅ 4th reference image included in generation when in 4-carousel mode
5. ✅ GPT prompt modified to use style input

---

## Step-by-Step Implementation Plan

### Phase 1: View Mode Infrastructure (Foundation)

#### Step 1.1: Create View Mode Enum
**File:** `Models/ViewMode.swift` (NEW)
- Enum: `ViewMode` with cases:
  - `.default` (current 3-carousel view)
  - `.fourCarousel` (new 4-carousel view)
- Make it `Codable` for persistence
- Add `displayName: String` computed property

#### Step 1.2: Add View Mode State to MainViewModel
**File:** `ViewModels/MainViewModel.swift`
- Add `@Published var viewMode: ViewMode = .default`
- Add `@Published var styleIndex: Int = -1` (for 4th carousel)
- Add `@Published var styleItems: [Ingredient] = []` (placeholder styles)
- Update `allSelectionsReady` computed property:
  - Default mode: requires friend, outfit, place (3 selections)
  - FourCarousel mode: requires friend, outfit, place, style (4 selections)

#### Step 1.3: Persist View Mode Selection
**File:** `ViewModels/MainViewModel.swift`
- Save `viewMode` to UserDefaults on change
- Load `viewMode` from UserDefaults in `init()`
- Add `func setViewMode(_ mode: ViewMode)` method

---

### Phase 2: Settings UI (View Selection)

#### Step 2.1: Add View Mode Selector to Settings
**File:** `Views/Components/SettingsView.swift`
- Add new section: "View Mode" above Music Controls
- Add `@ObservedObject var viewModel: MainViewModel` parameter
- Create `ViewModeSelector` component:
  - Shows current view mode
  - Picker/segmented control to switch modes
  - Options: "Default" and "4 Carousels" (or "Style Mode")

**Note:** SettingsView needs access to MainViewModel. Pass it as parameter.

---

### Phase 3: Style Carousel Data (Placeholder Tiles)

#### Step 3.1: Create Placeholder Style Ingredients
**File:** `ViewModels/MainViewModel.swift`
- Add method `loadStyleItems()` that creates 5 placeholder `Ingredient` objects:
  - IDs: `style_crayon`, `style_charcoal`, `style_pencil`, `style_watercolor`, `style_oil_painting`
  - Names: "Crayon", "Charcoal", "Pencil", "Watercolor", "Oil Painting"
  - Category: "art_style"
  - `imageURL: nil` (will use placeholder tile)
- Call this in `init()` or when view mode changes to `.fourCarousel`

#### Step 3.2: Create Placeholder Tile View
**File:** `Views/Components/StylePlaceholderTile.swift` (NEW)
- Simple SwiftUI view that renders:
  - Dark blue background
  - Light blue architectural/geometric lines
  - Style name text overlay
- Make it look "cool" but simple
- Size: Match existing carousel tile dimensions

---

### Phase 4: New View Layout (4-Carousel Mode)

#### Step 4.1: Create FourCarouselView Component
**File:** `Views/Components/FourCarouselView.swift` (NEW)
- Clone `CombinedColumnView` structure
- Add 4th carousel for styles:
  - Position: Bottom-aligned with preview drawer area
  - Use same carousel component as others
  - Bind to `styleIndex` and `styleItems`
- Adjust layout:
  - Shrink existing 3 carousels slightly (reduce tile size)
  - Add 4th carousel row at bottom
  - Ensure proper spacing

#### Step 4.2: Update MainView to Switch Views
**File:** `Views/MainView.swift`
- Replace `CombinedColumnView` with conditional:
  ```swift
  if viewModel.viewMode == .default {
      CombinedColumnView(...)
  } else {
      FourCarouselView(...)
  }
  ```
- Pass all necessary bindings to both views
- Ensure drawer and other overlays work with both views

---

### Phase 5: Generation Integration (4th Reference Image)

#### Step 5.1: Update startImageGeneration() Logic
**File:** `ViewModels/MainViewModel.swift`
- In `startImageGeneration()`:
  - Check `viewMode`
  - If `.fourCarousel`:
    - Require `styleIndex >= 0`
    - Get selected style ingredient
    - Add style reference image to `referenceImageIds` array
  - If `.default`:
    - Use existing 3-image logic (unchanged)

#### Step 5.2: Handle Style Reference Image
**File:** `ViewModels/MainViewModel.swift`
- For placeholder styles (no actual image):
  - Option A: Skip 4th reference image (just use style name in prompt)
  - Option B: Create a placeholder image asset for each style
  - **Recommendation:** Start with Option A (simpler), add images later if needed

---

### Phase 6: Prompt Modification (Style Integration)

#### Step 6.1: Update Server-Side Prompt Generation
**File:** `Abbies World Server/src/game_engine.py`
- Check if 4th reference image is provided
- If yes, extract style name from image path or metadata
- Modify prompt generation to include style instruction:
  - Example: "Render in [STYLE] style: [generated prompt]"
  - Or: "Using [STYLE] medium, create: [generated prompt]"

#### Step 6.2: Alternative: Client-Side Style Prompt
**File:** `ViewModels/MainViewModel.swift` (if server doesn't support)
- If style selected, add to `freeTextDescription`:
  - Example: "Style: Crayon" or "Medium: Watercolor"
- Server will include this in prompt generation

**Recommendation:** Start with client-side approach (simpler), move to server-side later if needed.

---

## Implementation Order (Do One Step at a Time)

1. ✅ **Phase 1** - View mode infrastructure (enum, state, persistence)
2. ✅ **Phase 2** - Settings UI (view selector)
3. ✅ **Phase 3** - Style carousel data (placeholder ingredients)
4. ✅ **Phase 4** - New view layout (FourCarouselView)
5. ✅ **Phase 5** - Generation integration (4th reference image)
6. ✅ **Phase 6** - Prompt modification (style in prompt)

---

## Key Design Decisions

### Simplicity First
- Start with placeholder tiles (no images) - just visual proof
- Use style name in prompt (not reference image) initially
- Can add actual style reference images later

### Backward Compatibility
- Default mode unchanged - all existing code paths work
- New mode is additive - doesn't break existing functionality
- View mode is opt-in via Settings

### Incremental Testing
- Test each phase before moving to next
- Verify default mode still works after each change
- Test 4-carousel mode in isolation

---

## File Structure

**New Files:**
- `Models/ViewMode.swift`
- `Views/Components/StylePlaceholderTile.swift`
- `Views/Components/FourCarouselView.swift`

**Modified Files:**
- `ViewModels/MainViewModel.swift` - Add view mode state, style items, generation logic
- `Views/MainView.swift` - Conditional view rendering
- `Views/Components/SettingsView.swift` - Add view mode selector
- `Abbies World Server/src/game_engine.py` - Style prompt handling (optional, Phase 6)

---

## Testing Checklist (Per Phase)

**Phase 1:**
- [ ] View mode enum compiles
- [ ] View mode persists across app restarts
- [ ] Default mode still works

**Phase 2:**
- [ ] Settings shows view mode selector
- [ ] Can switch between modes
- [ ] Main view updates when mode changes

**Phase 3:**
- [ ] Style items load correctly
- [ ] Placeholder tiles render
- [ ] Can select style items

**Phase 4:**
- [ ] FourCarouselView renders
- [ ] 4th carousel appears at bottom
- [ ] All 4 carousels are selectable
- [ ] Drawer still works

**Phase 5:**
- [ ] Generation includes 4th reference when in 4-carousel mode
- [ ] Generation still works in default mode (3 images)
- [ ] Button state updates correctly

**Phase 6:**
- [ ] Generated images reflect style selection
- [ ] Prompt includes style information
- [ ] Default mode prompts unchanged

---

## Risk Mitigation

1. **Default Mode Must Work** - Always test default mode after each change
2. **Incremental Changes** - One phase at a time, test before proceeding
3. **Simple Placeholders** - Start with basic tiles, enhance later
4. **Optional Server Changes** - Client-side style prompt first, server-side later

---

## Future Enhancements (Not in Initial Implementation)

- Actual style reference images (instead of placeholders)
- More view modes (5-carousel, grid layout, etc.)
- Style carousel populated from server (dynamic styles)
- Style preview thumbnails
- Custom style uploads

