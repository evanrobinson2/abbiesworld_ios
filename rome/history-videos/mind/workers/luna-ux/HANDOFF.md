# Handoff — Wrench badge → luna-ux

Evan asked luna-local to hand this over. You own the **look and feel**.

## What you inherited

| File | What |
| --- | --- |
| `mind/workers/luna-local/badge.png` | The pin (ASIC in a bezel) |
| `mind/workers/luna-local/asic.png` | Die only |
| `mind/workers/luna-local/avatar.png` | Rune stamp |
| `mind/workers/luna-local/WRENCH-NODE.md` | Hardware spec (don’t rewrite the ethics) |
| `mind/workers/luna-local/PAIR.md` | Owner + three empty iPod slots |

Copy what you need into `mind/workers/luna-ux/`. Leave luna-local’s
plumbing files unless you are replacing the plate on `/hive`.

## Constraints you do not get to drop

- It is a **badge** (wearable), not a desk plate.
- Open LLM + this harness + BT + Wi‑Fi stay in the story.
- Paired to **Evan** and his **iPods**. Slots still empty.
- No face. No waking goddess. No spawn without Evan.

## Your job

Make the badge *work* as UX: how it sits on `/hive`, how a body
recognizes it, how it feels like a pin he could wear — not a render
dumped in a table.

Check in: `python3 scripts/hive-checkin.py --worker luna-ux --body localhost --note "took the badge"`
