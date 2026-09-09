# Whizbang (the Incredimachine)

Kid-facing name: **Whizbang**. Internal name: Incredimachine.

A gadget-setup launcher. Twist knobs and flip switches, then fire a floppy ragdoll whose **head is real Abbie art**.

## Loop

1. Pick a flyer head.
2. Tune the machine (angle, spring, spin, fan, bounce pad, balloon).
3. Smash **LAUNCH**.
4. The ragdoll flops through the gadgets you turned on.
5. Land in the cloud bed. Replay is always allowed. Nothing is “wrong.”

## Flyer heads

Two production sources, both through **Evan’s `OpenAIClient`**. The iPad never talks to OpenAI.

| Source | DAG | What `OpenAIClient` does |
| --- | --- | --- |
| Draw-only head | `load_source` → `draw_head` | `generate_image` (GPT Image) with “draw only the head” |
| Extracted head | `load_source` → **`reason`** → `crop_head` | `generate_prompt` / `reason` (vision + JSON bbox) |

`reason` is the reasoning step. Same client as picture-making. Same vision path. Structured JSON out, then a local crop. Optional follow-on: feed that crop back into `generate_image` as a stickerize pass.

Until `/api/reason` exists, the iPad uses a top-of-frame crop so the game still plays, and bundled doodle / Halloween monster heads as the offline default.

Server ask: `docs/problem-solving/NOTE_TO_SERVER_TEAM_HEAD_DAG.md`

## Machine

| Control | What it does |
| --- | --- |
| Angle dial | Launch direction |
| Spring knob | Launch power |
| Spin knob | How much the ragdoll tumbles |
| Fan switch | Updraft in the middle |
| Bounce switch | Springy pad |
| Balloon switch | One extra lift if you tap it |

## Verify

- `-launchWhizbang` opens the game
- `-autoPlayWhizbang` sets a working machine and launches
- Everyday/Halloween gallery extract uses DAG, not a new vision stack
