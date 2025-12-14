# Style Assets Request for Art/Server Team

**Date:** December 2025  
**App:** abbies.world.ios  
**Purpose:** Replace placeholder style tiles with actual style reference images

---

## Current Status

The app currently displays **placeholder tiles** with blue architectural lines for all style options. These placeholders are functional but need to be replaced with actual style reference images to provide users with visual examples of each artistic style.

**Current Placeholder Appearance:**
- Dark blue background (RGB: 0.1, 0.2, 0.4)
- Light blue architectural/geometric lines (RGB: 0.4, 0.6, 0.9)
- Style name text overlay at bottom
- Short description overlay at top (temporary)

**Location in App:**
- View Mode: "4 Carousels" (Settings → View Mode)
- 4th carousel at bottom of screen
- All styles are currently selectable and functional

---

## Critical: Asset Matching Requirements

**IMPORTANT:** The app uses a specific ID pattern to match styles. Assets must be named correctly to ensure proper matching.

### Current App ID Pattern
- **Style IDs in app:** `style_{idSuffix}` (e.g., `style_crayon`, `style_watercolor`, `style_oil_painting`)
- **Example:** The "Crayon" style has ID `style_crayon` in the app code

### Required API Response Format

The API endpoint `/api/assets/styles` should return assets with:

1. **`name` field:** Must match the `idSuffix` exactly (e.g., `"crayon.png"`, `"watercolor.png"`, `"oil_painting.png"`)
   - This is used to construct the style ID as `style_{name without .png}`
   - Example: `name: "crayon.png"` → app creates ID `style_crayon`

2. **`url` field:** Full path to the asset (e.g., `"/static/assets/styles/crayon.png"`)

3. **`type` field:** Should be `"styles"` (or `"art_style"` if that's the convention)

### Example API Response

```json
{
  "type": "styles",
  "assets": [
    {
      "name": "crayon.png",
      "type": "styles",
      "url": "/static/assets/styles/crayon.png",
      "size": 125000,
      "mime_type": "image/png",
      "modified": "2025-12-13T00:00:00Z"
    },
    {
      "name": "watercolor.png",
      "type": "styles",
      "url": "/static/assets/styles/watercolor.png",
      "size": 130000,
      "mime_type": "image/png",
      "modified": "2025-12-13T00:00:00Z"
    },
    {
      "name": "oil_painting.png",
      "type": "styles",
      "url": "/static/assets/styles/oil_painting.png",
      "size": 140000,
      "mime_type": "image/png",
      "modified": "2025-12-13T00:00:00Z"
    }
  ],
  "count": 84
}
```

### How Matching Works

**Current Status:** The app currently uses hardcoded style definitions with prompts. When assets are available, we'll update the code to:

1. **API returns asset** with `name: "crayon.png"`
2. **App extracts idSuffix** by removing `.png` → `"crayon"`
3. **App creates Ingredient** with:
   - `id: "style_crayon"` (matches existing hardcoded pattern - **special handling for styles**, not using generic `createIngredientsFromAssets`)
   - `name: "Crayon"` (looked up from hardcoded display names, or derived from filename)
   - `imageURL: "http://abbies.world:8000/static/assets/styles/crayon.png"`
4. **App matches to style prompts** using the ID `style_crayon` to get the detailed description from the existing `stylePrompts` dictionary

**Note:** The app will need a code update to handle styles specially (since they use `"style_"` prefix instead of `"styles_"` prefix like other asset types). This is a simple change - we'll create a `createStyleIngredientsFromAssets` function that extracts the idSuffix and creates IDs as `"style_\(idSuffix)"` to match the existing prompts dictionary.

### Why This Matters

The app maintains a `stylePrompts` dictionary keyed by style ID (e.g., `"style_crayon"` → detailed prompt string). When a user selects a style, the app:
1. Gets the selected style's ID (e.g., `style_crayon`)
2. Looks up the detailed prompt from `stylePrompts["style_crayon"]`
3. Sends that prompt to the image generation API

If the asset `name` doesn't match the expected `idSuffix`, the app won't be able to match the asset to the existing style definitions and prompts.

---

## Style Assets Needed

We need **reference images** for each of the following **84 styles**. Each image should visually represent the artistic style and be suitable for use as a carousel tile (square aspect ratio recommended, ~512x512px or higher).

### Asset Naming Convention

**Format:** `{idSuffix}.png`  
**Location:** `/static/assets/styles/` (or as specified by server team)

**Example:** `crayon.png`, `charcoal.png`, `watercolor.png`, `oil_painting.png`

**Naming Rules:**
- All lowercase
- Use underscores for multi-word styles (e.g., `oil_painting.png`, `japanese_woodblock.png`)
- Special characters like `&` become `_` (e.g., `pen_ink.png`)
- Numbers at start are preserved (e.g., `3d_render.png`)
- **CRITICAL:** The filename (without `.png`) must exactly match the `idSuffix` in the complete list below

---

## Complete Style List (84 Total)

Each style entry shows:
- **Display Name:** What users see in the UI
- **Filename:** What the asset file should be named (`{idSuffix}.png`)
- **ID in App:** What the app expects (`style_{idSuffix}`)
- **Description:** The detailed prompt used for image generation

### Traditional Drawing Media (8 styles)
1. **Crayon** → `crayon.png` → ID: `style_crayon` - Bold, vibrant colors, childlike simplicity, visible waxy texture
2. **Charcoal** → `charcoal.png` → ID: `style_charcoal` - Rich blacks, soft grays, smudged edges, dramatic contrast
3. **Pencil** → `pencil.png` → ID: `style_pencil` - Fine lines, cross-hatching, detailed shading, graphite texture
4. **Ink Wash** → `ink_wash.png` → ID: `style_ink_wash` - Flowing brushstrokes, varying opacity, elegant simplicity
5. **Pen & Ink** → `pen_ink.png` → ID: `style_pen_ink` - Precise lines, stippling, intricate detail
6. **Pastel** → `pastel.png` → ID: `style_pastel` - Velvety texture, vibrant colors, delicate blending
7. **Chalk** → `chalk.png` → ID: `style_chalk` - Powdery texture, vibrant colors, soft blendable strokes
8. **Marker** → `marker.png` → ID: `style_marker` - Bold, saturated colors, clean lines, graphic style

### Traditional Painting Media (6 styles)
9. **Watercolor** → `watercolor.png` → ID: `style_watercolor` - Soft, flowing colors, translucent washes, organic blending
10. **Oil Painting** → `oil_painting.png` → ID: `style_oil_painting` - Rich, saturated colors, visible brushstrokes, classical technique
11. **Acrylic** → `acrylic.png` → ID: `style_acrylic` - Bold, opaque colors, thick impasto texture, modern vibrancy
12. **Gouache** → `gouache.png` → ID: `style_gouache` - Matte finish, opaque colors, smooth flat application
13. **Tempera** → `tempera.png` → ID: `style_tempera` - Egg-based medium, bright colors, fine detail
14. **Fresco** → `fresco.png` → ID: `style_fresco` - Earthy tones, wall texture, classical mural technique

### Digital & Modern Media (6 styles)
15. **Pixel Art** → `pixel_art.png` → ID: `style_pixel_art` - Blocky, retro aesthetic, limited color palette, 8-bit charm
16. **Vector Art** → `vector_art.png` → ID: `style_vector_art` - Clean lines, flat colors, scalable graphic design
17. **3D Render** → `3d_render.png` → ID: `style_3d_render` - Realistic lighting, depth, computer-generated precision
18. **Digital Painting** → `digital_painting.png` → ID: `style_digital_painting` - Smooth blending, vibrant colors, modern artistic technique
19. **Glitch Art** → `glitch_art.png` → ID: `style_glitch_art` - Digital artifacts, color shifts, intentional data corruption aesthetic
20. **Holographic** → `holographic.png` → ID: `style_holographic` - Iridescent colors, rainbow shimmer, futuristic appearance

### Artistic Movements & Periods (11 styles)
21. **Impressionist** → `impressionist.png` → ID: `style_impressionist` - Loose brushstrokes, light effects, visible texture
22. **Cubist** → `cubist.png` → ID: `style_cubist` - Geometric shapes, fragmented forms, multiple perspectives
23. **Surrealist** → `surrealist.png` → ID: `style_surrealist` - Dreamlike imagery, impossible scenes, symbolic elements
24. **Pop Art** → `pop_art.png` → ID: `style_pop_art` - Bold colors, commercial aesthetic, graphic design elements
25. **Art Nouveau** → `art_nouveau.png` → ID: `style_art_nouveau` - Flowing lines, organic forms, decorative elegance
26. **Art Deco** → `art_deco.png` → ID: `style_art_deco` - Geometric patterns, luxurious materials, 1920s glamour
27. **Expressionist** → `expressionist.png` → ID: `style_expressionist` - Emotional intensity, distorted forms, bold colors
28. **Minimalist** → `minimalist.png` → ID: `style_minimalist` - Simple forms, limited palette, essential elements only
29. **Abstract** → `abstract.png` → ID: `style_abstract` - Non-representational forms, colors, and shapes
30. **Renaissance** → `renaissance.png` → ID: `style_renaissance` - Classical composition, realistic detail, harmonious colors
31. **Baroque** → `baroque.png` → ID: `style_baroque` - Dramatic lighting, rich colors, dynamic movement

### Cultural & Regional Styles (7 styles)
32. **Japanese Woodblock** → `japanese_woodblock.png` → ID: `style_japanese_woodblock` - Flat colors, bold outlines, traditional ukiyo-e style
33. **Chinese Ink** → `chinese_ink.png` → ID: `style_chinese_ink` - Flowing brushwork, monochrome elegance, calligraphic strokes
34. **Aboriginal Dot** → `aboriginal_dot.png` → ID: `style_aboriginal_dot` - Intricate patterns, earthy colors, traditional symbolism
35. **Mexican Mural** → `mexican_mural.png` → ID: `style_mexican_mural` - Bold colors, social themes, monumental scale
36. **African Textile** → `african_textile.png` → ID: `style_african_textile` - Geometric designs, vibrant colors, cultural motifs
37. **Scandinavian Folk** → `scandinavian_folk.png` → ID: `style_scandinavian_folk` - Floral patterns, bright colors, traditional design
38. **Islamic Geometric** → `islamic_geometric.png` → ID: `style_islamic_geometric` - Intricate patterns, symmetry, mathematical precision

### Textures & Surfaces (8 styles)
39. **Mosaic** → `mosaic.png` → ID: `style_mosaic` - Tiled pieces, vibrant colors, textured surface
40. **Stained Glass** → `stained_glass.png` → ID: `style_stained_glass` - Bold outlines, jewel tones, luminous transparency
41. **Embroidery** → `embroidery.png` → ID: `style_embroidery` - Thread texture, decorative stitches, textile artistry
42. **Collage** → `collage.png` → ID: `style_collage` - Layered paper, mixed media, textured composition
43. **Wood Grain** → `wood_grain.png` → ID: `style_wood_grain` - Natural patterns, warm tones, organic lines
44. **Marble** → `marble.png` → ID: `style_marble` - Veined patterns, polished surface, classical elegance
45. **Fabric** → `fabric.png` → ID: `style_fabric` - Woven patterns, soft folds, textile quality
46. **Metal** → `metal.png` → ID: `style_metal` - Reflective shine, industrial aesthetic, cool tones

### Moods & Atmospheres (8 styles)
47. **Dreamy** → `dreamy.png` → ID: `style_dreamy` - Soft focus, pastel colors, ethereal quality
48. **Dramatic** → `dramatic.png` → ID: `style_dramatic` - High contrast, shadows, cinematic intensity
49. **Ethereal** → `ethereal.png` → ID: `style_ethereal` - Glowing light, translucent forms, otherworldly beauty
50. **Nostalgic** → `nostalgic.png` → ID: `style_nostalgic` - Warm tones, vintage aesthetic, sentimental atmosphere
51. **Whimsical** → `whimsical.png` → ID: `style_whimsical` - Playful elements, bright colors, lighthearted charm
52. **Mysterious** → `mysterious.png` → ID: `style_mysterious` - Dark tones, shadows, enigmatic mood
53. **Serene** → `serene.png` → ID: `style_serene` - Calm colors, peaceful composition, tranquil atmosphere
54. **Energetic** → `energetic.png` → ID: `style_energetic` - Dynamic movement, vibrant colors, lively composition

### Blended & Hybrid Styles (5 styles)
55. **Watercolor + Ink** → `watercolor_ink.png` → ID: `style_watercolor_ink` - Watercolor washes combined with ink outlines
56. **Charcoal + Pastel** → `charcoal_pastel.png` → ID: `style_charcoal_pastel` - Rich blacks, vibrant colors, mixed media texture
57. **Digital + Traditional** → `digital_traditional.png` → ID: `style_digital_traditional` - Modern tools with classical aesthetics
58. **Photorealistic** → `photorealistic.png` → ID: `style_photorealistic` - Camera-like precision, lifelike detail, photographic quality
59. **Painterly Photo** → `painterly_photo.png` → ID: `style_painterly_photo` - Artistic brushstrokes applied to photographic realism

### Special Effects & Techniques (10 styles)
60. **Double Exposure** → `double_exposure.png` → ID: `style_double_exposure` - Layered images, transparency, dreamlike merging
61. **Silhouette** → `silhouette.png` → ID: `style_silhouette` - Dark forms against light background, dramatic contrast
62. **High Contrast** → `high_contrast.png` → ID: `style_high_contrast` - Stark blacks and whites, bold definition, graphic impact
63. **Sepia Tone** → `sepia_tone.png` → ID: `style_sepia_tone` - Warm browns, vintage aesthetic, nostalgic quality
64. **Black & White** → `black_white.png` → ID: `style_black_white` - Grayscale tones, timeless elegance, classic composition
65. **Vintage** → `vintage.png` → ID: `style_vintage` - Aged colors, film grain, retro charm
66. **Neon** → `neon.png` → ID: `style_neon` - Glowing colors, dark backgrounds, electric vibrancy
67. **Grunge** → `grunge.png` → ID: `style_grunge` - Distressed textures, muted colors, raw edgy aesthetic
68. **Vaporwave** → `vaporwave.png` → ID: `style_vaporwave` - Retro-futuristic colors, geometric shapes, nostalgic digital art
69. **Cyberpunk** → `cyberpunk.png` → ID: `style_cyberpunk` - Neon lights, dark urban atmosphere, futuristic technology

### Nature-Inspired (4 styles)
70. **Botanical** → `botanical.png` → ID: `style_botanical` - Scientific detail, natural colors, precise rendering
71. **Underwater** → `underwater.png` → ID: `style_underwater` - Blue-green tones, light refraction, aquatic atmosphere
72. **Forest** → `forest.png` → ID: `style_forest` - Dappled light, green tones, natural textures
73. **Ocean** → `ocean.png` → ID: `style_ocean` - Blues, movement, vast horizon

### Abstract Concepts (5 styles)
74. **Liquid** → `liquid.png` → ID: `style_liquid` - Flowing shapes, transparency, organic movement
75. **Crystalline** → `crystalline.png` → ID: `style_crystalline` - Geometric facets, refraction, prismatic colors
76. **Smoke** → `smoke.png` → ID: `style_smoke` - Wispy forms, ethereal quality, atmospheric texture
77. **Fire** → `fire.png` → ID: `style_fire` - Warm colors, dynamic movement, luminous intensity
78. **Ice** → `ice.png` → ID: `style_ice` - Cool tones, crystalline structure, frozen translucency

### Artistic Flair & Unique Styles (6 styles)
79. **Sketchy** → `sketchy.png` → ID: `style_sketchy` - Loose lines, visible construction marks, unfinished quality
80. **Polished** → `polished.png` → ID: `style_polished` - Smooth surfaces, refined detail, professional quality
81. **Textured** → `textured.png` → ID: `style_textured` - Visible material quality, tactile appearance, rich detail
82. **Flat Design** → `flat_design.png` → ID: `style_flat_design` - Simple shapes, bold colors, minimal depth
83. **Isometric** → `isometric.png` → ID: `style_isometric` - 3D forms, geometric precision, technical illustration
84. **Low Poly** → `low_poly.png` → ID: `style_low_poly` - Geometric shapes, faceted surfaces, modern minimalist aesthetic

---

## Technical Requirements

### Image Specifications
- **Format:** PNG (with transparency preferred)
- **Dimensions:** Square aspect ratio (512x512px minimum, 1024x1024px recommended)
- **File Size:** Optimized for web/mobile (target: <500KB per image)
- **Color Space:** sRGB
- **Transparency:** Optional (can have transparent background or solid background)

### Content Guidelines
- Each image should be a **visual example** that clearly represents the artistic style
- Images should be **kid-friendly** and appropriate for a children's app
- Style should be **visually distinct** and recognizable
- Can be abstract representations, sample artwork, or style demonstrations
- Should work well at small sizes (carousel tiles are ~180x180px on screen)

### File Naming
- Use the `idSuffix` from the list above (e.g., `crayon.png`, `watercolor.png`)
- All lowercase, underscores for multi-word styles (e.g., `oil_painting.png`, `japanese_woodblock.png`)
- Special characters: Use underscores (e.g., `pen_ink.png`, `watercolor_ink.png`)
- **CRITICAL:** Filename must exactly match the `idSuffix` shown in the list above

---

## Server Integration

### Expected API Structure

Once assets are ready, we'll need:

1. **Asset Base URL:** `/static/assets/styles/` (or as specified)

2. **API Endpoint:** `/api/assets/styles` (following existing pattern)
   - Should return array of assets similar to `/api/assets/friends`, `/api/assets/outfits`, etc.

3. **Asset Metadata Format:**
   ```json
   {
     "type": "styles",
     "assets": [
       {
         "name": "crayon.png",
         "type": "styles",
         "url": "/static/assets/styles/crayon.png",
         "size": 125000,
         "mime_type": "image/png",
         "modified": "2025-12-13T00:00:00Z"
       }
     ],
     "count": 84
   }
   ```

### Current Implementation

The app currently:
- Loads styles as placeholder `Ingredient` objects with `imageURL: nil`
- Uses `StylePlaceholderTile` component to display blue architectural line placeholders
- Passes style as **text description** to the image generation API (not as reference image)
- Maintains a `stylePrompts` dictionary mapping style IDs to detailed prompts

### After Assets Are Available

We'll need to:
1. Update `MainViewModel.loadStyleItems()` to load from API instead of hardcoded list
2. **Create special function** `createStyleIngredientsFromAssets()` that:
   - Extracts `idSuffix` from asset `name` (removes `.png`)
   - Creates IDs as `"style_\(idSuffix)"` (not `"styles_\(asset.name)"` like the generic function)
   - Looks up display name from existing hardcoded styles dictionary (or derives from filename)
   - Sets `imageURL` from the asset
3. Match loaded assets to existing `stylePrompts` dictionary using the style ID (e.g., `stylePrompts["style_crayon"]`)
4. Remove `StylePlaceholderTile` usage (or make it fallback only)
5. Update carousel to display actual style images
6. Optionally: Switch style from text description to reference image modality (if desired)

**Code Change Required:** Yes, but it's straightforward - just need to handle styles with the `"style_"` prefix instead of the generic `"\(assetType)_\(asset.name)"` pattern.

---

## Verification Script

A verification script is included (`scripts/verify_style_assets.sh`) to:
- Check that all 84 style assets are available
- Verify file naming matches expected convention
- Test API endpoint accessibility
- Generate a report of missing assets

**Usage:**
```bash
./scripts/verify_style_assets.sh [base_url] [asset_path]
# Example:
./scripts/verify_style_assets.sh http://abbies.world:8000 /static/assets/styles
```

---

## Priority

**High Priority:** All 84 styles are currently displayed in the app with placeholders. Users can see and select them, so having actual assets will significantly improve the user experience.

**Timeline:** No hard deadline, but the sooner assets are available, the sooner we can replace placeholders and improve the visual experience.

---

## Questions for Server Team

1. What will be the final asset base path? (e.g., `/static/assets/styles/`)
2. Will there be an API endpoint at `/api/assets/styles` following the existing pattern?
3. **CRITICAL:** Will the API return assets with `name` field matching the filenames exactly (e.g., `"crayon.png"`, `"oil_painting.png"`)?
4. What is the expected timeline for asset delivery?
5. Should we expect all assets at once, or will they be delivered in batches?
6. Are there any specific requirements or constraints we should be aware of?

---

**Contact:** Please respond with:
- Asset base URL/path
- API endpoint details (if different from expected)
- Confirmation that asset `name` field will match the filename pattern shown above
- Timeline for delivery
- Any changes to naming convention

Thank you!
