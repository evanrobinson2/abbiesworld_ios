#!/usr/bin/env python3
"""Narration for the demo's opening tour (Evan, 2026-10-23), rendered with ElevenLabs text to speech.

The lines live in one place, simulations/demo/script.mjs (TOUR beats with an id, a speaker and a text). This reads them
and writes simulations/demo/voice/<id>.mp3 plus manifest.json, which the tour plays (chat.mjs falls back to the browser
voice for any line without a file). A line whose text and voice have not changed is kept. Designed voices only, never a
clone: the voice ids come from the family cast (tools/voice-cast/cast.json, 'voices': abbie and ani), or --abbie/--ani.
Spend goes through wallet().charge, so run this from the workflow, not by hand; the cloud box can't reach api.elevenlabs.io.

    ELEVENLABS_API_KEY=... python3 tools/demo-narration/render.py [--abbie <voice id> --ani <voice id>] [--dry-run]
"""
import argparse, hashlib, json, os, re, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEMO = ROOT / 'prototypes/ranch-atelier/dist/simulations/demo'
VOICE_DIR = DEMO / 'voice'


def lines():
    src = (DEMO / 'script.mjs').read_text().split('export const SCIENTIST')[0]
    out = []
    for m in re.finditer(r"\{who: '(\w+)', say: \"((?:[^\"\\]|\\.)*)\", id: '(\w+)'", src):
        out.append((m.group(3), m.group(1), m.group(2)))
    return out


def speak(key, voice, model, text):
    body = json.dumps({'text': text, 'model_id': model,
                       'voice_settings': {'stability': 0.4, 'similarity_boost': 0.8, 'style': 0.4, 'use_speaker_boost': True}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128', data=body,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--abbie'); a.add_argument('--ani')
    a.add_argument('--model', default='eleven_multilingual_v2')
    a.add_argument('--force', action='store_true')
    a.add_argument('--dry-run', action='store_true')
    args = a.parse_args()
    cast = json.loads((ROOT / 'tools/voice-cast/cast.json').read_text()).get('voices', {})
    voices = {'abbie': args.abbie or cast.get('abbie'), 'ani': args.ani or cast.get('ani')}
    ls = lines()
    if args.dry_run:
        for lid, who, text in ls:
            print(f'{lid:5} {who:6} {text}')
        return
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key or not all(voices.values()):
        sys.exit('Set ELEVENLABS_API_KEY; abbie and ani voice ids come from tools/voice-cast/cast.json.')
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    mf = VOICE_DIR / 'manifest.json'
    old = json.loads(mf.read_text()) if mf.exists() else {}
    manifest = {'source': 'script.mjs', 'model': args.model, 'voices': voices, 'rendered': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'lines': {}, 'hash': {}}
    for lid, who, text in ls:
        h = hashlib.sha1(f'{voices[who]}|{args.model}|{text}'.encode()).hexdigest()[:12]
        name = f'{lid}.mp3'
        if not args.force and old.get('hash', {}).get(lid) == h and (VOICE_DIR / name).exists():
            print('kept', lid)
        else:
            (VOICE_DIR / name).write_bytes(speak(key, voices[who], args.model, text)); print('rendered', lid, text)
        manifest['lines'][lid] = name; manifest['hash'][lid] = h
    mf.write_text(json.dumps(manifest, indent=1) + '\n')


if __name__ == '__main__':
    main()
