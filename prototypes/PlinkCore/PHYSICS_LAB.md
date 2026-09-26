# Peglin physics — breakthrough plan

Chat-tuning gravity / tilt / mode switches will not converge. Lock constants from
**measured motion** in board-normalized units, then port once into SpriteKit.

## Physics Lab (in app)

`PlinkCore` launches into **Physics Lab** with scenarios:

| Code | Scenario | Locks |
|---|---|---|
| A | Drop straight | g from y = ½gt² |
| A2 | Angled free flight | g + vx conservation (vxσ) |
| B | Single peg | e = \|v\|after / \|v\|before |
| C | Wall bounce | wall e + vx flip |
| D | Peg field | \|vx\|/\|v\| after ricochets |

Live meters: `vx, vy, |v|, |vx|/|v|, g cmd, g fit, e last, board y`.

Commanded defaults = trailer candidates (`PeglinCandidates`): g=1200, e≈0.88, launch≈560.

Tap board or **Fire**. Fit note prints after each shot.

## Trailer measurement pass (order-of-magnitude)

Source: `/tmp/peglin-ref/ref.mp4` · motion-diff tracks · report:
`/tmp/peglin-ref/analysis/motion_report.json`

| Quantity | Trailer estimate | Lab commanded |
|---|---|---|
| g | ~1.5 board-heights / s² (~1200 pt/s² @ 800px) | 1200 |
| \|vx\| / \|v\| | mean ~0.44; lateral arcs 0.7–0.9 | metered live |
| bounce speed ratio | ~0.88 | peg/wall e=0.88 |

**Implication:** upright board; horizontal feel from high `e` + |vx| retention,
not camera tilt as the primary model.

## Next after lab

1. Run A → confirm g fit ≈ g cmd (±10%).
2. Run A2 → vxσ small; |vx|/|v| stays high mid-arc.
3. Run B/C → e_last ≈ 0.88.
4. Run D → |vx|/|v| climbs toward 0.4+ after hits.
5. Prefer a clean 60fps Peglin board capture (or 8–12 hand-labeled centers)
   over more trailer auto-tracking for final lock.
