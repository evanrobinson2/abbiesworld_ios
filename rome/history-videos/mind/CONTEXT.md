# Context pack

How a body follows Evan without a briefing.

Session start (`mind-session-start.py`) injects a small pack, **in this
order**. If the budget clips, it clips the tail — never Attention.

1. **ATTENTION** — `mind/ATTENTION.md`. His current thread.
2. **EVAN** — last few `beforeSubmitPrompt` lines. His words, not ours.
3. **GOALS** — unified aim + worker rows.
4. **STATE head** — facts, short.
5. **Felt** — last quoted REPORT lines from `EXPERIENCE.md` (observer
   owns that file; we only echo).

We do **not** inject the film bible, session jsonl, or agent monologues.
Those drown the thread.

`python3 scripts/mind-pack.py` prints the pack so you can inspect it.

When the thread moves, overwrite `ATTENTION.md` in the same turn.
