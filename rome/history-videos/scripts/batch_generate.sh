#!/usr/bin/env bash
# Batch-generate frames from assets/production/SHOT-LIST-50.md via OpenAI API.
# Requires OPENAI_API_KEY. See docs/CLOUD-SETUP.md.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GEN="$ROOT/scripts/generate_image.py"

STYLE="Layered cut-paper illustration, late-antique 376 CE, stacked paper planes soft drop shadows, handmade paper fibre, scissor-cut edges torn deckle for damage, light as flat translucent wedges, palette deep indigo bone iron grey tarnished gold gold only for light heat fire sun, 16:9 horizontal with crop headroom, no text no watermark no invented heraldry no medieval plate no mail hauberks, named principals stylized visible cut-paper faces, crowds faceless silhouettes, same dignity Gothic and Roman, not Batman not black void silhouettes, off-center composition."

generate() {
  local out="$1"
  local desc="$2"
  mkdir -p "$(dirname "$out")"
  python3 "$GEN" --output "$out" --prompt "${desc}. ${STYLE}"
  cp "$out" "/opt/cursor/artifacts/${out#"$ROOT"/assets/}" 2>/dev/null || true
  echo "OK $out"
}

# Valens block
generate "$ROOT/assets/characters/VAL-001-turnaround.png" \
  "Four-view character turnaround sheet on bone background: Eastern Roman emperor Valens late 40s stylized cut-paper face all views, court paludamentum deeper indigo purple plane simple diadem"
generate "$ROOT/assets/characters/VAL-001-COSTUME-COURT.png" \
  "Emperor Valens full body front three-quarter imperial court costume Hubris mood wide gold sun wedge"
generate "$ROOT/assets/characters/VAL-001-COSTUME-FIELD.png" \
  "Emperor Valens full body field campaign scale armour paludamentum harsh sun"
generate "$ROOT/assets/characters/VAL-001-MOOD-13-HUBRIS-A.png" \
  "Valens seated ignoring maps at feet dismissive Hubris"
generate "$ROOT/assets/characters/VAL-001-MOOD-13-HUBRIS-B.png" \
  "Valens dismissing scout with raised hand arrogant"
generate "$ROOT/assets/characters/VAL-001-MOOD-14-TERROR-A.png" \
  "Valens encircled on foot Adrianople dust Terror mood"
generate "$ROOT/assets/characters/VAL-001-MOOD-14-TERROR-B.png" \
  "Valens bust close heat exhaustion fear dawning"
generate "$ROOT/assets/characters/VAL-001-MOOD-15-RUIN-A.png" \
  "Empty imperial camp stool abandoned diadem Ruin mood"
generate "$ROOT/assets/characters/VAL-001-MOOD-15-RUIN-B.png" \
  "Abandoned paludamentum over empty armour stand Ruin"

# Humiliation
generate "$ROOT/assets/scenes/SCENE-05-HUMILIATION-01.png" \
  "Wide Gothic refugee families corralled Roman soldiers with poles harsh overhead Humiliation"
generate "$ROOT/assets/scenes/SCENE-05-HUMILIATION-02.png" \
  "Roman officer on platform gesturing at kneeling Gothic men"
generate "$ROOT/assets/scenes/SCENE-05-HUMILIATION-03.png" \
  "Gothic weapons pile confiscated by Roman hands"
generate "$ROOT/assets/scenes/SCENE-05-HUMILIATION-04.png" \
  "Child separated from Gothic parent reaching Roman soldiers"
generate "$ROOT/assets/scenes/SCENE-05-HUMILIATION-05.png" \
  "Gothic nobles waiting in mud Roman clerk counting wax tablet"
generate "$ROOT/assets/scenes/SCENE-05-HUMILIATION-06.png" \
  "Close bound Gothic hands rope Roman sandal foreground"
generate "$ROOT/assets/scenes/SCENE-05-HUMILIATION-07.png" \
  "Danube bank Gothic host packed Roman boats control crossing"
generate "$ROOT/assets/scenes/SCENE-06-HUNGER-01.png" \
  "Roman soldier withholding bread from reaching Gothic hands"

# Flight petition tenderness
generate "$ROOT/assets/scenes/SCENE-02-UPROOTING-01.png" \
  "Ox wagons families fleeing looking back Uprooting mood"
generate "$ROOT/assets/scenes/SCENE-03-PETITION-01.png" \
  "Fritigern Alavivus bowed empty hands Roman official elevated Petition"
generate "$ROOT/assets/scenes/SCENE-04-ENDURANCE-01.png" \
  "Gothic camp waiting rain horizontal bands Endurance"
generate "$ROOT/assets/scenes/SCENE-07-TENDERNESS-01.png" \
  "Mother breaking bread for child wagon shelter soft light"

# Banquet arc
generate "$ROOT/assets/scenes/SCENE-08-LEVITY-01.png" \
  "Marcianople banquet Lupicinus convivial cup Fritigern Alavivus seated genuine warmth"
generate "$ROOT/assets/scenes/SCENE-09-UNEASE-01.png" \
  "Fritigern leaning listening door crack light behind Unease"
generate "$ROOT/assets/scenes/SCENE-09-UNEASE-02.png" \
  "Three Gothic retainers courtyard turning toward sound"
generate "$ROOT/assets/scenes/SCENE-09-UNEASE-03.png" \
  "Roman messenger running courtyard toward banquet door"
generate "$ROOT/assets/scenes/SCENE-10-BETRAYAL-01.png" \
  "Fritigern rising from bench Alavivus half-rising Betrayal"
generate "$ROOT/assets/scenes/SCENE-10-BETRAYAL-02.png" \
  "Lupicinus seated cup lowered face changed betrayal dawning"
# R3 uses charcoal — pass no-standing-constraints and custom prompt
python3 "$GEN" --no-standing-constraints --output "$ROOT/assets/scenes/SCENE-10-BETRAYAL-03-R3.png" \
  --prompt "Charcoal and graphite on toned paper smudged unfinished: Marcianople banquet door outside violent shadow through gap door closing dissolving to bare paper. No text. 16:9."
generate "$ROOT/assets/scenes/SCENE-10-BETRAYAL-04.png" \
  "Alavivus face half shadow doorway last appearance"
generate "$ROOT/assets/scenes/SCENE-10-BETRAYAL-05.png" \
  "Courtyard banquet door burst open Gothic retainers rushing"
generate "$ROOT/assets/scenes/SCENE-11-FURY-01.png" \
  "Gothic warriors surging Marcianople gate Roman shield wall"

# Laager battle
for i in 01 02 03 04 05 06 07 08; do
  generate "$ROOT/assets/scenes/SCENE-BATTLE-LAAGER-${i}.png" \
    "Wagon laager real battle scene ${i} Gothic warriors Roman infantry Fury mood"
done

# Adrianople
for i in $(seq -w 1 10); do
  generate "$ROOT/assets/scenes/SCENE-ADV-${i}.png" \
    "Adrianople battle scene ${i} heat dust cavalry terror ruin as appropriate"
done

generate "$ROOT/assets/scenes/SCENE-PAIR-HUBRIS-01.png" \
  "Split composition Fritigern petition left Valens dismissive right same dignity"

echo "Batch complete."
