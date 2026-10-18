"""Validate A/V handoff hashes and prepare iOS-compatible original music."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import imageio_ffmpeg

workspace = Path(__file__).resolve().parents[2]
output = workspace / 'ios/CrayonPhysics/Resources'
pack = workspace / 'assets/default-original'
manifest = json.loads((pack / 'manifest.json').read_text(encoding='utf-8-sig'))
for entry in manifest['assets']:
    path = pack / entry['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], path
# Copy runtime brush resources; all scene art already comes from the same original files.
for path in (pack / 'data/gfx').glob('crayon_brush_*.png'):
    shutil.copy2(path, output / path.name)
cue_pack = workspace / 'assets/oga-audio'
packs = json.loads((cue_pack / 'packs.json').read_text(encoding='utf-8-sig'))
selected = next(pack for pack in packs['packs'] if pack['id'] == 'paper-pluck')
for entry in selected['cues'].values():
    path = workspace / entry['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], path
    shutil.copy2(path, output / path.name)
shutil.copy2(cue_pack / 'ATTRIBUTION.txt', output / 'sound-attribution.txt')
(output / 'sound-integration-candidate.json').write_text(json.dumps(selected, indent=2) + '\n', encoding='utf-8')
source = Path.home() / 'Downloads/crayon/data/sfx/_ghost_-_lullaby.ogg'
subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-y', '-i', str(source),
                '-c:a', 'aac', '-b:a', '192k', str(output / 'music-main.m4a')], check=True)
(output / 'audio-provenance.json').write_text(json.dumps({
    'music': {'author': '_ghost', 'title': 'Lullaby', 'license': 'CC BY-NC 2.5',
              'source': str(source), 'sourceSHA256': hashlib.sha256(source.read_bytes()).hexdigest(),
              'outputSHA256': hashlib.sha256((output / 'music-main.m4a').read_bytes()).hexdigest(),
              'conversion': 'FFmpeg AAC 192 kbps; original supplied music, not Suno production'},
    'sounds': 'paper-pluck licensed integration candidate; not accepted final; board is audition. Rejected procedural cues excluded.'
}, indent=2) + '\n', encoding='utf-8')
print(f'Validated {len(manifest["assets"])} original assets; integrated four licensed paper-pluck candidate cues and converted original music.')
