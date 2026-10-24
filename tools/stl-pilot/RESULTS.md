# STL pilot results

10 models from Printables (CC0 or CC BY only), cleaned with `stl_pipeline.py` in Blender 4.1 (headless), one model per run. Times are real wall clock on this machine (CPU Cycles bake, no GPU). Triangle counts are triangles.

| Model | Licence | Band | Source tris | Final tris | import | repair | scale | decimate | uv | bake | material | export | total (process) | GLB |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| [Pirate's Treasure Chest - Solid](https://www.printables.com/model/634848-pirates-treasure-chest-solid) | CC BY 4.0 | prop 200-1500 | 74,246 | 896 | 0.0s | 0.3s | 0.0s | 0.4s | 0.7s | 0.9s | 0.0s | 0.3s | 4.0s | 141 KB |
| [Wizard Potion Bottle](https://www.printables.com/model/257760-wizard-potion-bottle) | CC BY 4.0 | prop 200-1500 | 208,680 | 698 | 0.0s | 0.7s | 0.0s | 1.8s | 1.7s | 0.7s | 0.0s | 0.3s | 6.5s | 116 KB |
| [Retro Space Helmet 1](https://www.printables.com/model/885271-retro-space-helmet-1) | CC0 | prop 200-1500 | 58,236 | 1,726 | 0.0s | 0.1s | 0.0s | 0.5s | 2.8s | 0.5s | 0.0s | 0.3s | 5.5s | 198 KB |
| [Parisian Street Lamp](https://www.printables.com/model/873657-parisian-street-lamp) | CC0 | prop 200-1500 | 224,990 | 1,493 | 0.0s | 0.6s | 0.0s | 2.0s | 1.4s | 0.6s | 0.0s | 0.3s | 6.3s | 203 KB |
| [Sci Fi Crate (90mm Single Color: bottom and top)](https://www.printables.com/model/531037-sci-fi-crate) | CC BY 4.0 | prop 200-1500 | 4,980 | 968 | 0.0s | 0.0s | 0.0s | 0.0s | 2.0s | 0.6s | 0.0s | 0.4s | 4.2s | 168 KB |
| [Picnic Table](https://www.printables.com/model/446580-picnic-table) | CC0 | furniture 1-4k | 490 | 490 | 0.0s | 0.0s | 0.0s | 0.0s | 1.1s | 0.5s | 0.0s | 0.3s | 3.2s | 108 KB |
| [the park bench](https://www.printables.com/model/1560190-the-park-bench) | CC0 | furniture 1-4k | 1,499,696 | 3,000 | 0.3s | 74.0s | 0.0s | 18.6s | 0.1s | 1.0s | 0.0s | 0.5s | 96.3s | 186 KB |
| [Low Poly Lighthouse](https://www.printables.com/model/58833-low-poly-lighthouse) | CC BY 4.0 | building 3-12k | 5,128 | 5,000 | 0.0s | 0.0s | 0.0s | 0.0s | 0.9s | 0.3s | 0.0s | 0.3s | 3.0s | 298 KB |
| [Tractor (base body + complete wheels)](https://www.printables.com/model/81929-tractor) | CC BY 4.0 | vehicle 3-12k | 20,830 | 5,996 | 0.0s | 0.0s | 0.0s | 0.1s | 1.0s | 0.3s | 0.0s | 0.4s | 3.2s | 377 KB |
| [Chicken](https://www.printables.com/model/496190-chicken) | CC BY 4.0 | creature 5-15k | 1,110,016 | 8,000 | 0.2s | 3.4s | 0.0s | 18.7s | 1.1s | 1.4s | 0.0s | 0.7s | 27.2s | 271 KB |

Times are the whole Blender process per model (start to exit, including Blender startup and the preview render). The decimate column includes retries. All ten ran on CPU only.

## What failed or needed a workaround

- **Space helmet** (thin printed shell, 610 open edges): decimation folds the sheets into a crumpled shape and lands at 1,726 triangles, over the 1,500 band. Needs re-authoring from the silhouette, not clean-up.
- **Sci-fi crate**: tray and lid are separate printed parts laid side by side. I flipped the lid onto the tray by eye and it floats above the rim; facets are jagged after decimation. A rebuild would be faster than a fix.
- **Park bench** (1.5 M triangles, 17k open edges): collapse decimation stalled at 46k triangles. The pipeline now falls back to a voxel remesh and then collapses to target (3,000). It is the slowest model (about 110 s), mostly repair and remesh.
- **Tractor**: wheels are printed apart from the body; I placed them on the body's axle stubs by script. Front and back wheel sizes may be swapped.
- **Pirate chest and potion bottle** survive, but at 900 and 700 triangles the carved detail is smeared into soft shapes.
- **Print bases and supports**: none of the ten shipped with a visible print base or support structure, so that step removed nothing. The Dynetics lunar lander candidate (16 files including `frame_and_print_supports`) was skipped as too fiddly for a one-at-a-time pilot, and the "Lunar lander" candidate turned out to be a camping-stove foot.
- **Meshy**: no credits spent, no Meshy calls. All remeshing was Blender's own.
- **Materials**: one material per part (named by role), colours picked by hand. No per-region material split yet.
- **Printables**: blocked in the built-in browser by a Cloudflare check. Downloads went through Evan's Chrome, one model at a time, with no login.

## Source and style

- Every model has `provenance.json` (model URL, author, licence name and URL, date retrieved, origin), a licence screenshot, the Printables source image, and the sha256 of each source STL. The STLs (about 150 MB) stay on the PC and are git-ignored; re-download from the model URL and check the hash.
- Three are not first-hand: the tractor is a remix of lemairec's tractor, the chicken is a re-upload of Infalivia's chicken, and the park bench's preview image is marked AI-generated. The original author is named in `provenance.json`; CC BY models need that credit.
- These are the starting point for re-authoring in our style, not finished assets. In the `/models` desk they sit in their own group, "Free sources · Printables", so they never mix with the game's own models.
- The high-poly bake source is rebuilt from the source STL on each run and is not stored separately. Baked normal and AO images are git-ignored (they live inside each GLB); GLBs use 512 px JPEG textures to stay small.

## Re-running

```
blender -b -P tools/stl-pilot/stl_pipeline.py -- <slug>     # or ./runall.sh for all ten
python tools/stl-pilot/make_results.py                     # index.html and the table
python tools/stl-pilot/publish_models.py                    # /models group and review feed
```
