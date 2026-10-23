# Paper body

One parametric papercraft base body in eight types: male and female, each average, heroic, skinny and fat
(`body.py`; a type is a dict of multipliers, not a new model). Each type writes `out/<sex>-<build>.glb` and a
`.json` of measurements and sockets (head, chest, waist, hips, shoulders, hands, hips, feet) that armour fits to.

`dress.py` fits the six Roman kit parts (`tools/roman-kit`) to every type from those measurements and writes
`out/roman-<sex>-<build>.glb`. `lineup.py` renders all eight side by side; `closeup.py` renders one from three sides.

Picks board for the papercraft figure concepts and these lineups: https://claude.ai/artifact/MJ7asT8iPXEmhtHfELHbMc

First-pass fit, still to do: the helmet's cheek guards sit over the face, and the shoulder guards need tidying.
