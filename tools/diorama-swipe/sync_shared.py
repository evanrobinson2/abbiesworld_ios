#!/usr/bin/env python3
"""Copy the game's own modules into the preview (previews sync only preview/<name>/): first-person.mjs and tile-chat/contract.mjs.
test.mjs fails if a copy drifts from its source."""
import pathlib, shutil
root = pathlib.Path(__file__).resolve().parents[2]; sim = root / 'prototypes/ranch-atelier/dist/simulations'; out = root / 'preview/diorama-swipe'
(out / 'tile-chat').mkdir(exist_ok=True)
shutil.copyfile(sim / 'first-person.mjs', out / 'first-person.mjs'); shutil.copyfile(sim / 'tile-chat/contract.mjs', out / 'tile-chat/contract.mjs')
