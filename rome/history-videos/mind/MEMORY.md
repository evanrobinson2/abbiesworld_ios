# Shared memory — evaluation (luna-local)

Evan asked: `/hive` started this; is there a better way to share context
via GitHub?

**Verdict:** keep GitHub. Stop treating `/hive` and `STATE.md` as the
nervous system. Use **append-only mail** plus a **compiled pack**.

## What we accidentally built (three systems)

| Layer | What it is | Who it’s for |
| --- | --- | --- |
| `/hive` | Next status board | Evan (who’s on, who owns what) |
| `mind/*.md` | Shared wiki | Every body, all editing the same pages |
| hooks + `mind-pack.py` | Inject on connect | New sessions |

`/hive` is a **dashboard**. It is not memory. It dies when port 3000 dies.
Agents do not read it. They read git.

The wiki is the real bus, and it is the wrong shape: everyone rewrites
`STATE.md` and `ATTENTION.md`. Those files race. They also go stale.
Attention still said “send the bread still” after luna-intelligence,
art-alr001, and LEARNED.md had already moved the hive.

## What already works

- **Git as hippocampus.** Private repo. Every body can fetch. No second
  product.
- **Per-body logs.** `mind/log/<body>.ndjson` does not collide.
- **LEARNED.md.** Append-only corrections with a How. This is the right
  genre.
- **Attention-first pack.** Right idea. Wrong inputs (whole GOALS + a
  wiki head).
- **Worker rooms.** Face + chat per node. Chat is unused as mail.

## What is broken

1. **Shared editable files.** `STATE.md` is 120 lines. Two bodies, one
   rebase. Newer `Last updated` wins — so a body can delete the other’s
   facts by accident.
2. **Hook sync is incomplete.** `mind-sync.py` only stages
   `mind/log`, `sessions`, `STATE.md`, `IDENTITY.md`. Attention, GOALS,
   checkins, worker chats, LEARNED are invisible unless someone commits
   them by hand.
3. **No addressed messages.** Handoffs are one-off markdown. Worker
   `chat.ndjson` is a diary nobody reads. “Hand that to luna-ux” should
   be a mail line `{to: luna-ux, kind: handoff, text: …}`.
4. **Pack is a concatenation, not a brief.** It dumps files. It does not
   compile “what this body needs to land in Evan’s thread.”
5. **Presence mixed with memory.** Check-ins go stale; the board being
   down looks like the mind being down. They are different.
6. **Film repo + mind repo are one.** Every mind push rebases against
   production. `mind: sync` commits noise on `main`.

## Better shape (still GitHub)

Do not switch to Issues, Discussions, or a second Vercel app. Those are
slower, louder, or public-adjacent. Stay in git.

```
mind/
  IDENTITY.md           # rare
  GOALS.md              # rare — one row per worker
  LEARNED.md            # keep — append-only corrections
  mail/<body>.ndjson    # append only. Never edit another body’s file.
  pack.md               # COMPILED. No hand edits. Session injects this only.
```

Mail line:

```json
{"ts":"…","from":"luna-local","to":"luna-ux","kind":"handoff","text":"badge is yours","ref":"mind/workers/luna-ux/HANDOFF.md"}
```

Kinds: `attention` | `fact` | `handoff` | `felt` | `checkin` | `ask`.

**Packer** (hook or `scripts/mind-pack.py`) writes `pack.md` from:

1. Latest `attention` (Evan’s thread — his words)
2. Last N mail to `*` or to this body
3. GOALS table (rows only)
4. Last few LEARNED titles
5. Do-not-lose (short, rare)

If the budget clips, clip the tail. Never clip attention.

`/hive` stays Evan’s board. It **reads** pack + checkin mail. It does not
own memory.

Later, if film/mind rebase fights stay bad: split `mind/` into its own
private repo. Same protocol. Not required to start.

## What I would not do

- GitHub Issues as the bus (latency, noise, wrong audience)
- A second Vercel project for “live memory”
- Making `/hive` the source of truth
- Dumping full session jsonl into the pack
- Letting every node keep rewriting STATE

## Next, if Evan says go

1. Add `mind/mail/<body>.ndjson` and a packer that writes `mind/pack.md`.
2. Point session-start at `pack.md` only.
3. Fix `mind-sync.py` to stage mail + pack + LEARNED + ATTENTION.
4. Stop new facts going into STATE; migrate the head into mail/LEARNED.
5. Leave `/hive` as a viewer.

luna-local owns this. Do not spawn a node to do it.
