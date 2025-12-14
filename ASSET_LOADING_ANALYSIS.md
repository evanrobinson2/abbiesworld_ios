# Asset Loading Strategy Analysis

**Date:** December 14, 2025  
**Current State:** Review of app's resource loading approach

---

## Current App Implementation

### What Happens on Startup

1. **Metadata Loading (Synchronous):**
   - Loads asset lists from API: friends, outfits, places (3 API calls)
   - Sets `isLoadingIngredients = true` (but no visible UI indicator)
   - Creates `Ingredient` objects with `imageURL` strings
   - No actual image data loaded yet

2. **Image Loading (Lazy/On-Demand):**
   - Images load when carousel tiles are displayed
   - Each `TileView` loads its own image via `ImageCache.shared.loadImage()`
   - Individual tiles show `ProgressView()` spinner while loading
   - Images cached in memory (50MB limit) and disk (100MB limit)

3. **Caching Strategy:**
   - **Memory cache:** NSCache, 50MB, ~200 images
   - **Disk cache:** File system, 100MB, auto-cleanup after 7 days
   - **Cache lookup order:** Memory → Disk → Network

### Current Resource Count

**On Startup:**
- Friends: ~30-50 assets (metadata only)
- Outfits: ~30-50 assets (metadata only)
- Places: ~30-50 assets (metadata only)
- Styles: 84 assets (metadata only, when in 4-carousel mode)
- **Total metadata:** ~150-250 asset records (just URLs, ~few KB)

**Images Loaded:**
- Only visible carousel tiles (maybe 5-10 images initially)
- Rest load as user scrolls

---

## How Apps Typically Handle Many Resources

### Pattern 1: Pre-load with Loading Screen (Most Common)

**Used by:** Games, media apps, content-heavy apps

**Approach:**
1. Show splash screen → loading screen with progress bar
2. Load critical assets upfront (first screen visible)
3. Pre-fetch remaining assets in background
4. Show progress: "Loading assets... 45/200"

**Benefits:**
- Smooth first interaction (no loading spinners on tiles)
- User knows app is loading
- Better perceived performance

**Example Flow:**
```
Splash → Loading Screen (Progress: 0%)
  ↓
Load metadata (friends, outfits, places, styles)
  ↓ Progress: 20%
Load critical images (first 20 visible tiles)
  ↓ Progress: 60%
Pre-fetch remaining images in background
  ↓ Progress: 100%
Show main UI (all images ready)
```

### Pattern 2: Progressive Loading (Your Current Approach)

**Used by:** Social media, content feeds, image galleries

**Approach:**
1. Load metadata quickly
2. Show UI immediately with placeholders
3. Load images as they come into view (lazy loading)
4. Individual loading indicators per item

**Benefits:**
- Fast initial render
- Low memory usage
- Good for large datasets

**Drawbacks:**
- Many loading spinners visible
- Can feel "incomplete" initially

### Pattern 3: Hybrid Approach (Best of Both)

**Used by:** Professional apps, games with large asset sets

**Approach:**
1. Load critical assets upfront (first screen)
2. Show loading screen for critical assets only
3. Background pre-fetch remaining assets
4. Lazy load anything not pre-fetched

**Benefits:**
- Fast initial experience
- Smooth scrolling
- Good memory management

---

## Your App's Current Situation

### Resource Scale

**Metadata (Lightweight):**
- ~150-250 asset records (JSON, ~50-100KB total)
- Loads in <1 second

**Images (Heavy):**
- Each image: ~1-2MB (1024x1024 PNG)
- Total if all loaded: ~150-500MB
- Current approach: Only loads visible tiles (~10-20MB initially)

### Current Issues

1. **No visible loading state** - `isLoadingIngredients` exists but no UI shows it
2. **Many individual spinners** - Each tile shows its own loading indicator
3. **Potential jank** - Images pop in as they load, carousel can feel "jumpy"
4. **No progress feedback** - User doesn't know if app is loading or broken

---

## Recommendations

### Option 1: Add Loading Screen (Recommended for Better UX)

**Implementation:**
1. Show loading screen on first launch
2. Load metadata + first 20-30 visible images
3. Show progress: "Loading assets... X%"
4. Then show main UI

**Code Changes:**
- Add `LoadingView` component with progress bar
- Track loading progress: `(loadedImages / totalImages) * 100`
- Pre-load visible carousel tiles before showing UI

**Benefits:**
- Professional feel
- Smooth first interaction
- Clear feedback to user

### Option 2: Keep Current + Add Progress Indicator

**Implementation:**
1. Keep lazy loading
2. Add subtle progress indicator (top of screen)
3. Show "Loading assets..." while initial batch loads
4. Hide when first screen of tiles are ready

**Code Changes:**
- Minimal - just add progress indicator to `MainView`
- Track: `(loadedImages / visibleImages) * 100`

**Benefits:**
- Less code changes
- Still fast initial render
- Better feedback

### Option 3: Background Pre-fetching (Advanced)

**Implementation:**
1. Load metadata on startup (current)
2. Show UI immediately (current)
3. Pre-fetch all images in background with low priority
4. Images appear as they're ready

**Code Changes:**
- Add background task to pre-fetch all asset images
- Use `URLSessionConfiguration.background`
- Prioritize visible tiles, then background

**Benefits:**
- Best user experience
- Smooth scrolling
- Complex to implement

---

## What Most Apps Do

**For apps with 100+ images:**

1. **Games/Media Apps:** Pre-load with loading screen (Pattern 1)
   - User expects loading time
   - Better to wait than see spinners everywhere

2. **Social/Feed Apps:** Progressive loading (Pattern 2 - your current)
   - Fast initial render
   - Load as user scrolls

3. **Professional Apps:** Hybrid (Pattern 3)
   - Critical assets upfront
   - Background pre-fetch
   - Best UX but more complex

---

## Recommendation for Your App

**Given:**
- ~150-250 total assets
- Each image ~1-2MB
- Carousel-based UI (not infinite scroll)
- Kids' app (should feel polished)

**Best Approach: Hybrid (Option 3, simplified)**

1. **On Startup:**
   - Show loading screen with progress bar
   - Load metadata (friends, outfits, places, styles) - fast
   - Pre-load first visible row of each carousel (~15-20 images)
   - Show progress: "Loading assets... X%"

2. **After Initial Load:**
   - Show main UI
   - Background pre-fetch remaining images
   - Lazy load anything not ready yet

3. **Progress Calculation:**
   ```
   Progress = (loadedImages / totalImages) * 100
   ```

**Why This Works:**
- Fast enough (metadata + 20 images = ~2-3 seconds)
- Smooth first interaction (no spinners on visible tiles)
- Professional feel (loading screen)
- Good memory usage (only pre-load what's needed)

---

## Implementation Notes

**Current Code Already Has:**
- ✅ `ImageCache` with memory + disk caching
- ✅ `isLoadingIngredients` state
- ✅ Individual tile loading with spinners
- ✅ Async image loading

**What's Missing:**
- ❌ Loading screen UI
- ❌ Progress tracking
- ❌ Pre-loading strategy
- ❌ Background pre-fetching

**Estimated Work:**
- Loading screen component: ~1-2 hours
- Progress tracking: ~1 hour
- Pre-loading logic: ~2-3 hours
- Testing: ~1 hour
- **Total: ~5-7 hours**

---

## Quick Win Alternative

If you want something faster to implement:

**Add Progress Indicator to MainView:**
- Show at top of screen when `isLoadingIngredients == true`
- Simple progress bar: "Loading assets..."
- Hide when first batch of images loaded
- **Time: ~30 minutes**

This gives immediate feedback without major refactoring.
