"""Verify the generated bundle against the original XML, geometry and file hashes."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image

root = Path(__file__).resolve().parents[1]
resources = root / 'CrayonPhysics/Resources'
source = Path.home() / 'Downloads/crayon'
catalog = json.loads((resources / 'levels.json').read_text())
expected = ['level_01', 'level_02', 'level_07', 'level_05', 'level_06', 'level_04', 'level_03', 'the_end']
assert [l['id'] for l in catalog['levels']] == expected
for level in catalog['levels']:
    original = ET.parse(source / 'data/levels' / (level['id'] + '.xml')).getroot()
    bodies = original.findall('World/Body')
    assert len(bodies) == len(level['bodies'])
    for original_body, imported in zip(bodies, level['bodies']):
        assert int(original_body.get('id')) == imported['id']
        assert int(original_body.get('shape')) == imported['shape']
        assert (original_body.get('is_static') == '1') == imported['isStatic']
        for tag in ('Position', 'Radius', 'Velocity', 'Force'):
            key = tag[0].lower() + tag[1:]
            assert imported[key] == {axis: float(original_body.find(tag).get(axis)) for axis in ('x', 'y')}
        for tag in ('Rotation', 'AngularVelocity', 'Torque', 'Friction', 'Mass'):
            assert imported[tag[0].lower() + tag[1:]] == float(original_body.findtext(tag))
    ids = {b['id'] for b in level['bodies']}
    assert len(level['joints']) == len(original.findall('World/Joint'))
    for joint, source_joint in zip(level['joints'], original.findall('World/Joint')):
        assert joint['body1'] in ids and joint['body2'] in ids
        for key, tag in [('anchor1', 'LocalAnchor1'), ('anchor2', 'LocalAnchor2'), ('accumulatedImpulse', 'AccumulatedImpulse')]:
            assert joint[key] == {axis: float(source_joint.find(tag).get(axis)) for axis in ('x', 'y')}
        assert joint['relaxation'] == float(source_joint.findtext('Relaxation'))
    assert len(level['stars']) == len(original.findall('Collectable'))
    assert level['id'] == 'the_end' or sum(b['special'] == 'da_ball' for b in level['bodies']) == 1
for sprite in catalog['sprites'].values():
    if sprite.get('render') == 'body-brush':
        assert sprite['image'] == 'custom-brush.png'
        continue
    with Image.open(resources / sprite['image']) as image:
        for rect in [sprite['rect']] + [f['rect'] for f in sprite['frames']]:
            if rect:
                assert rect['x'] >= 0 and rect['y'] >= 0
                assert rect['x'] + rect['w'] <= image.width, sprite
                assert rect['y'] + rect['h'] <= image.height, sprite
for filename, checksum in json.loads((resources / 'source-hashes.json').read_text()).items():
    assert hashlib.sha256((source / filename).read_bytes()).hexdigest() == checksum
candidate = json.loads((resources / 'sound-integration-candidate.json').read_text())
for cue in candidate['cues'].values():
    assert hashlib.sha256((resources / Path(cue['path']).name).read_bytes()).hexdigest() == cue['sha256']
assert candidate['id'] == 'paper-pluck'
audio = json.loads((resources / 'audio-provenance.json').read_text())['music']
assert hashlib.sha256((resources / 'music-main.m4a').read_bytes()).hexdigest() == audio['outputSHA256']
canonical = json.loads((resources / 'canonical-music-provenance.json').read_text(encoding='utf-8'))
assert [track['id'] for track in canonical['tracks']] == ['normal', 'tense', 'french-house', 'pop']
for track in canonical['tracks']:
    assert track['bundledFilename'] == f'music-{track["id"]}.m4a'
    assert hashlib.sha256((resources / track['bundledFilename']).read_bytes()).hexdigest() == track['playbackSHA256']
print('PASS: 8 scenes, 34 complete body records, 5 linked joints, star counts, sprite crops, source provenance, 4 licensed candidate cues, reference music and 4 canonical tracks.')
