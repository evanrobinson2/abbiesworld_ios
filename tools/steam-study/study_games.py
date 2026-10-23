"""Write Oracle study notes into Steam profiles (docs/oracle/games/<slug>.json).

    python study_games.py          # library_notes.py (installed), owned_notes.py (owned, not installed), free_notes.py,
                                   # reference_notes.py (reference games outside the library)

Rendering (how each game is shaded) comes from rendering_notes.py.

An existing profile keeps its store metadata and install fingerprint; only its identity, DNA and study fields are
replaced. New profiles get the same shape with the store fields we know. Then run `node sync-repo-data.mjs` in
prototypes/game-oracle.
"""
import json
from pathlib import Path

from free_notes import FREE
from library_notes import LIBRARY
from owned_notes import OWNED
from reference_notes import REFERENCE
from rendering_notes import rendering_for

GAMES = Path(__file__).resolve().parents[2] / 'docs' / 'oracle' / 'games'
AXES = ['tempo', 'challenge', 'expression', 'structure', 'social', 'systems', 'chance', 'session']
MODES = ['diegetic', 'spatial', 'meta', 'overlay', 'none']
METHOD = 'Oracle study from public knowledge of the game, in our own words; not yet measured on capture'
SOURCE = 'oracle study 2026-10-23 (public knowledge, no store fetch, no game files)'


def pace(tempo, session):
    speed = 'slow' if tempo <= 3 else 'brisk' if tempo <= 6 else 'fast'
    length = 'short sessions' if session <= 3 else 'medium sessions' if session <= 6 else 'long sessions'
    return f'{speed}, {length}'


def study(row, free):
    if free:
        slug, appid, name, family, genres, summary, camera, loop, feel, info, art, audio, lesson, axes, mix, hud, conf, review = row
    else:
        slug, appid, name, genres, summary, camera, loop, feel, info, art, audio, lesson, axes, mix, hud, conf = row
        family, review = None, None
    studied = not loop.startswith('Not yet studied')
    axes = dict(zip(AXES, (int(c) / 9 for c in axes)))
    grammar = {
        'overall_mix': {m: int(c) / 10 for m, c in zip(MODES, mix) if c != '0'},
        'screen_budget': {'hud_coverage': {'value': hud / 100, 'source': 'estimate', 'confidence': round(conf * 0.7, 2), 'method': METHOD}},
        'note': info,
        'confidence': conf,
        'source': 'estimate',
    } if studied else None
    identity = {
        'core_loop': loop if studied else None,
        'mechanics': None,
        'ui_and_game_feel': feel if studied else None,
        'information_grammar': grammar,
        'camera': camera if studied else None,
        'art_direction': art if studied else None,
        'rendering': rendering_for(slug, art) if studied else rendering_for(slug, None),
        'palette': None,
        'audio_mood': audio if studied else None,
        'pacing': pace(round(axes['tempo'] * 9), round(axes['session'] * 9)) if studied else None,
        'lessons_for_abbies_world': lesson if studied else None,
    }
    dna = {'schema': 'oracle.dna.v1', 'axes': {k: round(v, 2) for k, v in axes.items()}, 'confidence': conf if studied else 0.1}
    return slug, appid, name, genres.split(';'), summary, identity, dna, family, review, studied


def write(row, free, installed=True, owned=True):
    slug, appid, name, genres, summary, identity, dna, family, review, studied = study(row, free)
    path = GAMES / f'{slug}.json'
    profile = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {
        'appid': appid, 'name': name,
        'store_url': f'https://store.steampowered.com/app/{appid}/' if appid else None,
        'genres': genres, 'short_description': summary, 'sources': [],
    }
    profile.setdefault('study_genres', genres)
    profile['summary'] = summary
    profile['identity'] = identity
    profile['dna'] = dna
    profile['study'] = {'set': 'free-25' if free else 'reference' if not owned else 'library' if installed else 'owned',
                        'owned': not free and owned, 'installed': not free and owned and installed,
                        'status': 'studied' if studied else 'needs play session', 'date': '2026-10-23'}
    if family:
        profile['study']['family'] = family
    if review:
        profile['review'] = review
    profile['sources'] = [s for s in profile.get('sources', []) if not s.startswith('oracle study')] + [SOURCE]
    path.write_text(json.dumps(profile, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return studied


if __name__ == '__main__':
    lib = [write(r, False) for r in LIBRARY]
    owned = [write(r, False, installed=False) for r in OWNED]
    free = [write(r, True) for r in FREE]
    ref = [write(r, False, installed=False, owned=False) for r in REFERENCE]
    print(f'library: {sum(lib)} of {len(lib)} studied; owned: {sum(owned)} of {len(owned)} studied; '
          f'free: {sum(free)} of {len(free)} studied; reference: {sum(ref)} of {len(ref)} studied')
