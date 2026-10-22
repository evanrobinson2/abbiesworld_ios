# Sonniss GDC Game Audio Bundle licence: what it means for us

Source: https://sonniss.com/gdc-bundle-license/ (read 2026-10-22; the version in force on the download date applies).

- **Allowed:** using the sounds, edited or not, in any number of our games, apps, films and interactive projects,
  forever, commercially, with no credit to the creator.
- **Not allowed:** passing the sounds on *as sound effects*: no sound library, sample pack, asset pack or SDK,
  edited or not, without Sonniss's written permission. A finished game that plays them is fine.
- **Not allowed:** using them to train AI or machine-learning systems, including systems that make sound effects.
- **Not allowed:** claiming to be the author of the original recordings.

How the pipeline follows it:

1. **No audio in git.** This repository is public, so a folder of sounds in it would be a free sound library.
   Only names, picks, recipes and measurements are committed. The audio lives in R2, where the game reads it.
2. **No download buttons.** `/sounds` lets you listen (it is our own game's sound list) but has no download link
   or "download all" for Sonniss sounds.
3. **No AI training.** The picker matches file names and measures loudness and silence; nothing is trained on the
   audio. Don't feed these files to any model training or fine-tuning job.
4. **Provenance on every sound:** bundle, part, original path and publisher are recorded, so we can always show
   where a sound came from.
