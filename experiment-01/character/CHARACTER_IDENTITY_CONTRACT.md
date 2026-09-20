# Character Identity Contract: Pip Starling

This document specifies exactly what must remain consistent across all generated frames.

## IMMUTABLE PROPERTIES (Must Not Drift)

### Proportions
| Element | Specification |
|---------|---------------|
| Head-to-body ratio | ~1/3 to 1/4 of total height |
| Head shape | Round/oval, wider than tall |
| Torso length | Short, ~15% of total height |
| Arm length | Medium, reaching mid-thigh |
| Leg length | ~45-50% of total height |
| Feet/boots | Small, ~8% of total height |

### Hair
| Property | Specification |
|----------|---------------|
| Color | Coral/terracotta (#D4654A approximate) |
| Direction | Flows BACKWARD (windswept) |
| Major shapes | 2-3 distinct geometric flowing shapes |
| Front detail | Small spiky bangs over forehead |
| Profile | Large flowing mass extending backward |

### Face
| Property | Specification |
|----------|---------------|
| Eye size | Large, ~1/3 of face width |
| Eye color | Dark brown/black |
| Eye shape | Round with highlights |
| Nose | Small, simple |
| Mouth | Small, expressive |
| Ears | Small, partially visible |

### Skin
| Property | Specification |
|----------|---------------|
| Tone | Warm medium (#E8B89A approximate) |
| Shading | Subtle warm shadows |

### Costume
| Element | Specification |
|---------|---------------|
| Shirt | Loose, mustard/ochre yellow (#D4A534 approximate) |
| Shirt style | Short sleeves, simple neckline |
| Pants | Soft teal (#4A8B8B approximate), full length |
| Boots | Brown, sturdy, simple (#8B5A2B approximate) |
| Backpack | Brown rounded shape, simple straps |

### Style
| Property | Specification |
|----------|---------------|
| Outline | Dark, confident, consistent weight |
| Shading | Flat color with subtle cel shadows |
| Rendering | 2D animated storybook quality |
| Detail level | Simplified, animation-friendly |

## MUTABLE PROPERTIES (May Change with Pose)

- Limb positions
- Head tilt
- Facial expression
- Hair secondary motion (slight flow variation acceptable)
- Clothing fold/drape based on pose
- Backpack strap position

## DETAILS THAT MUST NOT APPEAR

- Additional accessories (hats, glasses, jewelry)
- Pattern on clothing
- Complex textures
- Background elements on character
- Different clothing items
- Wings, tails, or other additions

## CONSISTENCY ANCHORS

When generating a new pose, verify:
1. Hair flows backward (not forward, not straight up)
2. Yellow shirt is visible
3. Teal pants are visible  
4. Backpack is present (in views where visible)
5. Brown boots are present
6. Head size ratio is maintained
7. Art style matches (outlines, flat color, cel shading)

## PALETTE REFERENCE

```
Hair:     #D4654A (coral/terracotta)
Skin:     #E8B89A (warm medium)
Shirt:    #D4A534 (mustard/ochre)
Pants:    #4A8B8B (soft teal)
Boots:    #8B5A2B (brown)
Backpack: #8B5A2B (brown)
Eyes:     #2C2C2C (dark brown/black)
Outline:  #3C2415 (dark brown)
```

## REFERENCE IMAGES

- `model-sheet.png` - Canonical turnaround (front, profile, 3/4, rear)
- `expression-study.png` - Face consistency reference
- `canonical-silhouette.png` - Proportion reference
