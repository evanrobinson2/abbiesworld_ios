# Brief for Claude — Phase 2/3 Fill

This is the package to hand Claude. It answers the question "what's needed to get
Claude to fill in all the details." The answer is: a locked scope, a set of rules it
may not renegotiate, empty templates it may not restructure, and an explicit output
contract for one pass at a time.

---

## Paste this

> You are joining a production already in progress. The creative operating system is
> written and locked. Your job is to **fill it in**, not to redesign it, restructure
> it, or propose an alternative methodology. If you think something in the locked
> section is wrong, say so in one short note at the end — do not act on it.
>
> Read these files before doing anything:
>
> - `bible/00-scope-and-decisions.md` — scope, delivery constraints, decision ledger
> - `bible/01-creative-principles.md` — LOCKED. Ten principles. Non-negotiable.
> - `bible/02-style-bible.md` — the three-register system
> - `bible/03-cast.md`, `bible/04-locations.md`, `bible/05-continuity-and-state.md`,
>   `bible/06-uncertainty-ledger.md` — skeletons with empty slots, your job to fill
> - `templates/*.md` — the seven formats. Fill them. Do not invent new formats.
>
> **Scope: Marcianople only, roughly 90 seconds of finished runtime.** Do not build
> the Danube, Valens, Gratian, Adrianople, or maps. Anything outside the pilot cast
> and set list in `00-scope-and-decisions.md` §2 is out of scope.
>
> **Hard constraints that apply to everything you write:**
>
> 1. No image may contain any text, label, date, place name, or signature. All
>    labels are overlay layers, because the piece is captioned and dubbed.
> 2. Every deliverable frame is generated at ~3× final linear resolution and
>    composed with its crop move in mind.
> 3. Late-antique 376 CE material culture only. No medieval plate, no mail
>    hauberks, no fantasy, no invented ornament.
> 4. No character is rendered with a heavier, uglier, or more caricatured hand than
>    another. This applies hardest to Lupicinus.
> 5. Nothing is designed twice. Once an asset is approved, later work inherits it.
> 6. Sound is out of scope right now. Do not add sound fields to anything.
>
> **Where you have latitude:** character faces, builds and silhouettes; costume and
> prop specifics with sourcing; blocking within an established set; the beat
> breakdown; and every first draft. Offer options where the history permits them and
> let me choose. State your confidence.
>
> **Where you have none:** the ten principles, the register system, the scope, the ID
> scheme, and the six constraints above.
>
> **Output contract for this pass — do exactly this and stop:**
>
> 1. Complete `bible/06-uncertainty-ledger.md` for Marcianople. Every row classified
>    A/I/P/U with reasoning, and each mapped to a register. Flag anything where you
>    are working from memory rather than a source you can cite, explicitly.
> 2. Complete `bible/03-cast.md` and produce one filled `templates/character-sheet.md`
>    per principal in `assets/characters/`, using the ID scheme. For faces and
>    builds, give me three to six options each, described in words. Do not pick.
> 3. Complete `bible/04-locations.md` and produce filled location plans for the four
>    pilot sets in `assets/locations/`. Research first; say plainly where the
>    archaeology does not support a claim.
> 4. Complete `bible/05-continuity-and-state.md` — the four-state arc, the object
>    ownership ledger, the persistent conditions.
> 5. Draft `templates/beat-board.md` for the 90 seconds, with the information
>    schedule and the narration-counterpoint table filled in.
>
> **Do not generate or describe final imagery yet.** No prompts for finished frames.
> Text assets only. We approve those before anything is drawn.
>
> When you finish, give me a short list of the decisions you need from me before the
> next pass.

---

## Why the brief is shaped this way

**Scope lock first.** Without one sentence of scope, a capable model will try to
build the whole Roman world and produce a hundred assets before anyone discovers the
pipeline doesn't work.

**Locked versus open, stated explicitly.** The failure mode with a strong model is
not that it does too little, it's that it helpfully reinvents the system you already
settled. The decision ledger prevents that without suppressing its judgement where
judgement is wanted.

**Templates, not descriptions of templates.** Handing over empty structured files
means the output is comparable, diffable, and machine-checkable. Describing the
format in prose produces seven slightly different formats.

**One output contract per pass.** "Fill everything in" produces a shallow pass over
everything. Naming five deliverables and saying "stop" produces depth.

**Options, not decisions, on anything aesthetic.** Six Fritigern silhouettes
described in words costs nothing and keeps authorship where it belongs. Once one is
chosen, it locks, and the freedom is spent deliberately rather than drifting.

**Uncertainty first, before design.** The ledger drives the register system, so it
has to exist before anything is rendered. Building it first also surfaces early
where the history is too thin to support the sequence as imagined — which is much
cheaper to learn now.
