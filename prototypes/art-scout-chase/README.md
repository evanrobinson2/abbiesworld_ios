# Art Scout Chase — Standalone Playthrough Prototype

Recasts the classic Carmen Sandiego detective loop as a **2026 Midjourney artwork showcase** a six-year-old can play.

Full experiential write-up: [`docs/minigames/ART_SCOUT_CHASE_PLAYTHROUGH.md`](../../docs/minigames/ART_SCOUT_CHASE_PLAYTHROUGH.md)

## Run

```bash
# from repo root
python3 -m http.server 8765 --directory prototypes/art-scout-chase
# open http://127.0.0.1:8765/
```

Or open `index.html` directly in a browser.

## Agent / textual playthrough

Open with `?debug=1` to show the live JSON overlay.

In the browser console:

```js
await ArtScout.autoPlay()
// expect ArtScout.state.beat === "celebrate"
// expect ArtScout.state.tricksterFound === true
```

State is always on `window.ArtScout.state` (and `#debug-state` when `?debug=1`).

## Scope

This slice covers **UI · artwork · interaction** for one complete case.  
No progression, ranks, economy, or persistence.
