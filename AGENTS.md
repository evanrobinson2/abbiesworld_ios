# Abbie’s World operator instructions

Read `CLAUDE.md` for the repository’s shared vision, implementation and release contracts. Those project contracts apply to all operators, not only Claude. Read applicable nested `AGENTS.md` files before editing their areas.

## Studies and communication

Read `docs/design/STUDIES.md` before researching, proposing, building, reviewing or delivering a study. Studies are Evan’s research and creative directions developed through attention, refinement and feedback toward game readiness. Use a conspicuous maturity stamp: **Exploration**, **Proposal**, **Draft**, or **Final / Game Ready**. Stages are not mandatory steps. Keep shared timestamped feedback and research context attached to the stable study.

New and revised standalone studies use the versioned R2 publisher described in that existing standard: `preview/<id>/study.json` → `study-publish` on `main` → immutable bundle → verified conditional promotion. Do not deploy the entire game, create another Vercel project, or use the legacy mutable preview workflow for a static study. Server changes and accepted game integration still use the existing coordinated release process. Never describe a workflow success as full delivery: prove the exact revision, phone/desktop flow, authenticated feedback readback, and applicable fresh MCP capture.

The Mini Game Designer process is a Proposal study in this repository. Its editable Page is a companion artifact, not a substitute for the online study.

Delivery does not count until the exact canonical online link works and its claimed review flow is verified. A local preview, commit, merge, deploy receipt or HTTP 200 alone is not delivery. Study publication, game readiness and live game integration are different claims; report them separately.
