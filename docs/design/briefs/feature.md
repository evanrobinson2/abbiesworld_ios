# Player-facing feature brief

**Design card**
- What the player needs to feel or know (in a child's words):
- How would the character know? (the in-world signal)
- Mode: none | diegetic | spatial | meta | overlay, and why not the one to its left
- Who it's for: player | grown-up | director
- The whole game adapts: light, music, sound, people, animals that change with the same signal

**Brief**
- Scene information manifest items this adds or reads (`docs/design/INFO_MANIFEST.md`):
- What lives on the presentation layer (`presentation()`), and what stays world layer:
- Grown-up view, if any (ledgers, logs), kept away from play:
- Tour: yes | no (Evan's rule, 2026-10-23: every new feature decides whether it joins the welcome tour). Yes means a
  stop and/or a chalk hint registered in `prototypes/ranch-atelier/dist/simulations/welcome/tour-stops.mjs`
  (AW-STUDY-0022); no means say why in a few words.

Done when: the `game-feel` PR check passes, the phone screenshot shows the world uncovered, and the PR answers
"could a character explain every on-screen thing?".
