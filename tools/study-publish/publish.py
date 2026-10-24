"""Versioned study publisher. Only this trusted tool runs with R2 credentials.

Study source is read as Git blobs, never imported or executed. See docs/design/STUDIES.md.
"""
import argparse
import datetime as dt
import hashlib
import hmac
import json
import mimetypes
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://app.abbies.world/r2/studies/'
ID = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*\Z')
REV = re.compile(r'[a-f0-9]{64}\Z')
LEVELS = ['Exploration', 'Proposal', 'Draft', 'Final / Game Ready']
EXT = {'.html', '.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.glb', '.gltf', '.bin', '.wasm', '.woff2', '.mp3', '.ogg', '.wav', '.mp4'}
ROOT = Path(__file__).resolve().parents[2]
CONTEXT = 'prototypes/ranch-atelier/dist/studies/context.json'

def require(ok, message):
    if not ok:
        raise ValueError(message)

def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()

def digest(data):
    return hashlib.sha256(data).hexdigest()

def safe_path(value):
    require(isinstance(value, str) and re.fullmatch(r'[A-Za-z0-9_./-]+', value), 'Invalid file path')
    require(not value.startswith('/') and all(p not in ('', '.', '..') and not p.startswith('.') for p in value.split('/')), 'Unsafe file path')
    require(PurePosixPath(value).suffix.lower() in EXT, 'Unsupported public file type: ' + value)
    require(not re.search(r'(secret|credential|password|\.env)', value, re.I), 'Private-looking filename')
    return value

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def blob(sha, path):
    row = git('ls-tree', sha, '--', path).decode().strip()
    require(row.startswith('100644 blob ') or row.startswith('100755 blob '), 'Only tracked regular files may publish: ' + path)
    return git('show', sha + ':' + path)

def references(name, data):
    if PurePosixPath(name).suffix not in {'.html', '.js', '.mjs', '.css'}:
        return []
    text = data.decode('utf-8')
    require(not re.search(r'<base\b|serviceWorker\s*\.\s*register', text, re.I), 'Base tags and service workers are not supported in study bundles')
    refs = re.findall(r'''(?:src|href)\s*=\s*["']([^"']+)["']''', text) if name.endswith('.html') else []
    refs += re.findall(r'''(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)["']([^"']+)["']''', text)
    refs += re.findall(r'''url\(\s*["']?([^\s)'";]+)''', text)
    return refs

def validate_refs(files, external):
    for name, data in files.items():
        for ref in references(name, data):
            if ref.startswith(('#', 'data:', 'mailto:', 'https://')):
                # Navigation links are allowed; remote code/assets must be declared separately in the manifest.
                if ref.startswith('https://') and not name.endswith('.html'):
                    require(ref in external, 'Undeclared external import: ' + ref)
                continue
            if ref.startswith('/'):
                require(ref in external or ref == '/view-context.js', 'Undeclared app dependency: ' + ref)
                continue
            path = urllib.parse.urlsplit(ref).path
            if not path:
                continue
            resolved = str(PurePosixPath(name).parent / path)
            parts = []
            for part in resolved.split('/'):
                if part == '..':
                    require(bool(parts), 'Import escapes bundle: ' + ref)
                    parts.pop()
                elif part != '.':
                    parts.append(part)
            require('/'.join(parts) in files, f'Missing dependency in {name}: {ref}')

def pack(study, sha):
    require(ID.fullmatch(study) and len(study) <= 80, 'Invalid study ID')
    require(re.fullmatch(r'[a-f0-9]{40}', sha), 'Use an exact 40-character source SHA')
    prefix = 'preview/' + study + '/'
    spec = json.loads(blob(sha, prefix + 'study.json'))
    require(spec.get('schemaVersion') == 1 and spec.get('id') == study, 'Manifest version/identity mismatch')
    require(spec.get('maturity') in LEVELS, 'Missing maturity stamp')
    for field in ['title', 'intent', 'reviewQuestion', 'ownerThread']:
        require(isinstance(spec.get(field), str) and 0 < len(spec[field]) <= 2000, 'Missing ' + field)
    entry = safe_path(spec.get('entry', 'index.html'))
    require(entry.endswith('.html'), 'Entry must be HTML')
    context = json.loads(blob(sha, CONTEXT))['studies'].get(study)
    require(context, 'Register this study in existing studies/context.json first')
    files = {}
    for record in git('ls-tree', '-r', '--name-only', sha, '--', prefix).decode().splitlines():
        name = record[len(prefix):]
        if name == 'study.json':
            continue
        safe_path(name)
        require(not name.startswith('_review/') and name != 'study-release.json', 'Reserved publisher path')
        files[name] = blob(sha, record)
    for item in spec.get('shared', []):
        source, target = safe_path(item['source']), safe_path(item['target'])
        require(source.startswith('prototypes/ranch-atelier/dist/'), 'Shared files must come from the existing app')
        relative = source.removeprefix('prototypes/ranch-atelier/dist/')
        require(relative.split('/')[0] not in {'api', 'lib', 'tests', 'mcp', 'scripts', 'public-build', 'node_modules'}, 'Server/private source cannot publish')
        require(target not in files and not target.startswith('_review/') and target != 'study-release.json', 'Duplicate or reserved target')
        files[target] = blob(sha, source)
    require(entry in files, 'Missing entry')
    external = spec.get('external', [])
    require(isinstance(external, list) and all(isinstance(x, str) and (x.startswith('/') and not x.startswith('//') or x.startswith('https://')) for x in external), 'Invalid external dependencies')
    validate_refs(files, external)
    # The publisher adds the same review UI to every entry, from trusted main tooling.
    html = files[entry].decode('utf-8')
    require('<body' in html.lower() and '</body>' in html.lower(), 'Use an explicit HTML body')
    require(not re.search(r'\bon[a-z]+\s*=', html, re.I), 'Use module event listeners, not inline handlers')
    depth = len(PurePosixPath(entry).parts) - 1
    relative = '../' * depth
    bridge = '' if re.search(r'<script[^>]+src=["\']/view-context\.js["\']', html) else '<script src="/view-context.js"></script>'
    html = re.sub(r'(<body\b[^>]*>)', r'\1' + bridge, html, count=1, flags=re.I)
    html = re.sub(r'</body>', f'<script type="module" src="{relative}_review/review.mjs"></script></body>', html, count=1, flags=re.I)
    files[entry] = html.encode()
    for name in ['review.mjs', 'review.css']:
        files['_review/' + name] = (Path(__file__).parent / name).read_bytes()
    require(len(files) <= 500 and sum(map(len, files.values())) <= 50 * 1024 * 1024, 'Bundle limit: 500 files / 50 MiB; put large shared assets in the existing asset store')
    manifest = {**spec, 'context': context, 'sourceSha': sha, 'publisherSha': git('rev-parse', 'HEAD').decode().strip(), 'files': {n: {'sha256': digest(b), 'bytes': len(b)} for n, b in sorted(files.items())}}
    revision = digest(canonical(manifest))
    manifest['revision'] = revision
    files['study-release.json'] = canonical(manifest)
    return manifest, files

class R2:
    """Small SigV4 transport: no SDK install, redirects, shell commands or credential output."""
    def __init__(self):
        self.account = os.environ['R2_ACCOUNT_ID']
        self.bucket = os.environ['R2_BUCKET']
        self.key = os.environ['AWS_ACCESS_KEY_ID']
        self.secret = os.environ['AWS_SECRET_ACCESS_KEY']
        require(re.fullmatch(r'[a-f0-9]{32}', self.account), 'Invalid R2 account')
        require(re.fullmatch(r'[a-z0-9][a-z0-9-]{1,61}[a-z0-9]', self.bucket), 'Invalid R2 bucket')

    def request(self, method, key, body=b'', headers=None):
        require(key.startswith('studies/') and '..' not in key.split('/'), 'Outside study namespace')
        now = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        day = now[:8]
        host = self.account + '.r2.cloudflarestorage.com'
        uri = '/' + urllib.parse.quote(self.bucket + '/' + key, safe='/~')
        heads = {'host': host, 'x-amz-date': now, 'x-amz-content-sha256': digest(body), **(headers or {})}
        names = ';'.join(sorted(heads))
        request = '\n'.join([method, uri, '', ''.join(k + ':' + str(heads[k]).strip() + '\n' for k in sorted(heads)), names, digest(body)])
        scope = day + '/auto/s3/aws4_request'
        signing = ('AWS4' + self.secret).encode()
        for part in [day, 'auto', 's3', 'aws4_request']:
            signing = hmac.new(signing, part.encode(), hashlib.sha256).digest()
        signature = hmac.new(signing, ('AWS4-HMAC-SHA256\n' + now + '\n' + scope + '\n' + digest(request.encode())).encode(), hashlib.sha256).hexdigest()
        heads['Authorization'] = f'AWS4-HMAC-SHA256 Credential={self.key}/{scope}, SignedHeaders={names}, Signature={signature}'
        req = urllib.request.Request('https://' + host + uri, data=body if method == 'PUT' else None, headers=heads, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return response.status, response.read(), dict(response.headers)
        except urllib.error.HTTPError as error:
            if error.code in (404, 409, 412):
                return error.code, b'', {}
            raise RuntimeError(f'R2 {method} failed with HTTP {error.code}') from None

def immutable(store, key, data, mime):
    code, _, _ = store.request('PUT', key, data, {'if-none-match': '*', 'content-type': mime, 'cache-control': 'public, max-age=31536000, immutable'})
    if code in (409, 412):
        status, existing, _ = store.request('GET', key)
        require(status == 200 and existing == data, 'Immutable object collision: ' + key)
    else:
        require(code == 200, 'Upload failed')

def verify(manifest, fetcher):
    for name, expected in manifest['files'].items():
        safe_path(name)
        data = fetcher(name)
        require(digest(data) == expected['sha256'], 'Published hash mismatch: ' + name)

def public_read(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'Cache-Control': 'no-cache'}), timeout=40) as response:
        return response.read()

def publish(store, manifest, files):
    prefix = f"studies/{manifest['id']}/versions/{manifest['revision']}/"
    for name, data in files.items():
        mime = {'.mjs': 'application/javascript', '.js': 'application/javascript', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary'}.get(PurePosixPath(name).suffix) or mimetypes.guess_type(name)[0] or 'application/octet-stream'
        immutable(store, prefix + name, data, mime)
    url = BASE + f"{manifest['id']}/versions/{manifest['revision']}/"
    verify(manifest, lambda name: public_read(url + name))
    require(public_read(url + 'study-release.json') == files['study-release.json'], 'Manifest readback failed')
    return url + manifest['entry']

def promote(store, study, revision, expected):
    require(ID.fullmatch(study) and len(study) <= 80 and REV.fullmatch(revision), 'Invalid promotion target')
    require(expected == 'none' or REV.fullmatch(expected), 'Supply the expected current revision (or none)')
    prefix = f'studies/{study}/'
    code, data, _ = store.request('GET', prefix + 'versions/' + revision + '/study-release.json')
    require(code == 200, 'Revision is not uploaded')
    manifest = json.loads(data)
    require(manifest.get('id') == study and manifest.get('revision') == revision, 'Manifest identity mismatch')
    unhashed = {k: v for k, v in manifest.items() if k != 'revision'}
    require(digest(canonical(unhashed)) == revision, 'Manifest digest mismatch')
    verify(manifest, lambda n: public_read(BASE + study + '/versions/' + revision + '/' + n))
    code, previous, headers = store.request('GET', prefix + 'current.json')
    require(code in (200, 404), 'Cannot read current revision')
    old = json.loads(previous) if code == 200 else None
    require((old['revision'] if old else 'none') == expected, 'Stale promotion: current revision changed; review it before retrying')
    etag = next((v for k, v in headers.items() if k.lower() == 'etag'), None)
    require(not old or etag, 'Missing pointer ETag')
    # A stable loader never embeds a revision. Old URLs remain usable after any promotion.
    loader = (Path(__file__).parent / 'index.html').read_bytes()
    immutable(store, prefix + 'index.html', loader, 'text/html')
    pointer = {'schemaVersion': 1, 'id': study, 'revision': revision, 'entry': safe_path(manifest['entry']), 'previous': expected, 'sourceSha': manifest['sourceSha'], 'promotedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'run': os.environ.get('GITHUB_RUN_ID', 'local')}
    history = canonical(pointer)
    immutable(store, prefix + 'promotions/' + digest(history) + '.json', history, 'application/json')
    condition = {'if-match': etag} if old else {'if-none-match': '*'}
    code, _, _ = store.request('PUT', prefix + 'current.json', history, {**condition, 'content-type': 'application/json', 'cache-control': 'no-store'})
    require(code == 200, 'Concurrent promotion rejected; inspect current.json before retrying')
    require(public_read(BASE + study + '/current.json?verify=' + digest(history)) == history, 'Pointer freshness check failed; do not claim promotion delivered')
    return BASE + study + '/index.html'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['check', 'publish', 'promote'])
    parser.add_argument('--id', required=True)
    parser.add_argument('--sha')
    parser.add_argument('--revision')
    parser.add_argument('--expected')
    args = parser.parse_args()
    if args.action == 'promote':
        url = promote(R2(), args.id, args.revision or '', args.expected or '')
        result = {'url': url, 'revision': args.revision, 'status': 'published; browser, feedback and capture acceptance still required'}
    else:
        manifest, files = pack(args.id, args.sha or '')
        result = {'id': args.id, 'revision': manifest['revision'], 'files': len(files), 'bytes': sum(map(len, files.values())), 'sourceSha': manifest['sourceSha']}
        if args.action == 'publish':
            result['url'] = publish(R2(), manifest, files)
        else:
            out = ROOT / '.study-output' / args.id / manifest['revision']
            for name, data in files.items():
                target = out / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
            result['localOutput'] = str(out)
    print(json.dumps(result))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as output:
            output.write('```json\n' + json.dumps(result, indent=2) + '\n```\n')

if __name__ == '__main__':
    main()
