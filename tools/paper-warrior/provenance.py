"""Write provenance.json for the paper warrior deliverables (same spirit as AssetSources/*/provenance.json)."""
import sys, os, json, hashlib, glob
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()
fd = os.path.join(ROOT, 'out', 'finals')
lod = json.load(open(os.path.join(fd, 'lod_info.json')))
judge = json.load(open(os.path.join(ROOT, 'out', 'judge.json')))
master = json.load(open(os.path.join(ROOT, 'out', 'master-high-v2', 'summary.json')))
scripts = {os.path.basename(p): sha(p) for p in sorted(glob.glob(os.path.join(ROOT, 'pw', '*.py'))) + [os.path.join(ROOT, 'pw', 'schema.md')]}
ref = os.path.join(ROOT, 'ref', 'target.png')
common = dict(
    date='2026-10-22',
    tool='Blender 5.2.3 LTS (bpy module from PyPI), Cycles CPU renderer, run headless in a Claude Code cloud container',
    generator='pw/build.py: procedural metaball body plus bmesh armour pieces, all generated from numbers in params.json; no external meshes, textures or third-party assets are loaded',
    reference=dict(path='ref/target.png', sha256=sha(ref), origin='user-supplied upload by Evan (paper-warrior-target.png), used only as the image target for the loss; not copied into any asset'),
    models=dict(
        fitter='Claude Opus 5.5 (this session): wrote the builder, the loss and the loop, chose the restarts and the detail pass',
        reviser='Claude Opus 5.5 via the Claude Code CLI (claude -p --model opus --effort high), prompt v2, 8 rounds',
        numeric='(1+1) evolution strategy on silhouette loss (pw/opt.py)'),
    prompt=dict(path='pw/reviser.py (SYSTEM and V2 strings) + pw/schema.md', sha256=scripts.get('reviser.py')),
    scripts=scripts,
    params=dict(path='best_params.json', sha256=sha(os.path.join(ROOT, 'out', 'best_paper.json'))),
    loss=dict(definition='pw/loss.py: 0.35*(1-IoU) + 2.0*chamfer + 0.2*(1-SSIM) + 0.2*(1-edge corr) + 0.6*tone MAE, at 256 px',
              judged_final=judge.get('paper'), judged_start=judge.get('start')),
    llm_cost_usd=dict(master_reviser=master['llm_cost_usd']),
    grade='study', shippable=False,
)
assets = []
for k, v in lod.items():
    assets.append(dict(semanticId=f'character.romanPaperWarrior.{k}', kind='mesh', format='glb', version='v1', file=v['path'], sha256=v['sha256'], triangles=v['tris'], bytes=v['bytes']))
for f in ['proof_matched_1024.png', 'turntable.gif', 'turntable_sheet.jpg', 'lods.jpg']:
    assets.append(dict(semanticId='character.romanPaperWarrior.' + f.split('.')[0], kind='render', format=f.split('.')[-1], version='v1', file=f, sha256=sha(os.path.join(fd, f))))
json.dump(dict(schemaVersion=1, common=common, assets=assets), open(os.path.join(fd, 'provenance.json'), 'w'), indent=1)
print('ok', len(assets))
