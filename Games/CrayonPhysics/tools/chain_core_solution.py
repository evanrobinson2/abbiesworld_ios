"""Replay two partial solutions separated by erase and the game's automatic ball recovery."""
import argparse
import json
from pathlib import Path
from verify_physics import Simulation, load_library

parser = argparse.ArgumentParser()
parser.add_argument('library')
parser.add_argument('first', type=Path)
parser.add_argument('second', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
first = json.loads(args.first.read_text())['results'][0]
second = next(r for r in json.loads(args.second.read_text())['results'] if r['level'] == first['level'])
level = next(l for l in json.loads((Path(__file__).resolve().parents[1] / 'CrayonPhysics/Resources/levels.json').read_text())['levels'] if l['id'] == first['level'])
lib = load_library(args.library)
sim = Simulation(lib, level)
actions = list(first['actions'])
drawings = []
waiting = False
second_started = False
try:
    for frame in range(5000):
        for action in actions:
            if action['step'] == frame:
                drawings.append(sim.add_box(*action['box']))
        sim.step()
        if len(sim.collected) == 1 and not waiting and not second_started:
            for handle in drawings:
                lib.CPWorldRemoveBody(sim.world, handle)
            drawings.clear()
            erase = {'step': frame+1, 'eraseAll': True}
            waiting = True
        state = sim.state(sim.handles[sim.ball['id']])
        if waiting and sim.steps % 101 == 0 and abs(state.x - sim.ball['position']['x']) < 0.0001 and abs(state.y - sim.ball['position']['y']) < 0.0001:
            actions += [dict(a, step=a['step']+sim.steps) for a in second['actions']]
            waiting, second_started = False, True
        if not sim.stars:
            result = {'level': level['id'], 'status': 'headless candidate', 'actions': sorted(actions+[erase], key=lambda a:a['step']), 'collected': sim.collected}
            args.output.write_text(json.dumps({'warning': 'Ideal rectangle actions; recognized-stroke and touch replay still required', 'results': [result]}, indent=2)+'\n')
            print(json.dumps(result))
            break
    else:
        raise RuntimeError(f'Incomplete: {sim.collected}')
finally:
    sim.close()
