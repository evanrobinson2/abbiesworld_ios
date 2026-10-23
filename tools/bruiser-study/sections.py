"""Cross-sections of the aligned MPFB anatomy body (mpfb/aligned.glb), for jobs to read real depth from.

python3 sections.py              -> mpfb/sections.json: every 2 cm of height, each separate body part cut at that
                                    height (torso, arm, leg) as {x0, x1, y0, y1, cx, cy} in study world metres.
python3 sections.py 1.20         -> prints the cut at z = 1.20 m
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
import numpy as np  # noqa: E402


def load_points():
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, 'mpfb', 'aligned.glb'))
    bpy.context.view_layer.update()
    tris = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        me = o.data; me.calc_loop_triangles()
        co = np.array([tuple(o.matrix_world @ v.co) for v in me.vertices])
        idx = np.array([t.vertices[:] for t in me.loop_triangles])
        tris.append(co[idx])
    return np.concatenate(tris)


def cut(tris, z):
    """Segments where triangles cross the plane z; returns their end points (x, y)."""
    zs = tris[..., 2]
    pts = []
    for t, zz in zip(tris, zs):
        if zz.min() > z or zz.max() < z:
            continue
        for i in range(3):
            a, b = t[i], t[(i + 1) % 3]
            if (a[2] - z) * (b[2] - z) < 0:
                f = (z - a[2]) / (b[2] - a[2]); pts.append(a[:2] + f * (b[:2] - a[:2]))
    return np.array(pts)


def parts(pts, gap=0.025):
    if len(pts) == 0:
        return []
    order = np.argsort(pts[:, 0]); p = pts[order]
    groups, cur = [], [p[0]]
    for q in p[1:]:
        if q[0] - cur[-1][0] > gap:
            groups.append(np.array(cur)); cur = []
        cur.append(q)
    groups.append(np.array(cur))
    return [dict(x0=round(float(g[:, 0].min()), 3), x1=round(float(g[:, 0].max()), 3), y0=round(float(g[:, 1].min()), 3),
                 y1=round(float(g[:, 1].max()), 3), cx=round(float(g[:, 0].mean()), 3), cy=round(float(g[:, 1].mean()), 3)) for g in groups]


def main():
    tris = load_points()
    if len(sys.argv) > 1:
        print(json.dumps(parts(cut(tris, float(sys.argv[1]))), indent=1)); return
    out = {f'{z:.2f}': parts(cut(tris, z)) for z in np.arange(0.02, 2.0, 0.02)}
    json.dump(dict(note='MPFB anatomy body aligned to the study frame; y negative is toward the camera (his front). '
                        'Each entry: the separate parts cut at that height, left to right in the image.', cuts=out),
              open(os.path.join(HERE, 'mpfb', 'sections.json'), 'w'), indent=0)
    print('ok', len(out))


if __name__ == '__main__':
    main()
