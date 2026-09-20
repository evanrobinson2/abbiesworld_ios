# Abbie Assets Animation Lab

Interactive web-based explorer for Abbie's 2D skeletal animation assets extracted from `abbie_assets_animation_effect.unitypackage`.

## Live Demo

**[https://abbie-assets-lab.vercel.app](https://abbie-assets-lab.vercel.app)**

## What's Inside

### Character Parts (24 sprites)
- **Head**: 3 face variants, 2 front hair pieces, 1 back hair
- **Body**: Upper, middle, lower front, lower back segments
- **Arms**: Upper arm, lower arm, 3 hand variants (open, close 1, close 2)
- **Legs**: Upper leg, lower leg, foot
- **Accessories**: 4 wand variants

### Effects (9 sprites)
- **Magic Effects**: Bubble, Heart, Star
- **Slash Animation**: 6-frame attack effect

### Unity Animations
The original package contains these animation clips:
- Character: idle, move, attack, dodge, duck, hurt, jump (start/midair/land)
- Effects: bubble, heart, star animations

## Features

1. **Parts Gallery** - Browse all character parts by category (head, body, arms, legs, wand)
2. **Character Assembly** - Drag-and-drop parts to position them, adjust scale and rotation
3. **Slash Animation** - Play/pause the 6-frame slash effect with adjustable FPS
4. **Effects Gallery** - View the magic effect sprites with pulsing animation

## Local Development

```bash
cd lab-page/public
python3 -m http.server 8080
```

Then open http://localhost:8080

## Deployment

Deployed to Vercel as a static site:

```bash
cd lab-page/public
npx vercel deploy
```
