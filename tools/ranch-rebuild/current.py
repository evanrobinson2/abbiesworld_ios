"""Render today's Ranch tile assets (hero view only) into current/, for the art director and modelers."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'model-challenge'))
import harness
D = os.path.join(HERE, '..', '..', 'prototypes', 'ranch-atelier', 'dist')
ASSETS = {
 'family-home': 'simulation-assets/buildings/family-home-complete.glb', 'feed-store': 'simulation-assets/buildings/feed-store-complete.glb',
 'water-point': 'simulation-assets/buildings/water-point-complete.glb', 'horse-shelter': 'simulation-assets/buildings/cattle-shelter-complete.glb',
 'goat-shelter': 'simulation-assets/buildings/goat-shelter-complete.glb', 'chicken-coop': 'simulation-assets/buildings/chicken-coop-complete.glb',
 'barn-shelter': 'simulation-assets/buildings/shelter-complete.glb',
 'horse': 'simulation-assets/organics/horse-idle.glb', 'cow': 'simulation-assets/organics/cow-idle.glb', 'goat': 'simulation-assets/organics/goat-idle.glb', 'chicken': 'simulation-assets/organics/chicken-idle.glb',
 'tree-standing': 'simulation-assets/organics/tree-standing.glb',
 'birch': 'simulations/regional-assets/WW-139.glb', 'maple': 'simulations/regional-assets/WW-151.glb', 'apple-tree': 'simulations/regional-assets/GF-153.glb',
 'hazel': 'simulations/regional-assets/GF-158.glb', 'elder': 'simulations/regional-assets/GF-159.glb',
 'stone-edging': 'simulations/regional-assets/GF-010.glb', 'borage': 'simulations/regional-assets/GF-249.glb', 'marigold': 'simulations/regional-assets/GF-250.glb',
 'sunflower': 'simulations/regional-assets/GF-567.glb', 'hollyhock': 'simulations/regional-assets/GF-634.glb', 'coneflower': 'simulations/regional-assets/GF-679.glb',
 'clover': 'simulations/regional-assets/UP-051.glb', 'fern': 'simulations/regional-assets/WW-046.glb', 'bramble': 'simulations/regional-assets/WW-273.glb',
 'goldenrod': 'simulations/regional-assets/WW-347.glb',
 'compost-bay': 'garden-assets/GF-019.glb', 'potting-bench': 'garden-assets/GF-020.glb', 'watering-pot': 'garden-assets/GF-074.glb', 'bench': 'garden-assets/GF-194.glb',
 'hay-bale': 'simulation-assets/supplies/hay-full.glb', 'ration-bin': 'simulation-assets/supplies/ration-full.glb',
 'water-bucket': 'simulation-assets/supplies/water-bucket-carried.glb', 'water-trough': 'simulation-assets/supplies/water-trough-empty.glb',
}
if __name__ == '__main__':
    import bpy, json
    names = sys.argv[1:] or list(ASSETS)
    for n in names:
        sc, lo, hi, tris, k = harness._scene(os.path.join(D, ASSETS[n]), 384, 12)
        cam = harness._cam(sc, lo, hi, harness.HERO_DIR, False)
        sc.render.filepath = os.path.join(HERE, 'current', f'{n}.png'); bpy.ops.render.render(write_still=True)
        print(json.dumps(dict(name=n, tris=tris, dims=[round(float(x), 2) for x in hi - lo])), flush=True)
