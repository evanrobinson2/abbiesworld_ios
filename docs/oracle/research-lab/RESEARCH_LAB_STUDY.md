# AW-STUDY-0063 - The Research Lab

Status: drafted (concept, playable preview; not in the game yet).

Evan, 2026-10-24: "design a research lab in the game that I can go into and inspect these studies. And it could be
abbies.world/studies."

## The idea
A glass-domed lab in Winchester. You walk in, and every study stands on its own pedestal under a jar with a glowing
specimen. Walk up, tap it, and an inspection card shows the picture, the one-line "why it matters", the status and a
"Read the study" button. The studies site (`app.abbies.world/studies/`) is the same shelves seen as a list.

- Five wings, one per shelf of the studies site (People, Games, Look, Places, Oracle), each with its own glass colour.
- The central table is the seven-hex Winchester map; the three newest studies carry a NEW flag.
- The Scene Builder Lab (AW-STUDY-0062) is the flask archway at the north: a workshop room of the same lab.
- Data is `studies/index.html` itself (`preview/research-lab/build.py` writes `studies.json`), so a new study appears
  on a pedestal with no extra work.
- A link such as `.../research-lab/index.html#school-jump` walks you straight to that pedestal.

## How information is shown (the grid)
Pedestal, jar and flag are diegetic (a lab full of specimens, the characters would know them). The inspection card is
overlay: precise reading, summoned by a tap, never on screen otherwise. The play HUD has no words; the only chrome is
a small title pill and a first-run hint that fades.

## Decisions for Evan
1. **Where it lives.** Recommended: the lab is the front door of abbies.world/studies (grown-ups get the list, one
   tap on "Walk in" gives the lab) and, in the town, a door in a Winchester zone. Only the hex city thread edits
   Winchester, so the door placement goes to them after you pick.
2. **Open to anyone.** No sign-in; studies are read-only here.
3. **Tour:** no (this is a grown-up room, not part of the player tour).

## Build path (each phase ends in a headless run, behind `?exp=research-lab`)
1. Lab scene as a real tile (the concept room, built from library kit, thumbnails on the jars).
2. Studies list feeds pedestals live; deep links by study id.
3. Door in Winchester (hex city thread) and the abbies.world/studies front door.
4. Inspect close-up: pick up the jar to see the study's own page inside the room.

## Context
Recorded in `prototypes/ranch-atelier/dist/studies/context.json` (`research-lab`).
