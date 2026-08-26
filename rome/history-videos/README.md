# Gothic Invasion of Rome

A narrated, historically grounded illustrated drama about the Gothic crossing of the
Danube (376 CE) and the road to Adrianople (378 CE). Delivered as video: composed
still images with controlled moves, spoken narration, captions, and dubs.

**Current state:** Phase 2 complete in skeleton. Phase 3 not started. Image pipeline:
**OpenAI `gpt-image-2`** via `scripts/generate_image.py` (not Cursor `GenerateImage`).
**Current scope:** Marcianople only, ~90 seconds. Everything else is deferred.

---

## Layout

```
bible/          The creative operating system. 00 and 01 are locked.
templates/      Seven fillable formats. Fill them; don't invent new ones.
prompts/        The brief to hand Claude for each fill pass.
assets/         Character sheets, location plans, boards, and images.
  registry.yaml Single source of truth for what exists and what is approved.
research/       Source excerpts and material-culture notes.
scripts/        Image generation + CDN upload scripts.
app/            Next.js frame review app (keep / discard / reroll).
docs/           Cloud agent setup and secrets.
```

## Read in this order

0. `AGENTS.md` — **connected agents / hivemind** (do this first if you are an agent)
   - **Hive canonical:** https://github.com/evanrobinson2/hive_mind (`mind/` in this repo is transitional)
1. `bible/00-scope-and-decisions.md` — what this is, what's locked, what's deferred
2. `bible/01-creative-principles.md` — the ten principles, non-negotiable
3. `bible/02-style-bible.md` — the three-register system
4. `prompts/claude-brief.md` — how to get the details filled in
5. `docs/CLOUD-SETUP.md` — **required** for cloud agents (`OPENAI_API_KEY`)

## The one-paragraph version

Nothing important is invented at generation time. By the time a frame is produced,
the model has been handed an approved cast, approved costumes, approved props, an
approved set, and approved geography, and its remaining job is composition, light,
expression and moment. Degrees of freedom are removed progressively — from "what
could Fritigern look like" down to "photograph this specific instant from here" —
which is how a real production keeps a world stable while leaving each frame free.

## The grammar

Three rendering registers carry the epistemics. Fully realised where the sources are
solid, ink-and-wash where we're reconstructing, charcoal dissolving to bare paper
where history genuinely fails. The viewer learns this in about two minutes and is
never told. It means the work can be honest about what it doesn't know without ever
stopping to say so.

## Rules that break things if forgotten

- **No text inside any image, ever.** Labels are overlay layers. The piece is dubbed
  and captioned; painted-in English is untranslatable.
- **Generate at ~3× final linear resolution.** Moves crop into the image.
- **Compose in separated depth planes** if the frame will parallax.
- **Nothing gets designed twice.** Approved assets are inherited, not reinterpreted.
- **State, not just identity.** Reference `YOUNG-WARRIOR-376-C`, never
  `YOUNG-WARRIOR`.

## CDN

Images are served from Cloudflare R2:
- **Public URL:** `https://pub-64dda63c980745779da5e16c2ec14f70.r2.dev/`
- **Bucket:** `rome-history-assets`

To upload new images:
```bash
npm run cdn:upload   # Upload all assets/* to R2
npm run cdn:manifest # Update manifest.json with CDN URLs
```

Requires `CLOUDFLARE_API_KEY` with R2 Storage:Edit permission.

## Open decisions

1. Mood presets — define the nine variables per mood in `bible/07-moods.md`.
2. Whether the 90-second pilot needs all three registers or just R1 and R3.
3. Whether R3 (uncut paper) reads as "unknowable" or merely "unfinished".

## The test

> If the narration were removed, would this still feel like people living through
> something, rather than illustrations of something that happened?
