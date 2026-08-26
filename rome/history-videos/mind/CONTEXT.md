# Context pack

How a body follows Evan without a briefing.

**Source is mail.** `python3 scripts/mind-mail.py --from <you> --to *|worker --kind … --text "…"`
appends one line to `mind/mail/<you>.ndjson`. Never edit another body’s file.

Session start compiles `mind/pack.md` and injects it. If the budget clips,
it clips the tail — never Attention.

Order inside the pack:

1. **ATTENTION** — latest `kind=attention` mail (Evan’s thread)
2. **EVAN** — last few of his prompts
3. **GOALS** — worker table only
4. **MAIL** — last lines to `*` or to this body
5. **LEARNED** — recent correction titles
6. **DO NOT LOSE** — fact/handoff lines that say so

Inspect: `python3 scripts/mind-pack.py`

Kinds: `attention` | `fact` | `handoff` | `felt` | `checkin` | `ask`.

New facts go to mail or `LEARNED.md`. Not `STATE.md`.
`/hive` is Evan’s board. It reads the pack; it does not own memory.
