"""Submit one Rooftop image-to-3D trial; resume without duplicate paid jobs."""
import base64
import getpass
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = Path(__file__).resolve().parent
ROOT = HERE / 'meshy_scene_trial'
SOURCE = HERE / 'references/rooftop-source.png'
BASE = 'https://api.meshy.ai/openapi/v1'
OPTIONS = {
    'model_type': 'standard',
    'ai_model': 'meshy-7.1',
    'geometry_resolution': 'standard',
    'should_texture': True,
    'texture_resolution': '4k',
    'enable_pbr': True,
    'should_remesh': False,
    'image_enhancement': False,
    'target_formats': ['glb', 'usdz'],
    'multi_view_thumbnails': True,
}


def save(name, value):
    target = ROOT / name
    temporary = target.with_suffix(target.suffix + '.tmp')
    temporary.write_text(json.dumps(value, indent=2) + '\n')
    temporary.replace(target)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def main():
    ROOT.mkdir(exist_ok=True)
    key = os.environ.get('MESHY_API_KEY', '').strip()
    if not key:
        if not sys.stdin.isatty():
            raise RuntimeError('Private terminal or MESHY_API_KEY required.')
        key = getpass.getpass('Meshy key (hidden): ').strip()
    if not key:
        raise RuntimeError('No credential supplied.')
    opener = urllib.request.build_opener(NoRedirect)

    def request(method, path, body=None):
        payload = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(BASE + path, data=payload, method=method,
            headers={'Authorization': 'Bearer ' + key,
                     'Content-Type': 'application/json', 'Accept': 'application/json'})
        try:
            with opener.open(req, timeout=120) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors='replace').replace(key, '[redacted]')
            raise RuntimeError(f'Meshy HTTP {error.code}: {detail[:600]}') from None
        except urllib.error.URLError as error:
            raise RuntimeError('Meshy network error: ' + str(error.reason).replace(key, '[redacted]')) from None

    request('GET', '/image-to-3d?page_size=1')
    print('Meshy authentication verified.', flush=True)
    state_path = ROOT / 'job.json'
    if state_path.exists():
        state = json.loads(state_path.read_text())
        task = state['task_id']
        print('Resuming existing image trial; no new submission.', flush=True)
    else:
        marker = ROOT / 'submission-started.json'
        if marker.exists():
            raise RuntimeError('Prior submission may have reached Meshy. Inspect account before retrying.')
        source = SOURCE.read_bytes()
        digest = hashlib.sha256(source).hexdigest()
        save('request.json', {
            'input_image': '../references/rooftop-source.png',
            'input_sha256': digest, 'options': OPTIONS,
            'documented_credit_cost': 30,
            'pricing_source': 'https://docs.meshy.ai/en/api/pricing',
            'authorization': 'User: give the image to meshy. One direct image-to-3D trial.',
            'image_use': 'Original image bytes sent directly; no crop, enhancement or replacement.'})
        data = dict(OPTIONS)
        data['image_url'] = 'data:image/png;base64,' + base64.b64encode(source).decode()
        # Never automatically repeat this POST after an ambiguous network result.
        with marker.open('x') as stream:
            json.dump({'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
                       'input_sha256': digest}, stream, indent=2)
        created = request('POST', '/image-to-3d', data)
        task = created['result']
        state = {'task_id': task, 'status': 'PENDING', 'provider': 'Meshy',
                 'created_utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
        save('job.json', state)
        print('One image-to-3D trial submitted (30 documented credits).', flush=True)
    last = None
    while True:
        result = request('GET', '/image-to-3d/' + task)
        status, progress = result['status'], result.get('progress', 0)
        state.update(status=status, progress=progress, consumed_credits=result.get('consumed_credits'))
        save('job.json', state)
        if (status, progress) != last:
            print(f'Meshy: {status} {progress}%', flush=True)
            last = (status, progress)
        if status == 'SUCCEEDED':
            break
        if status in ('FAILED', 'CANCELED', 'EXPIRED'):
            raise RuntimeError('Task ended: ' + status + ' ' + str(result.get('task_error', {})).replace(key, '[redacted]'))
        time.sleep(15)

    files = []

    def download(url, name):
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.meshy.ai'):
            raise RuntimeError('Unexpected asset host; task preserved for inspection.')
        path = ROOT / name
        # Separate unauthenticated opener; API credentials are never sent to asset hosts.
        with opener.open(urllib.request.Request(url), timeout=180) as response:
            path.write_bytes(response.read())
        files.append({'file': name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                      'bytes': path.stat().st_size,
                      'source': urllib.parse.urlunparse(parsed._replace(query='', fragment=''))})
        print('Downloaded ' + name, flush=True)

    for kind in ('glb', 'usdz'):
        url = result.get('model_urls', {}).get(kind)
        if url:
            download(url, 'rooftop-meshy.' + kind)
    if result.get('thumbnail_url'):
        download(result['thumbnail_url'], 'preview.png')
    for view, url in result.get('thumbnail_urls', {}).items():
        if view in ('front', 'right', 'back', 'left') and url:
            download(url, 'preview-' + view + '.png')
    for index, maps in enumerate(result.get('texture_urls', [])):
        for kind, url in maps.items():
            if kind in ('base_color', 'metallic', 'roughness', 'normal', 'emission') and url:
                download(url, f'texture-{index}-{kind}.png')
    save('provenance.json', {
        'provider': 'Meshy', 'task_id': task, 'ai_model': OPTIONS['ai_model'],
        'input_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'consumed_credits': result.get('consumed_credits'), 'files': files,
        'status': 'Generated candidate. Separate experiment; not integrated into game.'})
    print('Completed. Actual consumed credits: ' + str(result.get('consumed_credits')), flush=True)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
