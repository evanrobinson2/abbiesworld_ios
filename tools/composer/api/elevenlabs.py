"""Generate Abbie's World music with the ElevenLabs Music API.

Why ElevenLabs (2026-10-22): licensed training data, composition plans, and terms that allow its output in an
indie game (under $500k revenue) on any paid plan from Starter up, with no limit on the players' ages. Google
Lyria is ruled out: the Gemini API and Vertex AI terms ban apps likely to be used by under-18s.

Takes go to tools/composer/out/api/<cue>/ (git-ignored), each with a JSON sidecar recording provider, model,
plan, song id, date and hash. Nothing here touches the live site.

    ELEVENLABS_API_KEY=... python3 tools/composer/api/elevenlabs.py --only ranch-morning --takes 3
    python3 tools/composer/api/elevenlabs.py --dry-run      # print the plans, spend nothing
"""
import argparse, datetime, hashlib, json, os, subprocess, sys, urllib.error, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out', 'api')
TAKES = os.path.join(HERE, '..', 'takes')
API = 'https://api.elevenlabs.io/v1/music'


def plan(cue, palette):
    return {
        'positive_global_styles': palette['positive'] + cue['styles'],
        'negative_global_styles': palette['negative'],
        'sections': [{'section_name': name, 'positive_local_styles': styles, 'negative_local_styles': [],
                      'duration_ms': ms, 'lines': []} for name, styles, ms in cue['sections']],
    }


def prompt(cue, palette):
    """Plain-prompt fallback for when the API rejects a plan."""
    parts = [', '.join(palette['positive'] + cue['styles'])]
    parts += [f"{name}: {', '.join(styles)}" for name, styles, _ in cue['sections']]
    parts.append('No ' + ', no '.join(palette['negative']))
    return '. '.join(parts)[:4000]


def compose(key, body, fmt):
    url = API + (f'?output_format={fmt}' if fmt else '')
    req = urllib.request.Request(url, json.dumps(body).encode(), method='POST',
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=600) as r:
        return r.read(), r.headers.get('song-id')


def master(src, lufs):
    """Loudness-match a take to the score's targets (beds -18, interludes -17, stings -16 LUFS, -1 dBTP).
    Two-pass loudnorm in linear mode: measure, then one gain for the whole take, so dynamics are untouched."""
    dst = src.replace('.mp3', '.master.mp3')
    target = f'I={lufs}:TP=-1:LRA=20'
    probe = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src, '-af', f'loudnorm={target}:print_format=json',
                            '-f', 'null', '-'], capture_output=True, text=True, check=True).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}') + 1])
    measured = (f":measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
                f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f'loudnorm={target}{measured}',
                    '-ar', '48000', '-c:a', 'libmp3lame', '-b:a', '192k', dst], check=True)
    return dst


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', nargs='*', help='cue ids (default: all)')
    ap.add_argument('--takes', type=int, default=2)
    ap.add_argument('--model', default='music_v2_5')
    ap.add_argument('--format', default='', help='output_format, e.g. mp3_48000_192 (default: API auto)')
    ap.add_argument('--briefs', default='briefs.json', help='briefs file in tools/composer/api')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--no-master', action='store_true')
    a = ap.parse_args()

    briefs = json.load(open(os.path.join(HERE, a.briefs)))
    cues = [c for c in briefs['cues'] if not a.only or c['id'] in a.only]
    if a.dry_run:
        for c in cues:
            print(c['id'], json.dumps(plan(c, briefs['palette']), indent=1))
        return
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        sys.exit('Set ELEVENLABS_API_KEY (an ElevenLabs Starter plan or higher; see README).')

    for c in cues:
        folder = os.path.join(OUT, c['id'])
        os.makedirs(folder, exist_ok=True)
        # Number on from takes already reviewed in the repo, so a new run never overwrites one.
        kept = os.path.join(TAKES, c['id'])
        start = max([0] + [int(f.split('-')[1].split('.')[0]) for d in (folder, kept) if os.path.isdir(d)
                           for f in os.listdir(d) if f.startswith('take-') and f.endswith('.json')])
        for n in range(start + 1, start + 1 + a.takes):
            # music_v2* rejects v1 composition plans ("Invalid type of composition_plan"), so it gets the
            # same sections written out as a prompt.
            if a.model.startswith('music_v2'):
                body = {'prompt': prompt(c, briefs['palette']), 'model_id': a.model, 'force_instrumental': True,
                        'music_length_ms': sum(s[2] for s in c['sections'])}
            else:
                body = {'composition_plan': plan(c, briefs['palette']), 'model_id': a.model}
            try:
                audio, song = compose(key, body, a.format)
            except urllib.error.HTTPError as e:
                if e.code != 422:
                    sys.exit(f'{c["id"]}: ElevenLabs said {e.code}: {e.read()[:400].decode(errors="replace")}'
                             + (' (Music needs a paid plan, Starter or higher)' if e.code == 402 else ''))
                print(f'  {c["id"]}: plan rejected ({e.read()[:200]!r}), using a prompt instead')
                body = {'prompt': prompt(c, briefs['palette']), 'model_id': a.model, 'force_instrumental': True,
                        'music_length_ms': sum(s[2] for s in c['sections'])}
                audio, song = compose(key, body, a.format)
            path = os.path.join(folder, f'take-{n}.mp3')
            open(path, 'wb').write(audio)
            record = {'id': c['id'], 'take': n, 'title': c['title'], 'kind': c['kind'], 'provider': 'elevenlabs',
                      'model': a.model, 'briefs': a.briefs, 'song_id': song, 'request': body,
                      'date': datetime.date.today().isoformat(), 'sha256': hashlib.sha256(audio).hexdigest(),
                      'licence': 'ElevenLabs Music Terms, paid plan: commercial use incl. indie games (<$500k revenue)'}
            # Traceability (Music Bible section 9): identity, source motif, world/place/situation, key, tempo,
            # instrumentation, mood, intensity, variants and intended length, when the briefs file carries them.
            if 'identity' in briefs or 'trace' in c:
                record['trace'] = {**briefs.get('identity', {}), **c.get('trace', {}),
                                   'briefs_about': briefs.get('about', ''), 'styles': c['styles'],
                                   'sections': [[n, st, ms] for n, st, ms in c['sections']],
                                   'duration_ms': sum(s[2] for s in c['sections'])}
            if not a.no_master:
                record['master'] = os.path.basename(master(path, c['lufs']))
            json.dump(record, open(path.replace('.mp3', '.json'), 'w'), indent=1)
            print(f'  {c["id"]} take {n}: {len(audio) // 1024} KB, song {song}')


if __name__ == '__main__':
    main()
