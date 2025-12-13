# Drawer Migration Plan: Two-Column to Full-Width with Overlay Drawer

**Date:** December 2025  
**Goal:** Migrate from 55%/45% split layout to full-width carousels with right-side overlay drawer

---

## Current State Analysis

### Current Structure
```
MainView
├── HStack (spacing: 0)
│   ├── CombinedColumnView (55% width)
│   │   └── 3 Carousels (Friend, Outfit, Place)
│   └── RightColumnView (45% width)
│       ├── Preview Section
│       └── History Section
└── Overlay (Settings/Games buttons, error dialogs)
```

### Dependencies
- `RightColumnCalculations` depends on `LeftColumnCalculations` for height matching
- `CombinedColumnView` uses `LeftColumnCalculations` for carousel heights
- Both views share the same `GeometryReader` context

### Key Components to Modify
1. **MainView.swift** - Layout structure (HStack → ZStack)
2. **CombinedColumnView** - Width constraint (55% → 100%)
3. **RightColumnView** - Convert to drawer content
4. **New: DrawerView** - Drawer container with handle
5. **New: DrawerHandle** - Semi-transparent handle component

---

## Migration Strategy: Incremental & Safe

### Phase 1: Foundation (Low Risk)
**Goal:** Set up drawer structure without breaking existing layout

#### Step 1.1: Create Drawer State Management
- **File:** `MainView.swift`
- **Action:** Add `@State private var isDrawerOpen: Bool = false`
- **Risk:** None (new state, doesn't affect existing code)
- **Test:** Verify app still runs normally

#### Step 1.2: Create DrawerHandle Component
- **File:** `Views/Components/DrawerHandle.swift` (new file)
- **Action:** Create reusable drawer handle view
- **Properties:**
  - Semi-transparent background (30-40% opacity)
  - Chevron icon (left-pointing when closed, right-pointing when open)
  - Rounded rectangle shape
  - Tap gesture to toggle drawer
  - Subtle pulse animation when closed
- **Risk:** None (new component, not integrated yet)
- **Test:** Can instantiate and display in preview

#### Step 1.3: Create DrawerView Component
- **File:** `Views/Components/DrawerView.swift` (new file)
- **Action:** Create drawer container view
- **Properties:**
  - Takes `RightColumnView` content as parameter
  - Handles slide animation
  - Manages shadow and blur effects
  - Handles swipe gestures
  - Overlay positioning
- **Risk:** None (new component, not integrated yet)
- **Test:** Can instantiate with test content in preview

**Checkpoint 1:** All new components compile and can be previewed independently

---

### Phase 2: Layout Restructure (Medium Risk)
**Goal:** Change from HStack to ZStack, make carousels full-width

#### Step 2.1: Change MainView Layout Structure
- **File:** `MainView.swift`
- **Action:** Replace HStack with ZStack
- **Before:**
  ```swift
  HStack(spacing: 0) {
      CombinedColumnView(...).frame(width: geometry.size.width * 0.55)
      RightColumnView(...).frame(width: geometry.size.width * 0.45)
  }
  ```
- **After:**
  ```swift
  ZStack(alignment: .trailing) {
      // Carousels (full width)
      CombinedColumnView(...).frame(width: geometry.size.width)
      
      // Drawer (overlay)
      if isDrawerOpen {
          DrawerView(...)
      }
      
      // Drawer handle (always visible)
      DrawerHandle(isOpen: $isDrawerOpen)
          .position(x: geometry.size.width - 15, y: geometry.size.height / 2)
  }
  ```
- **Risk:** Medium (layout change, but carousels should still work)
- **Test:** 
  - Carousels display full width
  - No layout errors
  - Carousels still scroll and function

#### Step 2.2: Update CombinedColumnView Width
- **File:** `MainView.swift`
- **Action:** Remove width constraint, let it expand to full width
- **Change:** Remove `.frame(width: geometry.size.width * 0.55)`
- **Risk:** Low (just removing constraint)
- **Test:** Carousels take full width, no clipping

#### Step 2.3: Temporarily Hide RightColumnView
- **File:** `MainView.swift`
- **Action:** Comment out RightColumnView in HStack (we'll add it to drawer next)
- **Risk:** Low (temporary, we'll restore it)
- **Test:** App runs, only carousels visible

**Checkpoint 2:** Carousels display full-width, app functions normally, no RightColumnView visible

---

### Phase 3: Drawer Integration (Medium-High Risk)
**Goal:** Integrate RightColumnView into drawer, add interactions

#### Step 3.1: Move RightColumnView into DrawerView
- **File:** `MainView.swift`
- **Action:** Pass RightColumnView content to DrawerView
- **Structure:**
  ```swift
  DrawerView(
      isOpen: $isDrawerOpen,
      content: {
          RightColumnView(
              viewModel: viewModel,
              historyImages: viewModel.historyImages,
              isLoading: viewModel.isLoadingHistory
          )
      }
  )
  ```
- **Risk:** Medium (drawer positioning and sizing)
- **Test:**
  - Drawer appears when opened
  - RightColumnView content displays correctly
  - No layout errors

#### Step 3.2: Implement Drawer Positioning
- **File:** `Views/Components/DrawerView.swift`
- **Action:** Implement offset-based positioning
- **Closed state:** `offset(x: drawerWidth)` (off-screen right)
- **Open state:** `offset(x: 0)` (on-screen)
- **Handle visible:** `offset(x: drawerWidth - handleWidth)` (handle peeks out)
- **Risk:** Medium (animation and positioning)
- **Test:**
  - Drawer slides in from right
  - Drawer slides out to right
  - Smooth animation

#### Step 3.3: Add Drawer Styling
- **File:** `Views/Components/DrawerView.swift`
- **Action:** Add visual effects
- **Properties:**
  - Background: `Color.white.opacity(0.85)` with blur
  - Shadow: `.shadow(color: .black.opacity(0.2), radius: 12, x: -4, y: 0)`
  - Rounded corners: Left side only (12px)
  - Backdrop blur on carousels when open
- **Risk:** Low (visual only)
- **Test:** Drawer looks polished, carousels dim when drawer open

#### Step 3.4: Implement Gesture Handling
- **File:** `Views/Components/DrawerView.swift`
- **Action:** Add drag gestures
- **Gestures:**
  - Swipe from right edge (20px area) → opens drawer
  - Swipe left on drawer → closes drawer
  - Tap outside drawer → closes drawer (optional)
  - Tap handle → toggles drawer
- **Risk:** Medium (gesture conflicts with carousel scrolling)
- **Test:**
  - All gestures work correctly
  - No conflicts with carousel scrolling
  - Gestures feel natural

**Checkpoint 3:** Drawer fully functional, can open/close, RightColumnView content accessible

---

### Phase 4: Handle & Polish (Low-Medium Risk)
**Goal:** Add drawer handle, improve UX, handle edge cases

#### Step 4.1: Position Drawer Handle
- **File:** `MainView.swift`
- **Action:** Position handle on right edge, vertically centered
- **Properties:**
  - Always visible (even when drawer closed)
  - Position: `x: geometry.size.width - handleWidth/2, y: geometry.size.height / 2`
  - Z-index: Above carousels, below drawer when open
- **Risk:** Low (positioning)
- **Test:** Handle visible, doesn't block carousels

#### Step 4.2: Add Handle Visual Feedback
- **File:** `Views/Components/DrawerHandle.swift`
- **Action:** Add animations and states
- **Features:**
  - Pulse animation when closed (subtle)
  - Icon changes (chevron left when closed, chevron right when open)
  - Opacity: 30-40% when closed, 100% when open
  - Haptic feedback on tap
- **Risk:** Low (visual only)
- **Test:** Handle provides clear visual feedback

#### Step 4.3: Handle Generation Button Placement
- **File:** `MainView.swift` or `RightColumnView.swift`
- **Action:** Ensure generation button is accessible
- **Options:**
  - Keep in drawer (current location)
  - Move to floating button in main area
  - Add both (button in drawer + floating button when drawer closed)
- **Recommendation:** Keep in drawer, add floating button when drawer closed
- **Risk:** Low (additive change)
- **Test:** Generation button always accessible

#### Step 4.4: Add Auto-Open Behavior (Optional)
- **File:** `MainView.swift`
- **Action:** Auto-open drawer when generation completes
- **Logic:** 
  - Monitor `viewModel.buttonState` or generation completion
  - Set `isDrawerOpen = true` when new image generated
- **Risk:** Low (optional feature)
- **Test:** Drawer opens automatically after generation

**Checkpoint 4:** Complete drawer experience, polished interactions, all edge cases handled

---

### Phase 5: Cleanup & Optimization (Low Risk)
**Goal:** Remove old code, optimize performance

#### Step 5.1: Remove Old Layout Code
- **File:** `MainView.swift`
- **Action:** Remove commented-out HStack code
- **Risk:** None (dead code removal)
- **Test:** App still works

#### Step 5.2: Simplify RightColumnCalculations
- **File:** `MainView.swift`
- **Action:** Review if `RightColumnCalculations` still needs `LeftColumnCalculations` dependency
- **Note:** May still need it for height matching, but verify
- **Risk:** Low (calculation logic)
- **Test:** Drawer content sizes correctly

#### Step 5.3: Add Drawer Width Constant
- **File:** `MainView.swift` or new constants file
- **Action:** Extract drawer width to constant
- **Value:** `let drawerWidth: CGFloat = geometry.size.width * 0.45` (or 0.5)
- **Risk:** None (refactoring)
- **Test:** Drawer width consistent

#### Step 5.4: Performance Optimization
- **Files:** Various
- **Action:** Review animation performance
- **Checks:**
  - Smooth 60fps animations
  - No layout recalculations during animation
  - Efficient gesture handling
- **Risk:** None (optimization)
- **Test:** Smooth performance on device

**Checkpoint 5:** Code clean, optimized, ready for production

---

## Detailed Component Specifications

### DrawerHandle Component

**File:** `Views/Components/DrawerHandle.swift`

**Properties:**
- `@Binding var isOpen: Bool`
- `var onTap: (() -> Void)?`

**Visual:**
- Size: ~40px wide × 80-100px tall
- Shape: Rounded rectangle (8px radius)
- Background: Semi-transparent (30-40% opacity)
- Icon: SF Symbol chevron (`.chevron.left` when closed, `.chevron.right` when open)
- Position: Right edge, vertically centered

**Interactions:**
- Tap gesture toggles drawer
- Subtle pulse animation when closed
- Haptic feedback on tap

---

### DrawerView Component

**File:** `Views/Components/DrawerView.swift`

**Properties:**
- `@Binding var isOpen: Bool`
- `var content: () -> AnyView` (or `@ViewBuilder var content`)
- `var width: CGFloat` (drawer width, typically 45-50% of screen)

**Visual:**
- Background: `Color.white.opacity(0.85)` with blur
- Shadow: Left edge shadow (radius 12, x: -4)
- Rounded corners: Left side only (12px)
- Width: 45-50% of screen width
- Height: Full screen height

**Animation:**
- Spring animation (response: 0.3, damping: 0.8)
- Offset-based (slides from right)
- Duration: ~0.3 seconds

**Gestures:**
- `DragGesture` for swipe interactions
- Minimum drag distance: 50px
- Velocity threshold: 500 points/second

**Backdrop:**
- Dim carousels when open (20-30% opacity overlay)
- Optional blur effect on carousels

---

## Edge Cases & Considerations

### 1. Carousel Scrolling vs Drawer Gestures
**Issue:** Right-edge swipe might conflict with carousel horizontal scrolling

**Solution:**
- Only detect swipe gesture in narrow right-edge zone (20px)
- Carousel scrolling takes priority in carousel area
- Drawer gesture only active in right 20px edge

### 2. Drawer Width on Different Devices
**Issue:** 45% might be too narrow/wide on different screen sizes

**Solution:**
- Use adaptive width: `min(geometry.size.width * 0.5, 400)` for iPad
- Test on iPhone and iPad
- Consider device-specific constants

### 3. Generation Button Accessibility
**Issue:** Button hidden when drawer closed

**Solution:**
- Option A: Floating action button when drawer closed
- Option B: Auto-open drawer when generation starts
- Option C: Mini preview thumbnail in handle

**Recommendation:** Option A (floating button)

### 4. History Badge/Indicator
**Issue:** Users might not know history exists

**Solution:**
- Add badge to handle showing history count
- Or small history icon in main area
- Or first-launch tutorial

### 5. Drawer State Persistence
**Issue:** Should drawer state persist across app launches?

**Solution:**
- Default: Closed on launch
- Optional: Remember last state in UserDefaults
- Recommendation: Default closed (cleaner initial state)

### 6. Animation Performance
**Issue:** Smooth animations on older devices

**Solution:**
- Use native SwiftUI animations (optimized)
- Avoid complex layout calculations during animation
- Test on older devices (iPhone 8, etc.)

### 7. Safe Area Handling
**Issue:** Drawer should respect safe areas

**Solution:**
- Use `.ignoresSafeArea(.container, edges: .top)` for drawer
- Handle should respect safe areas
- Test on devices with notches

---

## Testing Checklist

### Phase 1 Testing
- [ ] New components compile
- [ ] Components can be previewed
- [ ] No runtime errors

### Phase 2 Testing
- [ ] Carousels display full width
- [ ] Carousels scroll correctly
- [ ] No layout errors
- [ ] App functions normally

### Phase 3 Testing
- [ ] Drawer opens/closes smoothly
- [ ] RightColumnView content displays correctly
- [ ] Preview section works
- [ ] History section works
- [ ] Generation button works
- [ ] No gesture conflicts

### Phase 4 Testing
- [ ] Handle visible and functional
- [ ] Handle animations work
- [ ] All gestures work correctly
- [ ] Auto-open works (if implemented)
- [ ] Edge cases handled

### Phase 5 Testing
- [ ] Performance is smooth
- [ ] No memory leaks
- [ ] Code is clean
- [ ] All features work

### Device Testing
- [ ] iPhone (various sizes)
- [ ] iPad (if supported)
- [ ] Portrait orientation
- [ ] Landscape orientation (if supported)
- [ ] Different iOS versions

---

## Rollback Plan

If issues arise, rollback steps:

1. **Phase 1-2 Issues:** Revert to HStack layout (git revert)
2. **Phase 3 Issues:** Keep carousels full-width, temporarily show RightColumnView below carousels
3. **Phase 4-5 Issues:** Disable problematic features, keep basic drawer

**Git Strategy:**
- Create branch: `feature/drawer-migration`
- Commit after each phase checkpoint
- Can revert individual phases if needed

---

## Timeline Estimate

- **Phase 1:** 1-2 hours (foundation)
- **Phase 2:** 2-3 hours (layout restructure)
- **Phase 3:** 3-4 hours (drawer integration)
- **Phase 4:** 2-3 hours (polish)
- **Phase 5:** 1-2 hours (cleanup)

**Total:** 9-14 hours

**With Testing:** Add 2-3 hours for thorough testing

---

## Success Criteria

✅ **Functional:**
- Carousels always full-width
- Drawer slides in/out smoothly
- All existing functionality preserved
- Generation button accessible
- History accessible

✅ **Visual:**
- Polished drawer appearance
- Smooth animations
- Clear visual hierarchy
- Handle is discoverable

✅ **UX:**
- Intuitive interactions
- No gesture conflicts
- Responsive feel
- Kid-friendly

---

## Next Steps

1. **Review this plan** - Confirm approach and priorities
2. **Create feature branch** - `git checkout -b feature/drawer-migration`
3. **Start Phase 1** - Create new components
4. **Test incrementally** - After each phase
5. **Iterate** - Adjust based on testing

---

**Ready to begin migration when you are!**

