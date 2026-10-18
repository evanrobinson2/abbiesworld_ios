"""Headless shared-core checks; this is not touch or original-executable validation."""
import argparse
import ctypes as C
import json
import math
from pathlib import Path


class Definition(C.Structure):
    _fields_ = [(k, C.c_float) for k in (
        'x', 'y', 'rotation', 'vx', 'vy', 'angularVelocity', 'width', 'height',
        'mass', 'friction', 'forceX', 'forceY', 'torque')] + [('shape', C.c_int32), ('isStatic', C.c_int32)]


class State(C.Structure):
    _fields_ = [(k, C.c_float) for k in ('x', 'y', 'rotation', 'vx', 'vy', 'angularVelocity')]


def load_library(path):
    lib = C.CDLL(str(Path(path).resolve()))
    lib.CPWorldCreate.argtypes = [C.c_float, C.c_float, C.c_int32]
    lib.CPWorldCreate.restype = C.c_void_p
    lib.CPWorldDestroy.argtypes = [C.c_void_p]
    lib.CPWorldStep.argtypes = [C.c_void_p]
    lib.CPWorldAddBody.argtypes = [C.c_void_p, Definition]
    lib.CPWorldAddBody.restype = C.c_int32
    lib.CPWorldRemoveBody.argtypes = [C.c_void_p, C.c_int32]
    lib.CPWorldGetBody.argtypes = [C.c_void_p, C.c_int32, C.POINTER(State)]
    lib.CPWorldGetBody.restype = C.c_int32
    lib.CPWorldRestoreBody.argtypes = [C.c_void_p, C.c_int32, State]
    lib.CPWorldAddJoint.argtypes = [C.c_void_p, C.c_int32, C.c_int32] + [C.c_float] * 7
    lib.CPWorldAddJoint.restype = C.c_int32
    return lib


class Simulation:
    def __init__(self, lib, level):
        self.lib, self.level = lib, level
        self.world = lib.CPWorldCreate(level['gravity']['x'], level['gravity']['y'], level['iterations'])
        self.handles = {}
        self.drawings = []
        self.steps = 0
        self.stars = list(level['stars']) if level['id'] != 'the_end' else []
        self.collected = []
        self.ball = None
        for b in level['bodies']:
            d = Definition(b['position']['x'], b['position']['y'], b['rotation'],
                           b['velocity']['x'], b['velocity']['y'], b['angularVelocity'],
                           b['radius']['x'], b['radius']['y'], b['mass'], b['friction'],
                           b['force']['x'], b['force']['y'], b['torque'], b['shape'], int(b['isStatic']))
            self.handles[b['id']] = lib.CPWorldAddBody(self.world, d)
            assert self.handles[b['id']] >= 0
            if b['special'] == 'da_ball':
                self.ball = b
        for j in level['joints']:
            assert lib.CPWorldAddJoint(self.world, self.handles[j['body1']], self.handles[j['body2']],
                                      j['anchor1']['x'], j['anchor1']['y'], j['anchor2']['x'], j['anchor2']['y'],
                                      j['relaxation'], j['accumulatedImpulse']['x'], j['accumulatedImpulse']['y'])

    def close(self):
        if self.world:
            self.lib.CPWorldDestroy(self.world)
            self.world = None

    def state(self, handle):
        result = State()
        return result if self.lib.CPWorldGetBody(self.world, handle, C.byref(result)) else None

    def add_box(self, x, y, width, height, angle=0):
        d = Definition(x=x, y=y, width=width, height=height, rotation=angle,
                       mass=2*width*height, friction=0.2)
        handle = self.lib.CPWorldAddBody(self.world, d)
        self.drawings.append(handle)
        return handle

    def step(self):
        self.lib.CPWorldStep(self.world)
        self.steps += 1
        if not self.ball:
            return
        b = self.ball
        handle = self.handles[b['id']]
        s = self.state(handle)
        assert all(math.isfinite(getattr(s, k)) for k, _ in State._fields_), (self.level['id'], self.steps)
        if self.steps % 101 == 0 and s.y > 15:
            s.x, s.y = b['position']['x'], b['position']['y']
            s.vx, s.vy = b['velocity']['x'], b['velocity']['y']
            s.angularVelocity = b['angularVelocity']
            self.lib.CPWorldRestoreBody(self.world, handle, s)
        if self.steps % 101 == 0:
            for other in list(self.handles.values()) + self.drawings:
                state = self.state(other)
                if other != handle and state and state.y > 30:
                    self.lib.CPWorldRemoveBody(self.world, other)
        if self.stars:
            threshold = b['radius']['x'] / 2 + self.stars[0]['radius']
            for star in list(self.stars):
                if math.hypot(s.x-star['position']['x'], s.y-star['position']['y']) < threshold:
                    self.stars.remove(star)
                    self.collected.append({'step': self.steps, 'star': star['position']})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('library', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    lib = load_library(args.library)
    levels = json.loads((Path(__file__).resolve().parents[1] / 'CrayonPhysics/Resources/levels.json').read_text())['levels']
    results = []
    for level in levels:
        sim = Simulation(lib, level)
        try:
            for _ in range(1800):
                sim.step()
                for handle in sim.handles.values():
                    s = sim.state(handle)
                    assert s is None or all(math.isfinite(getattr(s, key)) for key, _ in State._fields_)
            results.append({'level': level['id'], 'steps': sim.steps, 'finite': True,
                            'collectedWithoutInput': sim.collected})
        finally:
            sim.close()
    report = {'validation': 'headless stability only; not puzzle solutions or iPad playtest', 'levels': results}
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
