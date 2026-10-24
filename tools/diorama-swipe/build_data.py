#!/usr/bin/env python3
"""Slim the model library to what the diorama builder needs: preview/diorama-swipe/models.json.
Source of truth stays prototypes/ranch-atelier/dist/models/library.json; rerun after the library changes."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
lib = json.loads((root / 'prototypes/ranch-atelier/dist/models/library.json').read_text())['items']
SKIP_TYPE = {'Terrain and tile', 'Armour and wear'}            # ground and clothing are not diorama props
SKIP_COLL = {'Animation library', 'Gateway art lab (AI model comparison)', 'Sandbox copies', 'Roman and Greek warrior'}
out = []
for e in lib:
    if e.get('level') != 'model' or not e.get('glb') or e['type'] in SKIP_TYPE or e['collection'] in SKIP_COLL: continue
    if e['bytes'] > 6_000_000: continue
    out.append({k: e.get(k) for k in ('key', 'name', 'place', 'type', 'collection', 'source', 'pass', 'bytes', 'glb', 'thumb')})
(root / 'preview/diorama-swipe/models.json').write_text(json.dumps({'from': 'dist/models/library.json', 'items': out}, separators=(',', ':')))
print(len(out), 'models')
