# Toy cars from Printables

Six toy cars (CC0 or CC BY only), cleaned with `stl_pipeline.py` (car mode, `stl_cars.py`). Garage contract: glTF Y-up, metres, car faces +Z, wheel bottoms on y = 0, body is one node, each wheel its own node named `wheel`, `wheel.001`, ... with its origin at the wheel centre and the axle along X. Published at `prototypes/ranch-atelier/dist/models/stl-car-<name>/model.glb`.

| Car | Licence | Status | Source tris | Final tris | Wheels | W × H × L (m) | Time | GLB |
|---|---|---|---:|---:|---:|---|---:|---:|
| [Toy racer](https://www.printables.com/model/624877-3dworkbench-toy-car) | CC BY 4.0 | good | 58,172 | 4,992 | 4 | 1.344 × 1.216 × 3.2 | 7s | 285 KB |
| [Chunky toddler car](https://www.printables.com/model/457455-safer-toddlers-toy-car) | CC0 | partial | 25,128 | 4,498 | 4 | 1.675 × 1.489 × 2.6 | 8s | 202 KB |
| [Toy pickup truck](https://www.printables.com/model/389381-toy-car) | CC BY 4.0 | partial | 15,306 | 5,000 | 4 | 2.45 × 1.069 × 4.6 | 5s | 299 KB |
| [Red sedan](https://www.printables.com/model/834935-low-poly-car) | CC BY 4.0 | partial | 2,944 | 1,664 | 4 | 2.056 × 1.352 × 4.4 | 9s | 152 KB |
| [Wedge toy car](https://www.printables.com/model/303932-toy-car) | CC0 | weak | 6,292 | 4,500 | fused | 2.086 × 1.419 × 4.2 | 4s | 250 KB |
| [Concept sports car](https://www.printables.com/model/1554985-low-poly-print-in-place-futuristic-model-car) | CC BY 4.0 | weak | 890,236 | 6,000 | fused | 2.155 × 1.11 × 4.6 | 19s | 598 KB |

## Notes

- No shopping-cart car exists on Printables under CC0 or CC BY (searches for shopping cart, shopping trolley, trolley car return only coins, tokens and keys).
- Skipped: a low-poly sports car ("inspired by a Porsche 911") and a Cars-movie style car (a licensed character).
- Wheels of the racer, toddler car and pickup are separate files in the source, so we placed copies on estimated axles. The sedan's four wheels are separate shells inside its one file and were found automatically.
- The wedge and the concept car have their wheels fused to the body; they are published as weak because the wheels cannot spin.
- Sizes are set to about car size (2.6 to 4.6 m long) for the garage; change `length_m` in `stl_cars.py` for another scale.
- The source STLs stay on the PC (git-ignored); `provenance.json` has each sha256. Wheel bottoms land within about 3 cm of y = 0 (the sedan's two wheel sizes share meshes).
