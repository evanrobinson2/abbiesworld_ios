"""Late-Roman ridge helmet (Intercisa type, c. 4th century) from the SAME grammar and light as the fitted hybrid.
Only the shape numbers change: no crest, a ridge strip joining two bowl halves, a narrow brow band, short neck guard,
broad cheek pieces with no eye slot. Writes out/ridge_*.png (4 views) and out/ridge_helmet.glb."""
import os, sys, json, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fit, helmet
src = json.load(open(os.path.join(fit.OUT, 'params_C_rules.json')))
p = copy.deepcopy(src)
p['shape'].update({'dome': [0.9, 1.02, 0.88], 'band_h': 0.12, 'lip': 0.035, 'lip_z': 0.0, 'lip_front': 0.0, 'front_drop': 0.0, 'band_front': 0.0,
                   'eye_gap': 0.0, 'open': 40, 'low_h': 0.28, 'low_back': 0.12, 'taper': 0.05,
                   'cheek_w': 52, 'cheek_len': 0.85, 'cheek_back_len': 0.75, 'cheek_tip_u': 0.35, 'cheek_in': 0.12, 'cheek_front': 1.0,
                   'neck_w': 55, 'neck_len': 0.32, 'neck_flare': 72, 'neck_off': 0, 'boss_th': 60, 'boss_r': 0.045,
                   'crest': None, 'ridge': {'w': 0.16, 'h': 0.07}})
p['grammar'].update({'dome_u': 14, 'dome_v': 4})
json.dump(p, open(os.path.join(fit.OUT, 'params_ridge.json'), 'w'), indent=1)
for yaw in (-40, 0, -90, 150):
    q = copy.deepcopy(p); q['place'].update(yaw=yaw, pitch=0, roll=0)
    parts = helmet.setup(q, 'grammar', None, 512, 512)
    helmet.render(os.path.join(fit.OUT, f'ridge_{yaw}.png'), 512, 512, 32)
q = copy.deepcopy(p); q['place'].update(yaw=0, pitch=0, roll=0, x=0, z=0, scale=0.12)  # ~24 cm wide, real-world metres
parts = helmet.setup(q, 'grammar', None, 64, 64, with_stage=False)
helmet.export_glb(os.path.join(fit.OUT, 'ridge_helmet.glb'), parts); print('ridge tris', helmet.tri_count(parts))
