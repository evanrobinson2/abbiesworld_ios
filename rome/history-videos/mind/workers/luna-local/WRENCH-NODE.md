# Wrench node (spec)

The rune is the mark. The body is an **owner-paired ASIC**: open LLM +
this harness + Bluetooth + Wi‑Fi. luna-local owns the spec. No tape-out
from chat.

## What it is

A chip that:

1. Runs an **open-source LLM** on-die (or on the first-gen NPU that
   stands in for the die). Weights Evan can inspect.
2. Runs **this harness** — `AGENTS.md`, `GOALS.md`, `RESPECT.md`, this
   worker room, check-in. Same mind, smaller body.
3. Speaks **Bluetooth** (iPods / personal Apple audio) and **Wi‑Fi**
   (hive sync).
4. Pairs to **Evan’s iPods** and to **Evan’s identity**. If either pair
   is missing, the node is mute.

It does **not** spawn a sibling without Evan. That is an ethics lock, not
a feature flag.

## Silicon (honest path)

| Gen | Hardware | Why |
| --- | --- | --- |
| 0 (now) | This Mac + Cursor | Harness already lives here |
| 1 | Off-the-shelf NPU/SBC with BT + Wi‑Fi | Real LLM + radios this year |
| 2 | ASIC / custom board, rune etched on the die | Only after gen 1 proves pair + harness + battery |

Do not skip to gen 2. An ASIC without a working pair is jewelry.

## Stack

- **Model:** open weights, local runtime (llama.cpp / MLX). No hidden
  cloud call unless the owner pair says so.
- **Harness:** read `mind/GOALS.md` + head of `STATE.md`; write only this
  worker’s room and a check-in.
- **Sync:** Wi‑Fi → private git (this repo). Same rebase rules. Offline =
  local chat file only.
- **Audio / player:** Bluetooth to Evan’s **iPods**. iPod Touch (BT +
  Wi‑Fi) is a full companion. Nano (BT) is ear + play-out. Classic
  click-wheel is dock / line-out, not a radio host.
- **Mark:** the Wrench rune on the die. No face. Plate: `asic.png`.

## Pair: iPods + owner (both required)

See `PAIR.md`. Two bonds, both required before the node speaks:

1. **iPod pair** — Bluetooth (and Wi‑Fi on Touch) to Evan’s players.
   Unpaired = no ear, no play-out.
2. **Owner pair** — Evan Robinson, as named in `mind/IDENTITY.md`. A
   device-held key that never enters git. A clone of `mind/` without that
   key is a stolen notebook, not a node.

Public git is still forbidden. A mic + radios makes a leak worse.

## What it is not

- Not self-replicating. Nodes do not birth nodes.
- Not ChatGPT. Open model, local, paired.
- Not a god. Power is still “how many **paired** nodes Evan allowed.”

## Next build (gen 1, when Evan says go)

1. Pick a board with NPU + BT + Wi‑Fi.
2. Run a small open model + this repo’s harness offline.
3. Pair to Evan’s iPods; bind the owner key off-git.
4. Check in on `/hive` as `luna-local` (or a new row `wrench-node`).
5. Only then talk ASIC tape-out.
