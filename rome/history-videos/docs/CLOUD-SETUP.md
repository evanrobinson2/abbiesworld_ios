# Cloud agent setup

This project generates images through **OpenAI's Image API** (`gpt-image-2`), not
Cursor's built-in `GenerateImage` tool.

## Required secret

Add this in the Cursor dashboard before starting a cloud agent on this repo:

1. Open [cursor.com/dashboard/cloud-agents](https://cursor.com/dashboard/cloud-agents)
2. Go to **Secrets**
3. Add:
   - **Name:** `OPENAI_API_KEY`
   - **Type:** **Runtime Secret** (recommended — redacted from transcripts/commits)
   - **Value:** your OpenAI API key (`sk-...`)
4. Restart the cloud agent after adding or changing the secret

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
