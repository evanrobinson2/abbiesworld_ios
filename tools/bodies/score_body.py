"""Score a human body model against the AW-STUDY-0016 canon (docs/oracle/bodies/human-canon.json).

python score_body.py                         -> scores every tools/paper-body/out/*.json, writes docs/oracle/bodies/scores.json
python score_body.py body.json [--build heroic]

A body is scored on what a figure-drawing teacher checks first: how many heads tall it is, where the landmarks fall
(as a fraction of standing height, so a bigger toy head is not punished twice), and how wide the shoulders, chest, waist
and hips are against the height. Input is either a paper-body measurement file (tools/paper-body/body.py) or a plain
landmarks file:
  {"sex": "male", "build": "average", "stature": 1.78, "head": 0.222,
   "heights": {"chin": 1.56, "nipple": 1.28, ...}, "widths": {"shoulders": 0.42, "hips": 0.34, ...}}
Heights and widths in the same unit as stature (any unit).
Optional detail, scored when present:
  "face": {"brow": 0.44, "eye": 0.5, "nose": 0.72, "mouth": 0.81, "width": 0.68, "jaw": 0.52}   (fractions of head height, down from the crown)
  "hand": {"length": 0.19, "palm": 0.1, "knuckles": 0.085, "fingers": {"index": 0.078, "middle": 0.088, "ring": 0.082, "little": 0.064, "thumb": 0.055}}
          (same unit as stature; fingers measured from their base knuckle)"""
import os, sys, json, glob, math

HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from figure import canon, figure  # noqa: E402

ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))
BUILD_ALIAS = dict(fat='heavy', toned='average')
HEIGHT_KEYS = ['chin', 'pit', 'acromion', 'nipple', 'waist', 'troch', 'crotch', 'elbow', 'wrist', 'fingertip', 'knee', 'ankle']
WIDTH_KEYS = ['shoulders', 'chest', 'waist', 'hips', 'head']
TOY_HEADS = (7.0, 7.5)


def from_paper_body(d):
    """Landmarks from a paper-body measurement file (Z up, metres, origin on the floor)."""
    H, t, hd, so = d['height_m'], d['torso'], d['head'], d['sockets']
    m = d.get('multipliers', {}); li = m.get('li', 1.0)
    head = 2 * (hd['top'] - hd['center'][2]); chin = hd['top'] - head
    sh = so['shoulder_r']; hand = so['hand_r']; a = math.radians(14); ca = math.cos(a)
    elbow = sh[2] - 0.185 * H * ca; wrist = elbow - 0.165 * H * ca; finger = wrist - 0.095 * ca
    hip = so['hip_r']; knee = hip[2] - 0.235 * H
    return dict(sex=d['sex'], build=BUILD_ALIAS.get(d['build'], d['build']), name=f"{d['sex']}-{d['build']}", stature=H, head=head,
                heights=dict(chin=chin, pit=t['neck_base']['z'], acromion=t['shoulders']['z'], nipple=t['chest']['z'], waist=t['waist']['z'],
                             troch=t['hips']['z'], crotch=t['crotch']['z'], elbow=elbow, wrist=wrist, fingertip=finger, knee=knee, ankle=0.045 * H),
                widths=dict(shoulders=2 * max(t['shoulders']['half_width'], abs(sh[0]) + 0.046 * li), chest=2 * t['chest']['half_width'],
                            waist=2 * t['waist']['half_width'], hips=2 * t['hips']['half_width'], head=2 * hd['half_width']))


def score(body, cn=None):
    cn = cn or canon(); f = figure(cn, body['sex'], body['build']); tol = cn['tolerance']
    Hc = f['heads']; S = body['stature']; heads = S / body['head']; checks = []
    lo, hi = Hc - 0.4, Hc + 0.4
    checks.append(dict(check='heads tall', want=round(Hc, 2), got=round(heads, 2), ok=lo <= heads <= hi,
                       note='toy range' if TOY_HEADS[0] <= heads <= TOY_HEADS[1] else ''))
    for k in HEIGHT_KEYS:
        if k not in body['heights']: continue
        want = f['y'][k] / Hc; got = body['heights'][k] / S; err_heads = (got - want) * Hc
        checks.append(dict(check=f'{k} height', want=round(want, 3), got=round(got, 3), off_heads=round(err_heads, 2), ok=abs(err_heads) <= tol['height'] + 0.05))
    for k in WIDTH_KEYS:
        if k not in body['widths']: continue
        if k == 'head':
            want, got = f['W']['head'], body['widths']['head'] / body['head']
        else:
            want, got = f['W'][k] / Hc, body['widths'][k] / S
        rel = got / want - 1
        checks.append(dict(check=f'{k} width', want=round(want, 3), got=round(got, 3), off_pct=round(100 * rel), ok=abs(rel) <= tol['width']))
    w = body['widths']
    if 'shoulders' in w and 'hips' in w:
        r = w['shoulders'] / w['hips']; lo, hi = cn['ratios']['shoulder_to_hip'][body['sex']]
        checks.append(dict(check='shoulder to hip', want=f'{lo}-{hi}', got=round(r, 2), ok=lo <= r <= hi))
    checks += detail_checks(body, cn)
    n = sum(c['ok'] for c in checks)
    return dict(name=body.get('name', ''), sex=body['sex'], build=body['build'], heads=round(heads, 2), score=round(100 * n / len(checks)),
                passed=n, of=len(checks), misses=[c['check'] for c in checks if not c['ok']], checks=checks)


def detail_checks(body, cn):
    """Head and hand checks against the canon's "head" and "hand" sections."""
    out = []; sex = body['sex']
    face = body.get('face')
    if face:
        h = cn['head']
        for k in ('brow', 'eye', 'nose', 'mouth'):
            if k in face:
                d = face[k] - h['heights'][k]; out.append(dict(check=f'face {k} line', want=h['heights'][k], got=round(face[k], 3), off_heads=round(d, 3), ok=abs(d) <= 0.04))
        for k, ck in (('width', 'head'), ('jaw', 'jaw')):
            if k in face:
                want = h['widths'][sex][ck]; rel = face[k] / want - 1
                out.append(dict(check=f'face {k}', want=want, got=round(face[k], 3), off_pct=round(100 * rel), ok=abs(rel) <= 0.15))
    hand = body.get('hand')
    if hand:
        hd = cn['hand']; L = hand['length']
        r = L / body['head']; lo, hi = hd['to_head']
        out.append(dict(check='hand to head', want=f'{lo}-{hi}', got=round(r, 2), ok=lo <= r <= hi * 1.1))
        if 'palm' in hand:
            d = hand['palm'] / L - hd['palm_length']; out.append(dict(check='palm length', want=hd['palm_length'], got=round(hand['palm'] / L, 3), ok=abs(d) <= 0.05))
        if 'knuckles' in hand:
            want = hd['width'][sex]['knuckles']; rel = hand['knuckles'] / L / want - 1
            out.append(dict(check='hand width', want=want, got=round(hand['knuckles'] / L, 3), off_pct=round(100 * rel), ok=abs(rel) <= 0.15))
        f = hand.get('fingers', {})
        if 'middle' in f:
            for k in ('index', 'ring', 'little', 'thumb'):
                if k in f:
                    want = hd['fingers'][k]; got = f[k] / f['middle']
                    out.append(dict(check=f'{k} finger', want=want, got=round(got, 2), ok=abs(got - want) <= 0.08))
    return out


def main():
    args = sys.argv[1:]; cn = canon()
    if args and args[0].endswith('.json'):
        d = json.load(open(args[0])); body = from_paper_body(d) if 'torso' in d else d
        if '--build' in args: body['build'] = args[args.index('--build') + 1]
        r = score(body, cn); print(json.dumps(r, indent=1)); return
    out = []
    paths = sorted(glob.glob(os.path.join(ROOT, 'tools', 'paper-body', 'out', '*.json')))
    paths += sorted(glob.glob(os.path.join(ROOT, 'tools', 'paper-body', 'figures', '*', 'body.json')))  # rebuilt figures
    for p in paths:
        d = json.load(open(p)); body = from_paper_body(d) if 'torso' in d else d
        body.setdefault('name', os.path.basename(os.path.dirname(p)))
        r = score(body, cn); out.append(r)
        print(f"{r['name']:26s} {r['heads']:5.2f} heads  {r['score']:3d}%  misses: {', '.join(r['misses']) or '-'}")
    res = dict(canon=cn['version'], scored='tools/paper-body/out and tools/paper-body/figures/*/body.json', bodies=out)
    for dst in (os.path.join(ROOT, 'docs', 'oracle', 'bodies', 'scores.json'),
                os.path.join(ROOT, 'prototypes', 'ranch-atelier', 'dist', 'studies', 'bodies-study', 'scores.json')):
        json.dump(res, open(dst, 'w'), indent=1)


if __name__ == '__main__':
    main()
