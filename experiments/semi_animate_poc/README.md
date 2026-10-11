# Semi-animate POC — **CRACKWARE**

> **Grade: crackware.** First branch only. Proves wiring, not a shippable look.
> The Luma free-tier watermark is unacceptable for Abbie. Do not playtest this
> ambient plate with her; do not treat `map.artGarden.ambient` v1 as production.

Compare Midjourney-style “animate a still” options for Abbie’s World scenes.

## Shared source

- `source/scene.png` — Scene Builder sample cook still
- `source/scene_bg.jpg` — Art Garden overland

## Prompt (cloud runs)

Use the same motion brief everywhere:

> Subtle ambient living scene. Soft breeze in foliage and fabric, gentle light flicker, tiny camera breathe. Keep composition locked to the starting image. No new characters, no camera cut, seamless loop energy.

Motion: **low**. Prefer **loop** when available.

## Matrix

| Lane | Free / no-CC path | Status |
|------|-------------------|--------|
| Client CSS | local HTML | done (`client/index.html`) |
| Luma (app export) | free web tier (**watermark**) | **crackware** — Art Garden ambient v1 |
| Kling | free web credits | not run yet |
| Runway | free plan 125 one-time credits | not run yet |
| Midjourney Animate | **no free path** (paid Basic+) | blocked without CC |
| OpenAI Image API | stills only | N/A for animate |
| OpenAI Videos (Sora) | image `input_reference` | **API sunset 2026-09-24** — skip for product |
| Luma **API** | needs funded `platform.lumalabs.ai` balance | blocked at $0 |

### Art Garden ambient v1 — crackware

- Semantic ID: `map.artGarden.ambient`
- Registry key: `maps/art-garden/ambient`
- Source: `AssetSources/World2/user-supplied/artGarden/v1/` (`grade: crackware`, `shippable: false`)
- Runtime: `Resources/World2/world2_map_artGarden_ambient.mp4`
- Still poster remains `map.artGarden` / `world2_map_artGarden` (normal / kid path)
- Ambient loop plays only in **developer mode** so crackware never hits the kid surface by default

## How to review client POC

```bash
cd experiments/semi_animate_poc
# Port 8765 may already be meshy_actor — ask before binding another port.
python3 -m http.server 8766
# open http://127.0.0.1:8766/client/
```

## Outputs

Drop downloaded MP4s into:

- `outputs/luma/`
- `outputs/kling/`
- `outputs/runway/`
- `outputs/midjourney/` (if paid later)

Then note: loop seam quality, identity drift, latency, watermark, kid-safe moderation.
