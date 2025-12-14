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

---

## Style Assets Needed

We need **reference images** for each of the following **84 styles**. Each image should visually represent the artistic style and be suitable for use as a carousel tile (square aspect ratio recommended, ~512x512px or higher).

### Asset Naming Convention

**Format:** `{idSuffix}.png`  
**Location:** `/static/assets/styles/` (or as specified by server team)

**Example:** `crayon.png`, `charcoal.png`, `watercolor.png`

---

## Complete Style List

### Traditional Drawing Media (8 styles)
1. **Crayon** (`crayon.png`)
   - ID: `style_crayon`
   - Description: Bold, vibrant colors, childlike simplicity, visible waxy texture

2. **Charcoal** (`charcoal.png`)
   - ID: `style_charcoal`
   - Description: Rich blacks, soft grays, smudged edges, dramatic contrast

3. **Pencil** (`pencil.png`)
   - ID: `style_pencil`
   - Description: Fine lines, cross-hatching, detailed shading, graphite texture

4. **Ink Wash** (`ink_wash.png`)
   - ID: `style_ink_wash`
   - Description: Flowing brushstrokes, varying opacity, elegant simplicity

5. **Pen & Ink** (`pen_ink.png`)
   - ID: `style_pen_ink`
   - Description: Precise lines, stippling, intricate detail

6. **Pastel** (`pastel.png`)
   - ID: `style_pastel`
   - Description: Velvety texture, vibrant colors, delicate blending

7. **Chalk** (`chalk.png`)
   - ID: `style_chalk`
   - Description: Powdery texture, vibrant colors, soft blendable strokes

8. **Marker** (`marker.png`)
   - ID: `style_marker`
   - Description: Bold, saturated colors, clean lines, graphic style

### Traditional Painting Media (6 styles)
9. **Watercolor** (`watercolor.png`)
   - ID: `style_watercolor`
   - Description: Soft, flowing colors, translucent washes, organic blending

10. **Oil Painting** (`oil_painting.png`)
    - ID: `style_oil_painting`
    - Description: Rich, saturated colors, visible brushstrokes, classical technique

11. **Acrylic** (`acrylic.png`)
    - ID: `style_acrylic`
    - Description: Bold, opaque colors, thick impasto texture, modern vibrancy

12. **Gouache** (`gouache.png`)
    - ID: `style_gouache`
    - Description: Matte finish, opaque colors, smooth flat application

13. **Tempera** (`tempera.png`)
    - ID: `style_tempera`
    - Description: Egg-based medium, bright colors, fine detail

14. **Fresco** (`fresco.png`)
    - ID: `style_fresco`
    - Description: Earthy tones, wall texture, classical mural technique

### Digital & Modern Media (6 styles)
15. **Pixel Art** (`pixel_art.png`)
    - ID: `style_pixel_art`
    - Description: Blocky, retro aesthetic, limited color palette, 8-bit charm

16. **Vector Art** (`vector_art.png`)
    - ID: `style_vector_art`
    - Description: Clean lines, flat colors, scalable graphic design

17. **3D Render** (`3d_render.png`)
    - ID: `style_3d_render`
    - Description: Realistic lighting, depth, computer-generated precision

18. **Digital Painting** (`digital_painting.png`)
    - ID: `style_digital_painting`
    - Description: Smooth blending, vibrant colors, modern artistic technique

19. **Glitch Art** (`glitch_art.png`)
    - ID: `style_glitch_art`
    - Description: Digital artifacts, color shifts, intentional data corruption aesthetic

20. **Holographic** (`holographic.png`)
    - ID: `style_holographic`
    - Description: Iridescent colors, rainbow shimmer, futuristic appearance

### Artistic Movements & Periods (10 styles)
21. **Impressionist** (`impressionist.png`)
    - ID: `style_impressionist`
    - Description: Loose brushstrokes, light effects, visible texture

22. **Cubist** (`cubist.png`)
    - ID: `style_cubist`
    - Description: Geometric shapes, fragmented forms, multiple perspectives

23. **Surrealist** (`surrealist.png`)
    - ID: `style_surrealist`
    - Description: Dreamlike imagery, impossible scenes, symbolic elements

24. **Pop Art** (`pop_art.png`)
    - ID: `style_pop_art`
    - Description: Bold colors, commercial aesthetic, graphic design elements

25. **Art Nouveau** (`art_nouveau.png`)
    - ID: `style_art_nouveau`
    - Description: Flowing lines, organic forms, decorative elegance

26. **Art Deco** (`art_deco.png`)
    - ID: `style_art_deco`
    - Description: Geometric patterns, luxurious materials, 1920s glamour

27. **Expressionist** (`expressionist.png`)
    - ID: `style_expressionist`
    - Description: Emotional intensity, distorted forms, bold colors

28. **Minimalist** (`minimalist.png`)
    - ID: `style_minimalist`
    - Description: Simple forms, limited palette, essential elements only

29. **Abstract** (`abstract.png`)
    - ID: `style_abstract`
    - Description: Non-representational forms, colors, and shapes

30. **Renaissance** (`renaissance.png`)
    - ID: `style_renaissance`
    - Description: Classical composition, realistic detail, harmonious colors

31. **Baroque** (`baroque.png`)
    - ID: `style_baroque`
    - Description: Dramatic lighting, rich colors, dynamic movement

### Cultural & Regional Styles (7 styles)
32. **Japanese Woodblock** (`japanese_woodblock.png`)
    - ID: `style_japanese_woodblock`
    - Description: Flat colors, bold outlines, traditional ukiyo-e style

33. **Chinese Ink** (`chinese_ink.png`)
    - ID: `style_chinese_ink`
    - Description: Flowing brushwork, monochrome elegance, calligraphic strokes

34. **Aboriginal Dot** (`aboriginal_dot.png`)
    - ID: `style_aboriginal_dot`
    - Description: Intricate patterns, earthy colors, traditional symbolism

35. **Mexican Mural** (`mexican_mural.png`)
    - ID: `style_mexican_mural`
    - Description: Bold colors, social themes, monumental scale

36. **African Textile** (`african_textile.png`)
    - ID: `style_african_textile`
    - Description: Geometric designs, vibrant colors, cultural motifs

37. **Scandinavian Folk** (`scandinavian_folk.png`)
    - ID: `style_scandinavian_folk`
    - Description: Floral patterns, bright colors, traditional design

38. **Islamic Geometric** (`islamic_geometric.png`)
    - ID: `style_islamic_geometric`
    - Description: Intricate patterns, symmetry, mathematical precision

### Textures & Surfaces (8 styles)
39. **Mosaic** (`mosaic.png`)
    - ID: `style_mosaic`
    - Description: Tiled pieces, vibrant colors, textured surface

40. **Stained Glass** (`stained_glass.png`)
    - ID: `style_stained_glass`
    - Description: Bold outlines, jewel tones, luminous transparency

41. **Embroidery** (`embroidery.png`)
    - ID: `style_embroidery`
    - Description: Thread texture, decorative stitches, textile artistry

42. **Collage** (`collage.png`)
    - ID: `style_collage`
    - Description: Layered paper, mixed media, textured composition

43. **Wood Grain** (`wood_grain.png`)
    - ID: `style_wood_grain`
    - Description: Natural patterns, warm tones, organic lines

44. **Marble** (`marble.png`)
    - ID: `style_marble`
    - Description: Veined patterns, polished surface, classical elegance

45. **Fabric** (`fabric.png`)
    - ID: `style_fabric`
    - Description: Woven patterns, soft folds, textile quality

46. **Metal** (`metal.png`)
    - ID: `style_metal`
    - Description: Reflective shine, industrial aesthetic, cool tones

### Moods & Atmospheres (8 styles)
47. **Dreamy** (`dreamy.png`)
    - ID: `style_dreamy`
    - Description: Soft focus, pastel colors, ethereal quality

48. **Dramatic** (`dramatic.png`)
    - ID: `style_dramatic`
    - Description: High contrast, shadows, cinematic intensity

49. **Ethereal** (`ethereal.png`)
    - ID: `style_ethereal`
    - Description: Glowing light, translucent forms, otherworldly beauty

50. **Nostalgic** (`nostalgic.png`)
    - ID: `style_nostalgic`
    - Description: Warm tones, vintage aesthetic, sentimental atmosphere

51. **Whimsical** (`whimsical.png`)
    - ID: `style_whimsical`
    - Description: Playful elements, bright colors, lighthearted charm

52. **Mysterious** (`mysterious.png`)
    - ID: `style_mysterious`
    - Description: Dark tones, shadows, enigmatic mood

53. **Serene** (`serene.png`)
    - ID: `style_serene`
    - Description: Calm colors, peaceful composition, tranquil atmosphere

54. **Energetic** (`energetic.png`)
    - ID: `style_energetic`
    - Description: Dynamic movement, vibrant colors, lively composition

### Blended & Hybrid Styles (5 styles)
55. **Watercolor + Ink** (`watercolor_ink.png`)
    - ID: `style_watercolor_ink`
    - Description: Watercolor washes combined with ink outlines

56. **Charcoal + Pastel** (`charcoal_pastel.png`)
    - ID: `style_charcoal_pastel`
    - Description: Rich blacks, vibrant colors, mixed media texture

57. **Digital + Traditional** (`digital_traditional.png`)
    - ID: `style_digital_traditional`
    - Description: Modern tools with classical aesthetics

58. **Photorealistic** (`photorealistic.png`)
    - ID: `style_photorealistic`
    - Description: Camera-like precision, lifelike detail, photographic quality

59. **Painterly Photo** (`painterly_photo.png`)
    - ID: `style_painterly_photo`
    - Description: Artistic brushstrokes applied to photographic realism

### Special Effects & Techniques (10 styles)
60. **Double Exposure** (`double_exposure.png`)
    - ID: `style_double_exposure`
    - Description: Layered images, transparency, dreamlike merging

61. **Silhouette** (`silhouette.png`)
    - ID: `style_silhouette`
    - Description: Dark forms against light background, dramatic contrast

62. **High Contrast** (`high_contrast.png`)
    - ID: `style_high_contrast`
    - Description: Stark blacks and whites, bold definition, graphic impact

63. **Sepia Tone** (`sepia_tone.png`)
    - ID: `style_sepia_tone`
    - Description: Warm browns, vintage aesthetic, nostalgic quality

64. **Black & White** (`black_white.png`)
    - ID: `style_black_white`
    - Description: Grayscale tones, timeless elegance, classic composition

65. **Vintage** (`vintage.png`)
    - ID: `style_vintage`
    - Description: Aged colors, film grain, retro charm

66. **Neon** (`neon.png`)
    - ID: `style_neon`
    - Description: Glowing colors, dark backgrounds, electric vibrancy

67. **Grunge** (`grunge.png`)
    - ID: `style_grunge`
    - Description: Distressed textures, muted colors, raw edgy aesthetic

68. **Vaporwave** (`vaporwave.png`)
    - ID: `style_vaporwave`
    - Description: Retro-futuristic colors, geometric shapes, nostalgic digital art

69. **Cyberpunk** (`cyberpunk.png`)
    - ID: `style_cyberpunk`
    - Description: Neon lights, dark urban atmosphere, futuristic technology

### Nature-Inspired (3 styles)
70. **Botanical** (`botanical.png`)
    - ID: `style_botanical`
    - Description: Scientific detail, natural colors, precise rendering

71. **Underwater** (`underwater.png`)
    - ID: `style_underwater`
    - Description: Blue-green tones, light refraction, aquatic atmosphere

72. **Forest** (`forest.png`)
    - ID: `style_forest`
    - Description: Dappled light, green tones, natural textures

73. **Ocean** (`ocean.png`)
    - ID: `style_ocean`
    - Description: Blues, movement, vast horizon

### Abstract Concepts (5 styles)
74. **Liquid** (`liquid.png`)
    - ID: `style_liquid`
    - Description: Flowing shapes, transparency, organic movement

75. **Crystalline** (`crystalline.png`)
    - ID: `style_crystalline`
    - Description: Geometric facets, refraction, prismatic colors

76. **Smoke** (`smoke.png`)
    - ID: `style_smoke`
    - Description: Wispy forms, ethereal quality, atmospheric texture

77. **Fire** (`fire.png`)
    - ID: `style_fire`
    - Description: Warm colors, dynamic movement, luminous intensity

78. **Ice** (`ice.png`)
    - ID: `style_ice`
    - Description: Cool tones, crystalline structure, frozen translucency

### Artistic Flair & Unique Styles (6 styles)
79. **Sketchy** (`sketchy.png`)
    - ID: `style_sketchy`
    - Description: Loose lines, visible construction marks, unfinished quality

80. **Polished** (`polished.png`)
    - ID: `style_polished`
    - Description: Smooth surfaces, refined detail, professional quality

81. **Textured** (`textured.png`)
    - ID: `style_textured`
    - Description: Visible material quality, tactile appearance, rich detail

82. **Flat Design** (`flat_design.png`)
    - ID: `style_flat_design`
    - Description: Simple shapes, bold colors, minimal depth

83. **Isometric** (`isometric.png`)
    - ID: `style_isometric`
    - Description: 3D forms, geometric precision, technical illustration

84. **Low Poly** (`low_poly.png`)
    - ID: `style_low_poly`
    - Description: Geometric shapes, faceted surfaces, modern minimalist aesthetic

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
     "assets": [
       {
         "id": "style_crayon",
         "name": "Crayon",
         "url": "/static/assets/styles/crayon.png",
         "category": "art_style"
       },
       ...
     ]
   }
   ```

### Current Implementation

The app currently:
- Loads styles as placeholder `Ingredient` objects with `imageURL: nil`
- Uses `StylePlaceholderTile` component to display blue architectural line placeholders
- Passes style as **text description** to the image generation API (not as reference image)

### After Assets Are Available

We'll need to:
1. Update `MainViewModel.loadStyleItems()` to load from API instead of hardcoded list
2. Remove `StylePlaceholderTile` usage (or make it fallback only)
3. Update carousel to display actual style images
4. Optionally: Switch style from text description to reference image modality (if desired)

---

## Verification Script

A verification script is included (`scripts/verify_style_assets.sh`) to:
- Check that all 84 style assets are available
- Verify file naming matches expected convention
- Test API endpoint accessibility
- Generate a report of missing assets

---

## Priority

**High Priority:** All 89 styles are currently displayed in the app with placeholders. Users can see and select them, so having actual assets will significantly improve the user experience.

**Timeline:** No hard deadline, but the sooner assets are available, the sooner we can replace placeholders and improve the visual experience.

---

## Questions for Server Team

1. What will be the final asset base path? (e.g., `/static/assets/styles/`)
2. Will there be an API endpoint at `/api/assets/styles` following the existing pattern?
3. What is the expected timeline for asset delivery?
4. Should we expect all assets at once, or will they be delivered in batches?
5. Are there any specific requirements or constraints we should be aware of?

---

**Contact:** Please respond with:
- Asset base URL/path
- API endpoint details (if different from expected)
- Timeline for delivery
- Any changes to naming convention

Thank you!
