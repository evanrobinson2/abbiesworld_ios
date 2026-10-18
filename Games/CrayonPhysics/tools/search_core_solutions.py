"""Find headless rectangle-action candidates for subsequent touch replay validation."""
import argparse
import json
import math
import random
from pathlib import Path
from verify_physics import Simulation, load_library


def run(lib, level, actions, frames=900):
    sim = Simulation(lib, level)
    try:
        for frame in range(frames):
            for action in actions:
                if action['step'] == frame:
                    sim.add_box(*action['box'])
            sim.step()
            if not sim.stars:
                return sim.collected
        return sim.collected or None
    finally:
        sim.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('library', type=Path)
    parser.add_argument('--attempts', type=int, default=2000)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--level')
    args = parser.parse_args()
    lib = load_library(args.library)
    levels = json.loads((Path(__file__).resolve().parents[1] / 'CrayonPhysics/Resources/levels.json').read_text())['levels'][:7]
    rng = random.Random(20261018)
    results = []
    for level in levels:
        if args.level and args.level != level['id']:
            continue
        ball = next(b for b in level['bodies'] if b['special'] == 'da_ball')
        bx, by = ball['position'].values()
        result = {'level': level['id'], 'status': 'not found'}
        best_count = 0
        for attempt in range(args.attempts):
            # A falling weight or a long bridge, followed by an optional weight.
            width = rng.uniform(1, 7) if attempt % 2 else rng.uniform(8, 23)
            height = rng.uniform(0.15, 3)
            angle = rng.uniform(-0.6, 0.6)
            x = bx + rng.uniform(-3, 4) if width < 8 else rng.uniform(-3, 1)
            y = max(-14, by + rng.uniform(-4, 3))
            box = [x, y, width, height, angle]
            # Only visible drawable corners; a recognizer replay is still required.
            corners = [(x + sx*width/2*math.cos(angle)-sy*height/2*math.sin(angle),
                        y + sx*width/2*math.sin(angle)+sy*height/2*math.cos(angle))
                       for sx in (-1, 1) for sy in (-1, 1)]
            if any(not (-12.5 < x < 12.5 and -15.625 < y < 3.125) for x, y in corners):
                continue
            actions = [{'step': 60, 'box': box}]
            if level['id'] == 'level_03':
                # Brake the ball near the right edge of the upper ramp, then
                # provide a lower bridge after its return toward the left star.
                actions = [
                    {'step': rng.randrange(320, 440), 'box': [rng.uniform(7, 11), rng.uniform(-12, -9), rng.uniform(0.5, 3), rng.uniform(1, 4), rng.uniform(-0.5, 0.5)]},
                    {'step': rng.randrange(500, 800), 'box': [rng.uniform(-2, 1), rng.uniform(-5, -2), rng.uniform(18, 22), rng.uniform(0.2, 1), rng.uniform(0.15, 0.4)]}
                ]
            collected = run(lib, level, actions)
            if collected and len(collected) > best_count:
                best_count = len(collected)
                result = {'level': level['id'], 'status': 'headless candidate', 'attempt': attempt,
                          'actions': actions, 'collected': collected}
                print('Progress: ' + json.dumps(result), flush=True)
                if len(collected) == len(level['stars']):
                    break
        results.append(result)
        args.output.write_text(json.dumps({'warning': 'Ideal rectangle input, not recognized strokes or original executable/iPad verification', 'results': results}, indent=2) + '\n')
        print(json.dumps(result), flush=True)


if __name__ == '__main__':
    main()
