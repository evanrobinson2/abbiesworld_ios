import copy
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('publisher', Path(__file__).with_name('publish.py'))
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class MemoryR2:
    def __init__(self):
        self.objects = {}
        self.race = False
    def request(self, method, key, body=b'', headers=None):
        headers = headers or {}
        old = self.objects.get(key)
        if method == 'GET':
            return (200, old, {'ETag': p.digest(old)}) if old is not None else (404, b'', {})
        if self.race and key.endswith('/current.json'):
            self.objects[key] = b'{"revision":"concurrent-winner"}'
            old = self.objects[key]
        if headers.get('if-none-match') == '*' and old is not None:
            return 412, b'', {}
        if 'if-match' in headers and (old is None or headers['if-match'] != p.digest(old)):
            return 412, b'', {}
        self.objects[key] = body
        return 200, b'', {}
    def public(self, url):
        key = 'studies/' + url.removeprefix(p.BASE).split('?')[0]
        return self.objects[key]

def bundle(label):
    files = {'index.html': ('<html><body>' + label + '</body></html>').encode(), 'module.mjs': b'export const value = 4;'}
    manifest = {'schemaVersion': 1, 'id': 'proof', 'entry': 'index.html', 'sourceSha': 'a' * 40, 'files': {n: {'sha256': p.digest(b), 'bytes': len(b)} for n, b in files.items()}}
    manifest['revision'] = p.digest(p.canonical(manifest))
    files['study-release.json'] = p.canonical(manifest)
    return manifest, files

class PublisherTests(unittest.TestCase):
    def test_remote_assets_require_declaration_but_navigation_does_not(self):
        p.validate_refs({'index.html': b'<a href="https://example.com/docs">Docs</a>'}, [])
        for markup in [b'<script src="https://example.com/a.js"></script>', b'<link href="https://example.com/a.css">', b'<img src="//example.com/a.png">']:
            with self.subTest(markup=markup), self.assertRaisesRegex(ValueError, 'Undeclared external asset'):
                p.validate_refs({'index.html': markup}, [])
        p.validate_refs({'index.html': b'<img src="https://example.com/a.png">'}, ['https://example.com/a.png'])

    def test_pack_instruments_subpages_and_keeps_fragments_as_data(self):
        source = 'a' * 40
        prefix = 'preview/proof/'
        spec = {'schemaVersion': 1, 'id': 'proof', 'maturity': 'Draft', 'entry': 'index.html', 'title': 'Proof', 'intent': 'Test', 'reviewQuestion': 'Works?', 'ownerThread': 'test'}
        blobs = {prefix + 'study.json': p.canonical(spec), p.CONTEXT: p.canonical({'studies': {'proof': {'title': 'Proof'}}}),
                 prefix + 'index.html': b'<html><body><script src="/view-context.js"></script></body></html>',
                 prefix + 'nested/page.html': b'<!doctype html><html><body>Page</body></html>',
                 prefix + 'fragment.html': b'<span>data</span>',
                 'tools/study-publish/review.mjs': b'// shared review', 'tools/study-publish/review.css': b'/* shared */'}
        def fake_git(*args):
            if args[0] == 'rev-parse':
                return source.encode()
            return '\n'.join(k for k in blobs if k.startswith(prefix)).encode()
        with patch.object(p, 'git', fake_git), patch.object(p, 'blob', lambda sha, path: blobs[path]):
            manifest, files = p.pack('proof', source)
            again, _ = p.pack('proof', source)
        self.assertEqual(manifest['revision'], again['revision'])
        self.assertEqual(files['index.html'].count(b'/view-context.js'), 1)
        self.assertIn(b'../_review/review.mjs', files['nested/page.html'])
        self.assertEqual(files['fragment.html'], b'<span>data</span>')

    def test_publish_promote_update_rollback_preserves_versions(self):
        store = MemoryR2()
        a, af = bundle('first'); b, bf = bundle('second')
        with patch.object(p, 'public_read', store.public):
            p.publish(store, a, af)
            p.promote(store, 'proof', a['revision'], 'none')
            p.publish(store, b, bf)
            p.promote(store, 'proof', b['revision'], a['revision'])
            p.promote(store, 'proof', a['revision'], b['revision'])
        self.assertEqual(p.json.loads(store.objects['studies/proof/current.json'])['revision'], a['revision'])
        self.assertEqual(store.objects[f"studies/proof/versions/{b['revision']}/index.html"], bf['index.html'])
        self.assertEqual(len([k for k in store.objects if '/promotions/' in k]), 3)

    def test_stale_and_racing_promotion_never_overwrite_winner(self):
        store = MemoryR2(); a, af = bundle('first'); b, bf = bundle('second')
        with patch.object(p, 'public_read', store.public):
            p.publish(store, a, af); p.publish(store, b, bf)
            p.promote(store, 'proof', a['revision'], 'none')
            with self.assertRaisesRegex(ValueError, 'Stale'):
                p.promote(store, 'proof', b['revision'], 'none')
            store.race = True
            with self.assertRaisesRegex(ValueError, 'Concurrent'):
                p.promote(store, 'proof', b['revision'], a['revision'])
            self.assertEqual(store.objects['studies/proof/current.json'], b'{"revision":"concurrent-winner"}')

    def test_create_once_retry_and_collision(self):
        store = MemoryR2()
        p.immutable(store, 'studies/proof/a', b'a', 'text/plain')
        p.immutable(store, 'studies/proof/a', b'a', 'text/plain')
        with self.assertRaisesRegex(ValueError, 'collision'):
            p.immutable(store, 'studies/proof/a', b'b', 'text/plain')

    def test_partial_upload_or_corruption_cannot_promote(self):
        store = MemoryR2(); a, af = bundle('first')
        with patch.object(p, 'public_read', store.public):
            p.publish(store, a, af)
            store.objects[f"studies/proof/versions/{a['revision']}/module.mjs"] = b'corrupted'
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                p.promote(store, 'proof', a['revision'], 'none')
        self.assertNotIn('studies/proof/current.json', store.objects)

    def test_missing_imports_escape_and_undeclared_app_dependencies(self):
        with self.assertRaisesRegex(ValueError, 'Missing dependency'):
            p.validate_refs({'index.html': b'<script src="missing.mjs"></script>'}, [])
        with self.assertRaisesRegex(ValueError, 'escapes'):
            p.validate_refs({'x.mjs': b'import "../private.mjs"'}, [])
        with self.assertRaisesRegex(ValueError, 'Undeclared app'):
            p.validate_refs({'x.mjs': b'import "/simulations/live.mjs"'}, [])
        p.validate_refs({'x.mjs': b'import "./nested/a.mjs"', 'nested/a.mjs': b'export const a=1;'}, [])

    def test_unsafe_public_paths(self):
        for name in ['../index.html', '/index.html', '.env', 'nested/../a.js', 'credentials.json', 'a\\b.js', 'x.pem', 'a//b.js']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                p.safe_path(name)

    def test_manifest_tamper_rejected(self):
        store = MemoryR2(); a, af = bundle('first')
        with patch.object(p, 'public_read', store.public):
            p.publish(store, a, af)
            changed = copy.deepcopy(a); changed['entry'] = 'module.mjs'
            store.objects[f"studies/proof/versions/{a['revision']}/study-release.json"] = p.canonical(changed)
            with self.assertRaisesRegex(ValueError, 'digest mismatch'):
                p.promote(store, 'proof', a['revision'], 'none')

if __name__ == '__main__':
    unittest.main()
