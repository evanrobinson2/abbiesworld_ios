# World 2 asset qualification

This directory implements local, provenance-recorded generation plus a fail-closed
path from an immutable source image to an exact runtime derivative. It never contains
API credentials.

## Representative Image 2 generation

`AssetSources/World2/generation-manifest.json` inventories all P0 semantic IDs and
locks one representative candidate per approved class to exact prompts, canonical
reference hashes, and the dated `gpt-image-2.5-flare-2026-09-08` model. Generate only
those representatives with:

```sh
set -a
source CreatureCreator/server/.env.local
set +a
python3 scripts/world2_assets/generate.py
```

Generated PNGs and records are immutable and include the exact prompt, prompt hash,
reference hashes, output hash, model, requested size, and dimensions. Class expansion
is blocked pending parent review. Abbie/Ani portraits are separately blocked until
parent-approved character references exist; the pipeline does not invent likenesses.
Supplemental semantic assets also remain non-integrable until a non-colliding
production ID is assigned and they pass the same qualification and parent gate.

When live evidence rejects a canonical or representative candidate, the constrained
repair runners preserve v1 and create one immutable v2 attempt:

```sh
python3 scripts/world2_assets/repair_canonical.py
python3 scripts/world2_assets/repair_supplemental.py
```

Repairs are never automatic. The current production policy allows at most two repair
attempts; these runners create only attempt one (`v2`) and have no retry loop.

## Production flow

1. Import local authenticated originals plus the supplied prompt document:

   ```sh
   python3 scripts/world2_assets/import_canonical.py \
     --source-dir /absolute/local/directory/with/1001A.jpeg-and-peers \
     --prompt-document /absolute/local/path/to/exact-prompts.md
   ```

   The importer requires exactly the nine canonical IDs, stores prompt and candidate
   bytes immutably, verifies conflicts, and updates matching hashes in both manifests.
   Existing exact prompt or image bytes are never silently replaced.
2. Import the original image locally and run qualification:

   ```sh
   OPENAI_API_KEY=... \
   WORLD2_ASSET_EVAL_MODEL=<explicit-multimodal-model-id> \
   python3 scripts/world2_assets/qualify.py run \
     --asset-id 1001A \
     --version v1 \
     --candidate /absolute/local/path/to/original.png
   ```

   Both environment variables are mandatory for live evaluation. The key is passed
   directly to the OpenAI client and is never written to evidence. Pillow is required
   for image decoding, previews, and transformation; the `openai` package is required
   only for live evaluation. Missing dependencies produce an actionable failure.
3. Review the source, actual-use-size preview, all evaluator findings, prompt,
   references, and exact runtime derivative. A parent then records an explicit event:

   ```sh
   python3 scripts/world2_assets/qualify.py approve \
     --asset-id 1001A \
     --sha256 <runtime-derivative-sha256> \
     --decision approved \
     --reviewer <parent-reviewer-name> \
     --note "<review evidence>" \
     --confirmed-by-parent
   ```

   Approval is refused for mock evaluations, non-runtime subjects, and anything other
   than an automated `qualified` decision. Approval/rejection events are append-only;
   the latest event controls the gate.
4. Integrate one asset (or omit `--asset-id` to integrate every eligible derivative):

   ```sh
   python3 scripts/world2_assets/integrate.py --asset-id 1001A
   python3 scripts/world2_assets/verify_integrated.py
   ```

   Integration copies exact approved bytes into a dedicated `world2_*.imageset`,
   writes `world2_runtime_manifest.dataset`, and mirrors that manifest under
   `AssetSources/World2/integrated-manifest.json`. Verification re-hashes catalog
   bytes and re-checks live automated qualification, current parent approval,
   provenance, and unexpected World 2 image sets.

## DAG and evidence

`qualify.py` stores completed node records by content hash. A repeated run resumes
only when each node input digest is unchanged. Changed node inputs require a new
candidate/prompt version; existing evidence is never overwritten.

The source and exact runtime derivative independently run:

- file decode/integrity and declared dimensions, format, aspect, alpha, profile, and
  orientation checks;
- multimodal semantic, gameplay-composition, style-consistency, and product-safety
  evaluation;
- actual-use-size contact-sheet rendering and multimodal readability evaluation.

The runtime PNG transformation records source/output hashes, dimensions, and exact
parameters. Any hard failure becomes `rejected`; uncertainty or missing evidence
becomes `needs_review`; every hard finding must pass for `qualified`. Failed evidence
can carry a constrained revision note, but original prompts and failed candidates are
preserved and generation is never retried automatically.
The declared hard rubric is authoritative: unsolicited evaluator observations remain
stored as advisory `additionalFindings` and cannot silently create new hard requirements.

Structured JSON logs are emitted one object per line for textual inspection.
`python3 scripts/world2_assets/report.py` emits one compact current gate status for
every canonical, reserved, and supplemental identity.

## Test-only evaluator

`--mock-evaluator path/to/fixture.json` avoids network/API use and makes DAG tests
deterministic. Mock evidence can reach an automated test decision but cannot receive
production parent approval or pass integration.

Run tests with:

```sh
python3 -m unittest discover -s scripts/world2_assets/tests -v
```

## Game Asset API v1 publication

Generate and inspect the complete bundled registry plan without credentials or
network writes:

```sh
python3 scripts/world2_assets/publish_registry.py \
  --dry-run \
  --plan-out /tmp/world2-registry-plan.json
```

The plan covers qualified World 2 images, the Cozy Room Kit, music, intro video,
and minigame configuration under the stable game key `abbies-world-2`. To test one
record after the server deploys `/api/v1/asset-schema`, select its semantic key:

```sh
ABBIES_SERVER_URL=https://your-server.example \
ASSET_REGISTRY_ADMIN_API_KEY=... \
python3 scripts/world2_assets/publish_registry.py \
  --asset-key backgrounds/title
```

Omit `--asset-key` only after the trial record is verified. The tool reads the
current revision before every upsert and sends it as `expectedRevision`. It refuses
admin writes over cleartext HTTP except to a loopback test server, and never accepts
the admin credential as a command-line argument or writes it into the publication
plan.

The nine imported canonical sources and exact prompt files remain unqualified until
live evaluation succeeds and a parent approves each exact runtime derivative hash.
When `expectedAspectRatio` is `null`, qualification derives one unambiguous
Midjourney `--ar W:H` value from the exact prompt and records that effective contract;
otherwise it fails closed. No prompt wording or source provenance is reconstructed.
