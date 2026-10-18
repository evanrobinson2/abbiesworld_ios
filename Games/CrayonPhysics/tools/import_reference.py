"""Deterministically import Release 1 geometry and sprite metadata; never edit source."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import xml.etree.ElementTree as ET


def vector(node):
    return {k: float(node.get(k, '0')) for k in ('x', 'y')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    target = Path(__file__).resolve().parents[1] / 'CrayonPhysics' / 'Resources'
    target.mkdir(parents=True, exist_ok=True)
    source = args.source
    levels = []
    provenance = {}
    sprites = {}

    def record(path):
        provenance[str(path.relative_to(source)).replace('\\', '/')] = hashlib.sha256(path.read_bytes()).hexdigest()

    def sprite(relative):
        if not relative:
            return None
        if relative in sprites:
            return relative
        path = source / relative
        record(path)
        root = ET.parse(path).getroot()
        image = root.findtext('ImageFilename')
        if image is None:
            # Animated definitions keep the image on their child sprite.
            image = root.findtext('.//ImageFilename')
        if image is None:
            raise ValueError(f'No sprite image in {path}')
        image_path = source / image.strip()
        record(image_path)
        shutil.copy2(image_path, target / image_path.name)
        rect = root.find('.//ImageRect')
        frames = [{'rect': {k: float(f.find('Rect').get(k)) for k in ('x', 'y', 'w', 'h')},
                   'duration': float(f.findtext('FrameLength')) / 1000}
                  for f in root.findall('Animation/Frame') if f.find('Rect') is not None]
        sprites[relative] = {'image': image_path.name,
                             'rect': frames[0]['rect'] if frames else ({k: float(rect.get(k)) for k in ('x', 'y', 'w', 'h')} if rect is not None else None),
                             'frames': frames}
        return relative

    listing = source / 'data/level_list.xml'
    record(listing)
    for entry in sorted(ET.parse(listing).getroot(), key=lambda e: int(e.get('position'))):
        filename = entry.get('filename')
        if not filename:
            continue
        path = source / filename
        record(path)
        root = ET.parse(path).getroot()
        world = root.find('World')
        bodies = []
        for body in world.findall('Body'):
            item = {key: int(body.get(key)) for key in ('id', 'shape')}
            item['isStatic'] = body.get('is_static') == '1'
            item['sprite'] = sprite(body.get('gfx_file'))
            item['special'] = body.findtext('Special', '').strip()
            for tag in ('Position', 'Radius', 'Velocity', 'Force'):
                item[tag[0].lower() + tag[1:]] = vector(body.find(tag))
            for tag in ('Rotation', 'AngularVelocity', 'Torque', 'Friction', 'Mass'):
                item[tag[0].lower() + tag[1:]] = float(body.findtext(tag, '0'))
            bodies.append(item)
        joints = []
        for joint in world.findall('Joint'):
            joints.append({'body1': int(joint.get('body1_id')), 'body2': int(joint.get('body2_id')),
                           'anchor1': vector(joint.find('LocalAnchor1')),
                           'anchor2': vector(joint.find('LocalAnchor2')),
                           'relaxation': float(joint.findtext('Relaxation', '1')),
                           'sourceXML': ET.tostring(joint, encoding='unicode')})
        stars = [{'position': vector(c.find('Position')), 'radius': float(c.findtext('Radius')),
                  'sprite': sprite(c.get('gfx_file'))} for c in root.findall('Collectable')]
        levels.append({'id': path.stem, 'background': sprite(root.findtext('Background').strip()),
                       'gravity': {'x': float(world.get('gravity_x')), 'y': float(world.get('gravity_y'))},
                       'iterations': int(world.get('iterations')), 'bodies': bodies, 'joints': joints, 'stars': stars})
    for extra in ('title_screen.xml', 'background_end.xml'):
        sprite('data/gfx/' + extra)
    (target / 'levels.json').write_text(json.dumps({'levels': levels, 'sprites': sprites}, indent=2) + '\n', encoding='utf-8')
    (target / 'source-hashes.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
    shutil.copy2(source / 'readme.html', target / 'original-readme.html')
    print(f'Imported {len(levels)} levels, {sum(len(l["bodies"]) for l in levels)} bodies, {sum(len(l["joints"]) for l in levels)} joints, {len(sprites)} sprite definitions.')


if __name__ == '__main__':
    main()
