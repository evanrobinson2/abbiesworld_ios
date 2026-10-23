#!/usr/bin/env python3
"""Narration for the welcome tour (AW-STUDY-0022), rendered with ElevenLabs text to speech.

The lines live in one place, the tour stops (prototypes/ranch-atelier/dist/simulations/welcome/tour-stops.mjs); this
reads each registerTourStop's id and line and writes voice/<id>.mp3 plus voice/manifest.json, which the tour plays.
A line whose text has not changed since the last render is kept. Runs in the welcome-narration workflow because the
cloud box can't reach api.elevenlabs.io.

    ELEVENLABS_API_KEY=... python3 tools/welcome-narration/render.py [--voice XrExE9yKIg1WjnnlVkGX] [--dry-run]
"""
import argparse, hashlib, json, os, re, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WELCOME = ROOT / 'prototypes/ranch-atelier/dist/simulations/welcome'
VOICE_DIR = WELCOME / 'voice'
# Matilda: warm, friendly (simulations/live/policy.mjs ELEVEN_VOICES). Change with --voice.
DEFAULT_VOICE = 'XrExE9yKIg1WjnnlVkGX'


def stops():
    src = (WELCOME / 'tour-stops.mjs').read_text()
    out = []
    for m in re.finditer(r"registerTourStop\(\{(.*?)\}\);", src, re.S):
        body = m.group(1)
        sid = re.search(r"id:'([^']+)'", body)
        line = re.search(r"line:'((?:[^'\\]|\\.)*)'", body)
        if sid and line:
            out.append((sid.group(1), line.group(1).replace("\\'", "'")))
    return out


def speak(key, voice, model, text):
    body = json.dumps({'text': text, 'model_id': model,
                       'voice_settings': {'stability': 0.42, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True}}).encode()
    req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128', data=body,
                                 headers={'xi-api-key': key, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def main():
    a = argparse.ArgumentParser()
    a.add_argument('--voice', default=DEFAULT_VOICE)
    a.add_argument('--model', default='eleven_multilingual_v2')
    a.add_argument('--force', action='store_true')
    a.add_argument('--dry-run', action='store_true')
    args = a.parse_args()
    lines = stops()
    if args.dry_run:
        for sid, text in lines:
            print(f'{sid:10} {text}')
        return
    key = os.environ.get('ELEVENLABS_API_KEY')
    if not key:
        sys.exit('Set ELEVENLABS_API_KEY.')
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    mf = VOICE_DIR / 'manifest.json'
    old = json.loads(mf.read_text()) if mf.exists() else {}
    manifest = {'study': 'AW-STUDY-0022', 'source': 'tour-stops.mjs', 'voice': args.voice, 'model': args.model,
                'rendered': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'lines': {}, 'text': {}, 'hash': {}}
    for sid, text in lines:
        h = hashlib.sha1(f'{args.voice}|{args.model}|{text}'.encode()).hexdigest()[:12]
        name = f'{sid}.mp3'
        if not args.force and old.get('hash', {}).get(sid) == h and (VOICE_DIR / name).exists():
            print('kept', sid)
        else:
            (VOICE_DIR / name).write_bytes(speak(key, args.voice, args.model, text))
            print('rendered', sid, text)
        manifest['lines'][sid] = name
        manifest['text'][sid] = text
        manifest['hash'][sid] = h
    mf.write_text(json.dumps(manifest, indent=1) + '\n')


if __name__ == '__main__':
    main()
