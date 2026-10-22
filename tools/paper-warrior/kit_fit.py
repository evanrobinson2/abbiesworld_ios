"""Round 3b: fit the warrior dressed in the separately fitted props to the three turnaround views.

usage: python kit_fit.py OUT_PREFIX [--kit] [--iters-scale 1.0]
Both arms start from round 3's three-view fit (out/r3/mv.json) and get the same budget:
  --kit   the body slimmed, its shoulder flaps, leg bands and sash removed, the five props snapped on (dress.py),
          and the props' size multipliers added to the search
  (none)  the one-piece builder carries on with the same stages, as the control
"""
import sys, os, json, random, time, argparse, copy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build, opt, mv_fit, dress

ROOT = mv_fit.ROOT

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--kit', action='store_true')
    ap.add_argument('--iters-scale', type=float, default=1.0); ap.add_argument('--seed', type=int, default=3)
    a = ap.parse_args(); S = lambda n: int(n * a.iters_scale)
    views = list(mv_fit.VIEWS); tag = 'r3b-kit' if a.kit else 'r3b-onepiece'
    p = json.load(open(os.path.join(ROOT, 'out', 'r3', 'mv.json')))
    G = opt.GROUPS; extra = []
    if a.kit:
        dress.install(os.path.join(ROOT, 'props'))
        p['kit'] = copy.deepcopy(dress.KIT0)
        for k in ('chest', 'abdomen', 'r_shoulder', 'l_shoulder', 'r_elbow', 'l_elbow', 'r_knee', 'l_knee', 'r_ankle', 'l_ankle', 'r_hip', 'l_hip'):
            p['radii'][k] *= 0.85                      # a slimmer mannequin, so the armour is the silhouette, not the body
        extra = dress.kit_groups()
    rng = random.Random(a.seed); t0 = time.time(); hist = []
    def mark(name):
        sc = mv_fit.score_all(p); hist.append(dict(stage=name, secs=round(time.time() - t0), **mv_fit.flat(sc, views)))
        print(tag, name, round(hist[-1]['all3'], 4), flush=True)
    mark('start')
    if extra:
        p, _ = mv_fit.es(p, extra, S(400), views, f'{tag}-kit', rng); mark('kit')
    p, _ = mv_fit.es(p, G['radii'] + G['pose'] + extra, S(700), views, f'{tag}-body', rng, 0.7); mark('body')
    p, _ = mv_fit.es(p, G['shield'] + G['helmet'] + G['parts'] + G['skirt'] + extra, S(600), views, f'{tag}-parts', rng, 0.7); mark('parts')
    p, _ = mv_fit.es(p, G['pose'] + G['radii'] + G['shield'] + G['parts'] + extra + mv_fit.cam_spec(views), S(500), views, f'{tag}-all', rng, 0.5); mark('all')
    json.dump(p, open(a.out + '.json', 'w'), indent=1)
    json.dump(hist, open(a.out + '_hist.json', 'w'), indent=1)

if __name__ == '__main__':
    main()
