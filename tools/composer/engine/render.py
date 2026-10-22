"""Render a Cue: perform every part, mix stems through one hall, master, fold loop tails, encode, and write the
asset's provenance next to it."""
import os, json, hashlib, subprocess, datetime, tempfile
import numpy as np
import soundfile as sf

from . import dsp
from .dsp import SR
from .core import Performer, SAMPLES

RENDERER_VERSION = 'composer-1'
TARGETS = {'music': -18.0, 'interlude': -17.0, 'sting': -16.0}   # integrated LUFS; stings sit a touch hotter
LOOP_PAD = 0.2   # seconds of wrap-around audio before and after the loop region (survives MP3 encoder delay)


def render(cue, seed=1):
    perf = Performer(seed)
    n = int((cue.length_s + cue.pickup + cue.tail) * SR)
    ir = dsp.hall_ir(cue.hall, brightness=cue.brightness)
    stems = {}
    for part in cue.parts:
        dry = perf.render_part(part, cue, n)
        st = stems.setdefault(part.stem, {'dry': np.zeros((n, 2), 'float32'), 'send': np.zeros((n, 2), 'float32')})
        st['dry'] += dry
        st['send'] += dry * part.reverb
    for w in sorted(perf.warnings):
        print('   warning:', w)
    out = {}
    for name, st in stems.items():
        wet = dsp.convolve(st['send'], ir)[:n] * 0.5
        out[name] = dsp.highpass(st['dry'] + wet, 30)
    return out


def fold_loop(x, loop_samples):
    """Wrap everything after the loop end back onto its start so the loop repeats seamlessly, reverb included."""
    body = x[:loop_samples].copy()
    tail = x[loop_samples:]
    while len(tail):
        k = min(len(tail), loop_samples)
        body[:k] += tail[:k]
        tail = tail[k:]
    return body


def master(cue, stems):
    mix = sum(stems.values())
    mix = dsp.shelf(mix, 9000, 1.0, 'high')
    glued = dsp.glue(mix)
    g_glue = (np.abs(glued).sum() + 1e-9) / (np.abs(mix).sum() + 1e-9)
    if cue.loop:
        L = int(round(cue.length_s * SR))
        glued = fold_loop(glued, L)
        stems = {k: fold_loop(v, L) for k, v in stems.items()}
    else:
        glued, stems = trim_tail(glued, stems, -48 if cue.kind == 'sting' else -58)
    target = TARGETS.get(cue.kind, -18.0)
    lufs = dsp.loudness(glued)
    gain = 10 ** ((target - lufs) / 20)
    final = dsp.limit(glued * gain, -1.0)
    stems = {k: v * gain * g_glue for k, v in stems.items()}
    return final, stems


def trim_tail(x, stems, floor_db=-50):
    env = np.abs(x).max(1)
    thr = env.max() * 10 ** (floor_db / 20)
    end = len(env) - np.argmax(env[::-1] > thr)
    end = min(len(x), end + int(0.05 * SR))
    fade = int(0.4 * SR)
    def cut(v):
        v = v[:end].copy()
        v[-fade:] *= np.linspace(1, 0, fade)[:, None]
        return v
    return cut(x), {k: cut(v) for k, v in stems.items()}


def pad_loop(x):
    p = int(LOOP_PAD * SR)
    return np.concatenate([x[-p:], x, x[:p]])


def encode(x, path, quality=2):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t:
        sf.write(t.name, np.clip(x, -1, 1), SR, subtype='PCM_24')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', t.name, '-c:a', 'libmp3lame', '-q:a', str(quality),
                    '-ar', str(SR), path], check=True)
    os.unlink(t.name)
    data = open(path, 'rb').read()
    return hashlib.sha256(data).hexdigest(), len(data)


def sample_rev():
    try:
        return subprocess.run(['git', '-C', SAMPLES, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
    except Exception:
        return None


def write(cue, out_dir, site_prefix, asset_dir, score_path, brief, uses, tags, group, variant=None, stem_order=None):
    """Render, encode and describe one cue. Returns its /sounds record."""
    stems = render(cue)
    final, stems = master(cue, stems)
    file_id = cue.id + (f'.{variant}' if variant else '')
    audio = pad_loop(final) if cue.loop else final
    sha, size = encode(audio, os.path.join(out_dir, f'{file_id}.mp3'), 2)
    stem_rows = []
    if cue.loop and len(stems) > 1:
        for name in (stem_order or sorted(stems)):
            s_sha, s_size = encode(pad_loop(stems[name]), os.path.join(out_dir, f'{file_id}.stem-{name}.mp3'), 4)
            stem_rows.append({'name': name, 'url': f'{site_prefix}/{file_id}.stem-{name}.mp3', 'sha256': s_sha,
                              'bytes': s_size, **cue.stems.get(name, {})})
    duration = len(audio) / SR
    lufs = round(dsp.loudness(final), 1)
    peak = round(dsp.true_peak_db(final), 1)
    loop_points = {'start': LOOP_PAD, 'end': round(LOOP_PAD + cue.length_s, 6)} if cue.loop else None
    now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d')
    instruments = cue.instruments()
    fx = sorted({f[1] for p in cue.parts for f in p.fx})
    record = {
        'id': f'music.{file_id}', 'media': 'sound', 'name': cue.title + (f' ({variant})' if variant else ''),
        'kind': 'music', 'group': group, 'subject': brief.split('.')[0] + '.',
        'tags': tags + ([cue.kind] if cue.kind != 'music' else ['bed']) + (['loop'] if cue.loop else []),
        'uses': uses, 'loop': bool(cue.loop), 'loopPoints': loop_points,
        'urls': {'audio': f'{site_prefix}/{file_id}.mp3', **({'stems': stem_rows} if stem_rows else {})},
        'duration': round(duration, 3), 'loudness': lufs, 'peak': peak, 'channels': 2,
        'peaks': dsp.peaks(final), 'sha256': sha, 'bytes': size,
        'source': {'library': 'Abbie\'s World Composer (original score)', 'publisher': 'Abbie\'s World',
                   'path': score_path},
        'recipe': {'renderer': RENDERER_VERSION, 'score': score_path, 'bpm': cue.bpm, 'meter': f'{cue.bpb}/4',
                   'key': f'{cue.key.name} {cue.key.mode}', 'bars': cue.bars, 'instruments': instruments,
                   'percussion': fx, 'hall_seconds': cue.hall, 'target_lufs': TARGETS.get(cue.kind),
                   'samples': {'library': 'VS Chamber Orchestra: Community Edition', 'license': 'CC0-1.0',
                               'repo': 'https://github.com/sgossner/VSCO-2-CE', 'commit': sample_rev()}},
        'license': 'Original composition for Abbie\'s World. Performed with VS Chamber Orchestra CE samples (CC0).',
        'notes': [], 'date': now, 'provenance_url': f'https://github.com/evanrobinson2/abbiesworld_ios/blob/'
                                                     f'claude/live-snapshot-2026-10-22/{asset_dir}/provenance.json',
        'bpm': cue.bpm, 'key': f'{cue.key.name} {cue.key.mode}', 'beatsPerBar': cue.bpb,
        'cueKind': cue.kind, 'variant': variant, **({'motif': cue.meta['motif']} if 'motif' in cue.meta else {}),
    }
    return record
