# Cloud agent setup

This project generates images through **OpenAI's Image API** (`gpt-image-2`), not
Cursor's built-in `GenerateImage` tool.

## Required secrets

Add these in the Cursor dashboard before starting a cloud agent on this repo:

1. Open [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents)
2. Go to **Secrets**
3. Add:
   - **Name:** `OPENAI_API_KEY`
   - **Type:** **Runtime Secret** (recommended — redacted from transcripts/commits)
   - **Value:** your OpenAI API key (`sk-...`)
   
   - **Name:** `CLOUDFLARE_API_KEY`
   - **Type:** **Runtime Secret**
   - **Value:** Cloudflare API token with **R2 Storage: Edit** permission
4. Restart the cloud agent after adding or changing secrets

### Cloudflare R2 setup (one-time)

1. Enable R2 on your Cloudflare account at `dash.cloudflare.com/[account]/r2`
2. Create an API token at `dash.cloudflare.com/profile/api-tokens` with:
   - **Account** → **Workers R2 Storage** → **Edit**
3. The bucket `rome-history-assets` and public URL are already configured

Optional overrides (not required):

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_IMAGE_MODEL` | `gpt-image-2` | Image model |
| `OPENAI_IMAGE_SIZE` | `3840x2160` | 16:9 at ~3× delivery resolution |
| `OPENAI_IMAGE_QUALITY` | `high` | `low` / `medium` / `high` |
| `OPENAI_IMAGE_FORMAT` | `png` | `png` / `jpeg` / `webp` |

## Generate an image

```bash
python3 scripts/generate_image.py \
  --output assets/style-tests/example.png \
  --prompt "Layered cut-paper illustration. ..."
```

Standing constraints (no text, 376 CE material culture, no invented ornament) are
appended automatically unless you pass `--no-standing-constraints`.

## Local development

Do not commit API keys. Load your key from a local file:

```bash
set -a && source ~/.env && set +a
pip3 install -r requirements.txt
python3 scripts/generate_image.py --help
```

## Repo

GitHub: `git@github.com:evanrobinson2/rome_history_videos.git`

## What else the cloud agent needs

| Item | Status |
| --- | --- |
| `OPENAI_API_KEY` in dashboard Secrets | Required for image generation |
| `CLOUDFLARE_API_KEY` in dashboard Secrets | Required for CDN uploads |
| Repo cloned from GitHub | Automatic when agent starts |
| `pip install -r requirements.txt` | Runs from `.cursor/environment.json` on build |
| Project context | Read `sessions/session_1.md` first, then `README.md` and `bible/` |
| Midjourney / LegNext | Not used — OpenAI only |

## Handoff for session 2

Start by reading `sessions/session_1.md` (summary at top). Likely next work:
1. Define mood presets in `bible/07-moods.md` and generate proofs via `generate_image.py`
2. Begin Phase 3 — **principal face sheets** (Fritigern, Alavivus, Lupicinus) + Marcianople location plans; witnesses stay silhouette
