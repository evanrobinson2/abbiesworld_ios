# Prompt Customization Feature - Ideation Document

**Date:** December 2025  
**Feature:** Enhanced Prompt Customization for Image Generation  
**Target Audience:** Children (with varying reading/writing abilities)

---

## Problem Statement

Currently, reference images (friend, outfit, place) are forcing generated outputs to always include borders, limiting visual variety. Users need more control over how images are generated without losing the simplicity that makes the app accessible to children.

---

## Current Architecture

### API Request Structure (`CreateRequest`)
```swift
struct CreateRequest {
    let recipeItems: [RecipeItem]           // Selected ingredient IDs
    let freeTextDescription: String?        // Currently used for style descriptions
    let referenceImageIds: [String]?        // Reference images (friend, outfit, place)
}
```

### Current Flow
1. User selects friend, outfit, place (and optionally style in 4-carousel mode)
2. Reference images are extracted and sent to server
3. Style (if selected) is passed as text in `freeTextDescription`
4. Server generates image using reference images + text description

### The Issue
- Reference images contain borders → AI model copies borders to output
- No way to control border presence
- Limited variety in output styles

---

## Solution Concepts (Child-Friendly)

### Concept 1: Visual Toggle Controls (Simplest - Ages 4-7)

**Idea:** Simple on/off toggles with icons and minimal text

**Controls:**
- 🖼️ **Border Toggle** - "Picture Frame" (on/off)
  - Icon: Frame/border icon
  - Label: "Add Frame" or "No Frame"
  - Default: On (matches current behavior)

- 🎨 **Color Intensity** - "More Colorful" slider
  - Visual slider with emoji indicators
  - Low: 🎨 (normal)
  - High: 🌈 (very colorful)
  - Default: Middle

- ✨ **Detail Level** - "More Details" slider
  - Low: Simple shapes
  - High: Lots of details
  - Default: Middle

**UI Location:** Settings panel → New "Image Style" section

**Implementation:**
- Store preferences in `UserDefaults`
- Append modifiers to `freeTextDescription` when generating
- Example: `"Style: Watercolor. No border. More colorful. More details."`

**Pros:**
- Very simple, no reading required
- Visual and intuitive
- Safe (no user input)

**Cons:**
- Limited customization
- May not solve border issue if it's in reference images

---

### Concept 2: Pre-Written Modifiers (Ages 6-10)

**Idea:** Button-based selection of pre-written prompt modifiers

**Categories:**

1. **Frame Options**
   - "No Frame" → `"no border, no frame"`
   - "Simple Frame" → `"simple border"`
   - "Fancy Frame" → `"ornate decorative border"`

2. **Color Options**
   - "More Colorful" → `"vibrant colors, bright palette"`
   - "Softer Colors" → `"pastel colors, muted tones"`
   - "Black & White" → `"monochrome, grayscale"`

3. **Detail Options**
   - "More Details" → `"highly detailed, intricate"`
   - "Simpler" → `"simple shapes, minimal detail"`
   - "Cartoon Style" → `"cartoon style, simplified forms"`

4. **Mood Options**
   - "Happy & Bright" → `"cheerful, bright atmosphere"`
   - "Calm & Peaceful" → `"serene, peaceful mood"`
   - "Adventurous" → `"dynamic, action-packed"`

**UI:** Grid of colorful buttons with icons + short text labels

**Implementation:**
- User can select multiple modifiers
- Combine into `freeTextDescription`
- Example: `"Style: Watercolor. No border. More colorful. Happy & bright."`

**Pros:**
- More control than toggles
- Still safe (no free text)
- Educational (teaches vocabulary)

**Cons:**
- Requires some reading ability
- Limited to predefined options

---

### Concept 3: Simple Text Input (Ages 8+)

**Idea:** Optional text field for custom prompt additions

**UI:**
- Text field with placeholder: "Add your own ideas (optional)"
- Character limit: 50-100 characters
- Helper text: "Examples: 'no border', 'more sparkles', 'sunny day'"
- Safety: Basic word filter for inappropriate content

**Implementation:**
- Append user text to `freeTextDescription`
- Validate length and content
- Show preview of combined prompt before generation

**Pros:**
- Maximum flexibility
- Encourages creativity
- Educational (writing practice)

**Cons:**
- Requires reading/writing ability
- Needs content moderation
- May be overwhelming for younger kids

---

### Concept 4: Hybrid Approach (Recommended)

**Idea:** Combine Concepts 1 & 2 - Visual toggles + modifier buttons

**Structure:**

```
Settings → Image Style
├── Quick Options (Toggles)
│   ├── 🖼️ Picture Frame: [On/Off]
│   ├── 🎨 More Colorful: [Slider]
│   └── ✨ More Details: [Slider]
│
└── Advanced Options (Buttons)
    ├── Frame Style
    │   ├── [No Frame] [Simple] [Fancy]
    ├── Color Mood
    │   ├── [More Colorful] [Softer] [Black & White]
    ├── Detail Level
    │   ├── [More Details] [Simpler] [Cartoon]
    └── Mood
        ├── [Happy] [Calm] [Adventurous]
```

**Smart Defaults:**
- If "Picture Frame" toggle is OFF → automatically select "No Frame" button
- If "More Colorful" slider is high → automatically select "More Colorful" button
- User can override with button selection

**Implementation:**
- Store preferences in `MainViewModel`
- Combine all selections into `freeTextDescription`
- Show preview of what will be sent

---

## Technical Implementation Plan

### Phase 1: Data Model

**New Model: `PromptCustomization`**
```swift
struct PromptCustomization {
    var borderEnabled: Bool = true
    var borderStyle: BorderStyle = .simple
    var colorIntensity: Float = 0.5  // 0.0 to 1.0
    var detailLevel: Float = 0.5
    var selectedModifiers: Set<String> = []
    var customText: String? = nil
}

enum BorderStyle: String, CaseIterable {
    case none = "no border, no frame"
    case simple = "simple border"
    case fancy = "ornate decorative border"
}
```

**Storage:**
- Store in `UserDefaults` with key `"promptCustomization"`
- Persist across app launches
- Reset to defaults option

### Phase 2: ViewModel Integration

**Update `MainViewModel`:**
```swift
@Published var promptCustomization = PromptCustomization()

func buildFreeTextDescription(
    styleDescription: String?,
    customization: PromptCustomization
) -> String? {
    var parts: [String] = []
    
    // Add style if present
    if let style = styleDescription {
        parts.append(style)
    }
    
    // Add border instruction
    if !customization.borderEnabled {
        parts.append("no border, no frame")
    } else {
        parts.append(customization.borderStyle.rawValue)
    }
    
    // Add color intensity
    if customization.colorIntensity > 0.7 {
        parts.append("vibrant colors, bright palette")
    } else if customization.colorIntensity < 0.3 {
        parts.append("pastel colors, muted tones")
    }
    
    // Add detail level
    if customization.detailLevel > 0.7 {
        parts.append("highly detailed, intricate")
    } else if customization.detailLevel < 0.3 {
        parts.append("simple shapes, minimal detail")
    }
    
    // Add selected modifiers
    parts.append(contentsOf: customization.selectedModifiers)
    
    // Add custom text if present
    if let custom = customization.customText, !custom.isEmpty {
        parts.append(custom)
    }
    
    return parts.isEmpty ? nil : parts.joined(separatedBy: ". ")
}
```

**Update `startImageGeneration()`:**
```swift
let freeTextDescription = buildFreeTextDescription(
    styleDescription: styleDescription,
    customization: promptCustomization
)
```

### Phase 3: Settings UI

**New Component: `PromptCustomizationSection`**
```swift
struct PromptCustomizationSection: View {
    @ObservedObject var viewModel: MainViewModel
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Image Style")
                .font(.headline)
                .padding(.horizontal)
            
            // Quick toggles
            QuickStyleToggles(customization: $viewModel.promptCustomization)
            
            // Modifier buttons
            ModifierButtons(customization: $viewModel.promptCustomization)
            
            // Optional: Custom text (for older kids)
            if showAdvancedOptions {
                CustomTextInput(customization: $viewModel.promptCustomization)
            }
        }
    }
}
```

**Add to `SettingsView.swift`:**
```swift
// After ViewModeSection
PromptCustomizationSection(viewModel: viewModel)
```

### Phase 4: Server-Side Considerations

**Current:** Server receives `freeTextDescription` and processes it

**Potential Issues:**
- Server may ignore text if reference images are strongly weighted
- May need server update to respect "no border" instruction

**Solutions:**
1. **Client-side only:** Add negative prompt: `"no border, no frame"` (if server supports)
2. **Server update:** Request server to respect border instructions
3. **Hybrid:** Use both text instruction + server parameter (if available)

**Recommendation:** Start with client-side text, test effectiveness, then coordinate with server team if needed.

---

## User Experience Flow

### For Young Children (Ages 4-7)
1. Open Settings
2. See colorful toggles and sliders
3. Play with controls (visual feedback)
4. Generate image → see difference
5. Adjust if needed

### For Older Children (Ages 8-12)
1. Open Settings
2. Use toggles for quick changes
3. Select modifier buttons for specific effects
4. Optionally add custom text
5. Preview combined prompt
6. Generate and iterate

---

## Safety & Content Moderation

### For Custom Text Input:
1. **Character Limit:** 50-100 characters max
2. **Word Filter:** Basic profanity filter
3. **Whitelist Approach:** Only allow certain words/phrases (safer)
4. **Parental Control:** Option to disable custom text entirely

### Implementation:
```swift
func validateCustomText(_ text: String) -> (isValid: Bool, error: String?) {
    // Check length
    if text.count > 100 {
        return (false, "Too long! Keep it short.")
    }
    
    // Basic word filter (expandable)
    let blockedWords = ["bad", "hate", ...] // Add as needed
    let lowercased = text.lowercased()
    for word in blockedWords {
        if lowercased.contains(word) {
            return (false, "Please use friendly words!")
        }
    }
    
    return (true, nil)
}
```

---

## Testing Strategy

### Visual Testing
1. Generate image with border ON → verify border appears
2. Generate image with border OFF → verify no border
3. Test each modifier button → verify effect
4. Test slider extremes → verify intensity changes
5. Test combinations → verify multiple modifiers work together

### Edge Cases
1. All modifiers selected → verify prompt doesn't become too long
2. Custom text with special characters → verify encoding
3. Empty custom text → verify no errors
4. Rapid toggling → verify state persists correctly

---

## Future Enhancements

### Phase 2 Features (Post-Launch)
1. **Preset Styles:** Save favorite combinations as "My Styles"
2. **Preview Mode:** Show example images for each modifier
3. **Learning Mode:** Explain what each modifier does
4. **Parent Dashboard:** View child's customization preferences

### Advanced Features
1. **Style Templates:** "Super Colorful", "Minimalist", "Adventure Time"
2. **A/B Testing:** Compare two settings side-by-side
3. **Style History:** Remember what worked well
4. **Community Styles:** Share favorite combinations (with parent approval)

---

## Recommendations

### Immediate (MVP)
✅ **Implement Concept 4 (Hybrid Approach)**
- Quick toggles for border, color, detail
- Modifier buttons for specific effects
- Store in UserDefaults
- Integrate into `freeTextDescription`

### Short-Term (Next Release)
- Add custom text input (with safety)
- Add preset styles
- Improve visual feedback

### Long-Term (Future)
- Server-side parameter support
- Style templates
- Learning/educational features

---

## Open Questions

1. **Server Capability:** Does the server support negative prompts or border control?
   - **Action:** Test with "no border" in `freeTextDescription`
   - **Fallback:** Coordinate with server team for parameter support

2. **Reference Image Issue:** If reference images have borders, will text instruction override?
   - **Action:** Test with various border instructions
   - **Fallback:** May need server to process reference images differently

3. **Age Appropriateness:** What's the target age range?
   - **Action:** Determine primary age group
   - **Impact:** Affects UI complexity and safety features

4. **Parental Controls:** Should parents be able to lock certain settings?
   - **Action:** Discuss with stakeholders
   - **Implementation:** Add settings lock feature if needed

---

## Success Metrics

- **Variety:** Generated images show more visual variety
- **Usage:** Users actively use customization settings
- **Satisfaction:** Users report more control over outputs
- **Safety:** No inappropriate content in custom text (if implemented)

---

## Next Steps

1. **Review & Approve:** Get stakeholder feedback on concepts
2. **Prototype:** Build simple UI mockup in Settings
3. **Test:** Generate images with different settings
4. **Iterate:** Refine based on testing results
5. **Implement:** Build full feature following phases above

---

**Document Status:** Ideation - Ready for Review  
**Last Updated:** December 2025
