# Studies in Abbie’s World

Project convention established by Evan on October 24, 2026. Applies to all operators, agents and contributors in `evanrobinson2/abbiesworld_ios`.

A **study** is a durable workspace for research or a push in a particular creative direction requested by Evan. It develops through attention, refinement, feedback and playable or inspectable evidence until the relevant parts are ready to enter the game. A process, interaction, visual direction, system or complete experience can all be subjects of studies. Studies are not disposable demos, and publishing a study does not authorize integrating its ideas into the game.

## Maturity is visible before review

Every study displays a conspicuous outlined rubber stamp in the top right or another immediately visible location. Use exactly one of these labels for the current presentation:

| Stamp | What Evan is reviewing |
| --- | --- |
| Exploration | Questions, research and possibilities. The direction is still open. |
| Proposal | A coherent recommended direction, with alternatives and tradeoffs available for discussion. |
| Draft | A developed implementation or artifact being refined against the intended experience. |
| Final / Game Ready | The stated scope has the required acceptance and verification evidence for game use. Record remaining integration work separately. |

These are descriptive states, not a mandatory sequence. Studies can start at any appropriate level, skip levels, or return to an earlier level when the direction changes. A beautiful presentation does not establish readiness. Explicitly label any subsection with a different maturity and any mocked interaction, simulated generation, placeholder asset, local-only save, or unverified behavior.

Theme the study to the intended creative experience. Use enough representative presentation to make the question understandable without implying unfinished work is final game art. Rough blips, MIDI, or low-quality stand-ins must not be presented as the intended game quality. Existing catalogued audio, asset provenance and game-feel rules still apply. Preserve creative momentum with a clear review question and concrete next action, rather than an approval ceremony at every stage.

## A study is a continuing conversation

- Keep one stable study identity, repository record and canonical online URL as the work evolves. Link the owning chat and editable artifact when present.
- State the intent, current maturity, current review question, implemented scope, important unknowns and next action.
- Keep the research context and sources in `prototypes/ranch-atelier/dist/studies/context.json`. Distinguish a model-authored Oracle consultation from a studies-only template; never invent an Oracle opinion.
- Provide the shared right-side feedback panel: one note per multiline input, timestamped, associated with the study and reviewed revision/interaction. Notes must be readable by the project operators and the application through the existing authorized shared feedback service. A device-local draft is not a submitted note.
- Preserve Evan’s wording, then record the interpretation, resulting decision or change, and its verification. Keep unresolved feedback visible; do not silently mark it accepted or resolved.
- Refine the existing study instead of spawning disconnected replacement demos. Preserve significant prior decisions and evidence so changes can be understood.

## Delivery means the online link works

Delivery is incomplete until the exact canonical online URL opens the intended current study and its claimed behavior works. Local files, artifacts in chat, commits, merges, deployment receipts and HTTP 200 responses alone do not satisfy delivery.

Before reporting delivery, verify the deployed revision, load the exact URL in a browser, inspect phone and desktop presentation, exercise the review interactions, and verify feedback submission plus authorized readback. For interactive scenes, perform the applicable fresh MCP state/image checks. Record the URL, revision/build, time, tests and any remaining limitations. Authentication must be usable through the normal sign-in flow; do not bypass it or publish credentials. Distinguish test notes from Evan’s feedback.

If any required live check fails, keep delivery pending and state the specific blocker. Never substitute a local preview or claim a broken, stale or merely scheduled link is delivered.

## Study readiness and game integration are separate

Track maturity, publication verification, experiential acceptance and game integration independently. A Proposal can be successfully delivered for review while remaining a proposal. A Final / Game Ready study still needs the applicable integration, registry, world-entry, persistence, device/runtime and end-to-end checks before its feature is called live in the game. Follow `INVARIANTS.md` and the existing release process; this convention does not relax those gates.

## Mini Game Designer process study

The Mini Game Designer production process is a **Proposal** study. Its purpose is to refine a repeatable path from emotional intention through research, experiments, assets, feedback and verified delivery. Validate it with a complete pilot before describing the process as proven.

- Repository record: `docs/oracle/mini-game-designer/MINI_GAME_DESIGNER_STUDY.md`.
- Editable working artifact: https://chatgpt.com/space/page_d1cd857933e081919b3188485df97f3e
- Oracle status: the October 24 consultation returned `source: studies`, `model: null`; the requested 50,000-token opinion remains outstanding.
- Online study publication and verification must be recorded by the publishing operator; the editable artifact alone does not complete that delivery.
