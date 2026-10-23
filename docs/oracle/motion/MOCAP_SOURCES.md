# Free motion to learn from, and what we may ship

Oracle note, 2026-10-23. Evan: "I want the real models and true animation... after 30 years of mocap you'd think
some of these would be available." They are. This is the index, with licences; the machine-readable copy is
`mocap-sources.json`, and each game's "How it moves" (`tools/steam-study/motion_notes.py`, shown on the Oracle's game
pages) links the talks that explain how that game's characters move.

| Source | What's in it | Licence | Ship in Abbie's World? |
|---|---|---|---|
| [CMU Graphics Lab Motion Capture Database](http://mocap.cs.cmu.edu/) | About 2,600 takes from 144 subjects: walks, runs, sports, dance, everyday actions. BVH by cgspeed; FBX at [4TU](https://data.4tu.nl/datasets/0448aab2-3332-449f-a8e2-d208cb58c7df) | Free for all uses, credit requested | Yes. Character Studio's 33 clips come from here |
| [Mixamo](https://www.mixamo.com/) (Adobe) | Thousands of clips plus auto-rigging | Royalty-free in games, no credit needed; no redistribution of raw files; no machine-learning training ([FAQ](https://community.adobe.com/questions-696/mixamo-faq-licensing-royalties-ownership-eula-and-tos-589400)) | Yes, baked into our models only; never loose files in the public repo |
| [100STYLE](https://zenodo.org/record/8127870) ([paper](https://arxiv.org/pdf/2201.04439)) | Over 4 million frames: 100 walking and running styles in every direction | CC BY 4.0 per the authors; confirm before shipping | Yes, with credit |
| [Quaternius Universal Animation Library](https://quaternius.com/packs/universalanimationlibrary.html) | 120+ game animations on one humanoid rig, FBX/GLB/Blend | CC0 | Yes |
| [Ubisoft LAFAN1](https://github.com/ubisoft/ubisoft-laforge-animation-dataset) | 77 long takes, about 4.6 hours: walks, runs, obstacles, dance, falls and get-ups | CC BY-NC-ND 4.0 | No. Study only: watch, measure timing and weight |
| [Bandai Namco Research Motion Dataset](https://github.com/BandaiNamcoResearchInc/Bandai-Namco-Research-Motiondataset) | About 3,000 moves; the same actions in moods such as active, tired and happy | CC BY-NC 4.0 | No while we charge money. Study how mood changes an action |

## The talks that explain believable motion

- Simon Clavet, [Motion Matching and The Road to Next-Gen Animation](https://gdcvault.com/play/1023280/Motion-Matching-and-The-Road) (GDC 2016)
- David Bollo, [Inertialization](https://gdcvault.com/play/1025165/Inertialization-High-Performance-Animation-Transitions) (GDC 2018)
- Daniel Holden, [Code vs data driven displacement](https://theorangeduck.com/page/code-vs-data-driven-displacement) and [Learned motion matching](https://theorangeduck.com/page/learned-motion-matching)
- [The Animation Pipeline of Overwatch](https://gdcvault.com/play/1024267/The-Animation-Pipeline-of-Overwatch) (GDC)
- Chris Hecker et al., [Real-time motion retargeting to highly varied user-created morphologies](https://chrishecker.com/Real-time_Motion_Retargeting_to_Highly_Varied_User-Created_Morphologies) (Spore, SIGGRAPH 2008)
- Masahiro Sakurai, [Eight Hit Stop Techniques](https://nintendowire.com/news/2022/12/12/this-week-in-sakurai-12-5-12-11-fine-tuning-hit-stop-and-cheating-the-system/) (summary)

## Rules

- A game's own animation files are never extracted or copied, even from Evan's installs. We study how they move.
- Non-commercial sets (LAFAN1, Bandai Namco) are for study: timing, weight, how mood changes a walk. Their clips
  never ship and are never edited into ours.
- Every clip we ship records its source and licence in the asset's `provenance.json` (or Character Studio's
  `mocap/index.json`).
