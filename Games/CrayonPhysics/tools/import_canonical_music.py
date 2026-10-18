"""Import the four delivered arrangements without editing audio or old provenance."""
import hashlib
import json
from pathlib import Path
import shutil

workspace = Path(__file__).resolve().parents[2]
source = workspace / 'assets/canonical-music'
target = workspace / 'ios/CrayonPhysics/Resources'
manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
assert [track['id'] for track in manifest['tracks']] == ['normal', 'tense', 'french-house', 'pop']
for track in manifest['tracks']:
    playback = source / track['playback']
    assert hashlib.sha256(playback.read_bytes()).hexdigest() == track['playbackSHA256'], track['id']
    name = f'music-{track["id"]}.m4a'
    shutil.copy2(playback, target / name)
    track['bundledFilename'] = name
(target / 'canonical-music-provenance.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('Imported 4 hash-verified canonical tracks; full-length repeats, no seamless-loop or listening claim.')
