"""Render every cue to the Ranch Atelier site and write the music catalogue and each asset's provenance.

    VSCO_ROOT=<VSCO-2-CE checkout> python3 render_all.py [cue-id ...]

Writes:
  prototypes/ranch-atelier/dist/music/composer/<id>.mp3 (+ .stem-*.mp3, key variants for stings)
  prototypes/ranch-atelier/dist/music/catalog.json      the /sounds records ({sounds:[...]}, see tools/sound-engineer)
  tools/composer/assets/<id>/provenance.json            brief, score, recipe, files, hashes, history
"""
import os, sys, json, importlib, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from engine import render as R
from engine.core import SAMPLES
from cues.common import STEM_ORDER

REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
# Switched off in the game (Evan, 2026-10-22): renders go to tools/composer/out/ (git-ignored), not the site.
SITE = os.path.join(HERE, 'out')
OUT = os.path.join(SITE, 'music', 'composer')
PREFIX = '/music/composer'
CUES = ['ranch_morning', 'ranch_workday', 'ranch_night', 'wonder', 'interludes', 'stings']


def rel(p):
    return os.path.relpath(p, REPO)


def cue_jobs(module):
    """A module either builds one cue (build()) or many (jobs() -> [(meta, build_fn, variant)])."""
    if hasattr(module, 'jobs'):
        return module.jobs()
    return [(module.META, module.build, None)]


def main(only):
    catalog_path = os.path.join(SITE, 'music', 'catalog.json')
    existing = {}
    if os.path.exists(catalog_path):
        existing = {r['id']: r for r in json.load(open(catalog_path)).get('sounds', [])}
    for name in CUES:
        try:
            mod = importlib.import_module(f'cues.{name}')
        except ModuleNotFoundError as e:
            if e.name != f'cues.{name}':
                raise
            print(f'skip {name}: not written yet')
            continue
        score = rel(mod.__file__)
        groups = {}
        for meta, build, variant in cue_jobs(mod):
            if only and meta['id'] not in only and name not in only:
                continue
            cue = build()
            asset_dir = os.path.join(HERE, 'assets', meta['id'])
            print(f'render {meta["id"]}{" in " + variant if variant else ""} ...', flush=True)
            rec = R.write(cue, OUT, PREFIX, rel(asset_dir), score, meta['brief'], meta['uses'], meta['tags'],
                          meta['group'], variant=variant, stem_order=STEM_ORDER)
            write_provenance(asset_dir, meta, cue, rec, score)
            print(f'   {rec["duration"]:.1f}s  {rec["loudness"]} LUFS  peak {rec["peak"]} dBTP  {rec["bytes"]//1024} KB')
            groups.setdefault(meta['id'], (meta, []))[1].append(rec)
        for mid, (meta, recs) in groups.items():
            existing[f'music.{mid}'] = merge_variants(meta, recs) if len(recs) > 1 else recs[0]
    rows = sorted(existing.values(), key=lambda r: (r['group'] != 'Music', r['group'], r['id']))
    now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
    json.dump({'version': 1, 'updated': now, 'count': len(rows), 'sounds': rows}, open(catalog_path, 'w'), indent=1)
    print(f'{len(rows)} records -> {rel(catalog_path)}')


def merge_variants(meta, recs):
    """One /sounds record per sting; urls.keys holds the version in each bed's key, the first is the default."""
    base = dict(recs[0])
    base['id'] = f'music.{meta["id"]}'
    base['name'] = meta['title']
    base['variant'] = None
    base['key'] = 'matches the bed (' + ', '.join(r['variant'] for r in recs) + ')'
    base['urls'] = {'audio': recs[0]['urls']['audio'],
                    'keys': {r['variant']: {'url': r['urls']['audio'], 'sha256': r['sha256'], 'bytes': r['bytes'],
                                            'duration': r['duration']} for r in recs}}
    base['bytes'] = sum(r['bytes'] for r in recs)
    return base


def write_provenance(asset_dir, meta, cue, rec, score):
    os.makedirs(asset_dir, exist_ok=True)
    path = os.path.join(asset_dir, 'provenance.json')
    prov = json.load(open(path)) if os.path.exists(path) else {'id': meta['id'], 'history': []}
    prov.update({
        'id': meta['id'], 'title': meta['title'], 'kind': cue.kind, 'brief': meta['brief'], 'uses': meta['uses'],
        'tags': meta['tags'], 'score': score, 'composer': 'Claude (Abbie\'s World Composer thread)',
        'source_image': None, 'reference_audio': meta.get('reference'),
        'recipe': rec['recipe'], 'motif': cue.meta.get('motif'),
    })
    files = prov.setdefault('files', {})
    key = rec['variant'] or 'main'
    files[key] = {'audio': rec['urls']['audio'], 'sha256': rec['sha256'], 'bytes': rec['bytes'],
                  'duration': rec['duration'], 'loudness': rec['loudness'], 'peak': rec['peak'],
                  'loopPoints': rec['loopPoints'], 'stems': rec['urls'].get('stems', [])}
    entry = {'date': rec['date'], 'renderer': R.RENDERER_VERSION, 'variant': rec['variant'], 'sha256': rec['sha256']}
    if not prov['history'] or prov['history'][-1].get('sha256') != rec['sha256'] or prov['history'][-1].get('variant') != rec['variant']:
        prov['history'].append(entry)
    json.dump(prov, open(path, 'w'), indent=1)


if __name__ == '__main__':
    if not os.path.isdir(SAMPLES):
        sys.exit(f'Samples not found at {SAMPLES}. Run ./fetch_samples.sh or set VSCO_ROOT.')
    main(set(sys.argv[1:]))
