#!/usr/bin/env python3
"""The family voice cast (Evan, 2026-10-23): one designed ElevenLabs voice per character, young and now, shared by every
memory place. Designed voices only (Voice Design from a written description): never a clone of a real person.

    cast.py design [--only daddy-young,abbie]   every description -> 3 previews each, saying the character's sample
    cast.py save [--picks daddy-young=2,...]     cast.json "picks" {character: candidate} -> saved voices ("voices")
    cast.py lines school-jump                    render that game's lines (lines/<game>.json) with the picked voices

Audio goes to out/ and from there to R2 (voices/...) in the voice-cast workflow; git keeps only the JSON:
candidates.json and lines manifests next to the study page (prototypes/ranch-atelier/dist/studies/family-cast/).
Runs on a runner because the cloud box can't reach api.elevenlabs.io. Secret: ELEVENLABS_API_KEY.
"""
import argparse, base64, hashlib, json, os, sys, time, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
STUDY = ROOT / 'prototypes/ranch-atelier/dist/studies/family-cast'
OUT = HERE / 'out'
API = 'https://api.elevenlabs.io'


def call(path, body, accept='application/json'):
    req = urllib.request.Request(API + path, data=json.dumps(body).encode(), headers={
        'xi-api-key': os.environ['ELEVENLABS_API_KEY'], 'Content-Type': 'application/json', 'Accept': accept})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
                return json.loads(data) if accept == 'application/json' else data
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')[:400]
            if e.code in (409, 429, 500, 502, 503) and attempt < 3:
                time.sleep(4 * (attempt + 1)); continue
            raise RuntimeError(f'{e.code} {msg}')


def public(key):
    # The Ranch site proxies /r2/ to the public bucket (dist/vercel.json), so pages play it same-origin.
    return f'/r2/{key}'


def design(cast, only):
    path = STUDY / 'candidates.json'
    got = json.loads(path.read_text()) if path.exists() else {'characters': {}}
    stamp = time.strftime('%Y%m%d%H%M', time.gmtime())
    for c in cast['characters']:
        if (only and c['id'] not in only) or not c['descriptions']:
            continue
        cands, errors = [], []
        for d, desc in enumerate(c['descriptions']):
            try:
                r = call('/v1/text-to-voice/design?output_format=mp3_44100_128',
                         {'voice_description': desc, 'model_id': cast.get('model', 'eleven_ttv_v3'), 'text': c['sample'], 'guidance_scale': 5})
            except Exception as e:  # one refused description (e.g. a child's voice) must not stop the cast
                print('refused', c['id'], d, e); errors.append({'description': d, 'error': str(e)}); continue
            for p in r['previews']:
                n = len(cands) + 1
                key = f"voices/cast/{c['id']}/{stamp}-{n}.mp3"
                (OUT / key).parent.mkdir(parents=True, exist_ok=True)
                (OUT / key).write_bytes(base64.b64decode(p['audio_base_64']))
                cands.append({'n': n, 'description': d, 'generated_voice_id': p['generated_voice_id'], 'url': public(key),
                              'seconds': round(p.get('duration_secs') or 0, 1)})
            print('designed', c['id'], d, len(r['previews']))
        got['characters'][c['id']] = {'name': c['name'], 'group': c['group'], 'sample': c['sample'],
                                      'descriptions': c['descriptions'], 'candidates': cands, 'errors': errors}
    got['model'] = cast.get('model'); got['rendered'] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    STUDY.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(got, indent=1, ensure_ascii=False) + '\n')


def save(cast, picks):
    for p in filter(None, picks.split(',')):
        cid, n = p.strip().split('=')
        cast['picks'][cid] = int(n); cast['voices'].pop(cid, None)
    cands = json.loads((STUDY / 'candidates.json').read_text())['characters']
    for cid, n in cast['picks'].items():
        if cid in cast['voices']:
            continue
        c = cands[cid]; pick = next(x for x in c['candidates'] if x['n'] == int(n))
        r = call('/v1/text-to-voice', {'voice_name': f"AW {c['name']}", 'voice_description': c['descriptions'][pick['description']],
                                       'generated_voice_id': pick['generated_voice_id'], 'labels': {'project': 'abbies-world', 'character': cid}})
        cast['voices'][cid] = r['voice_id']; print('saved', cid, r['voice_id'])
    (HERE / 'cast.json').write_text(json.dumps(cast, indent=1, ensure_ascii=False) + '\n')


def lines(cast, game):
    spec = json.loads((HERE / 'lines' / f'{game}.json').read_text())
    mf_path = STUDY / f'lines-{game}.json'
    old = json.loads(mf_path.read_text()) if mf_path.exists() else {'lines': {}}
    out = {'game': game, 'lines': {}}
    for lid, (who, text) in spec['lines'].items():
        voice = cast['voices'].get(who)
        if not voice:
            print('no voice yet for', who, lid); continue
        h = hashlib.sha1(f'{voice}|{text}'.encode()).hexdigest()[:10]
        key = f'voices/lines/{game}/{lid}-{h}.mp3'
        prev = old['lines'].get(lid)
        if not (prev and prev.get('hash') == h):
            audio = call(f'/v1/text-to-speech/{voice}?output_format=mp3_44100_128',
                         {'text': text, 'model_id': 'eleven_v3' if spec.get('v3') else 'eleven_multilingual_v2',
                          'voice_settings': {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.4, 'use_speaker_boost': True}}, accept='audio/mpeg')
            (OUT / key).parent.mkdir(parents=True, exist_ok=True); (OUT / key).write_bytes(audio); print('rendered', lid)
        out['lines'][lid] = {'who': who, 'text': text, 'hash': h, 'url': public(key)}
    mf_path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + '\n')


def main():
    a = argparse.ArgumentParser()
    a.add_argument('mode', choices=['design', 'save', 'lines'])
    a.add_argument('game', nargs='?')
    a.add_argument('--only', default='')
    a.add_argument('--picks', default='', help='save: character=n,... (adds to cast.json picks)')
    args = a.parse_args()
    if not os.environ.get('ELEVENLABS_API_KEY'):
        sys.exit('Set ELEVENLABS_API_KEY.')
    cast = json.loads((HERE / 'cast.json').read_text())
    OUT.mkdir(exist_ok=True)
    if args.mode == 'design':
        design(cast, set(filter(None, args.only.split(','))))
    elif args.mode == 'save':
        save(cast, args.picks)
    else:
        lines(cast, args.game)
    # The study page reads the sheets next to it.
    STUDY.mkdir(parents=True, exist_ok=True)
    (STUDY / 'cast.json').write_text((HERE / 'cast.json').read_text())


if __name__ == '__main__':
    main()
