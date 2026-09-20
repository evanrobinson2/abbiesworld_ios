# Motion Truth: Canonical Walk Cycle

## Overview

A standard walk cycle consists of 8 key poses representing one complete stride (left foot forward → right foot forward → repeat).

## The 8 Canonical Poses

### A-Sequence (Right foot leads first)

| Pose | Name | Description |
|------|------|-------------|
| 1 | CONTACT A | Right heel strikes ground, left foot pushing off (toes), wide stance |
| 2 | DOWN A | Body at lowest point, right knee bent absorbing impact, left leg beginning to lift |
| 3 | PASSING A | Left leg swings forward past standing right leg, legs close together |
| 4 | UP A | Body at highest point, left leg extended forward in air, right leg straight |

### B-Sequence (Left foot leads - mirror of A)

| Pose | Name | Description |
|------|------|-------------|
| 5 | CONTACT B | Left heel strikes ground, right foot pushing off |
| 6 | DOWN B | Body at lowest point, left knee bent, right leg lifting |
| 7 | PASSING B | Right leg swings forward past standing left leg |
| 8 | UP B | Body at highest point, right leg extended forward in air |

## Animation Sequence

The loop plays:
```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 1 (repeat)
```

## Reference Files

- `walk-reference-silhouettes.png` - Full 8-pose sequence
- `walk-reference-A-sequence.png` - Poses 1-4 with labels
- `walk-reference-B-sequence.png` - Poses 5-8 with labels

## Key Animation Principles

1. **Ground Contact**: Poses 1 and 5 show heel strike
2. **Weight Absorption**: Poses 2 and 6 show lowest body position
3. **Passing Position**: Poses 3 and 7 show legs crossing
4. **Push-off Apex**: Poses 4 and 8 show highest body position

## Constraints for Generation

When generating Pip in these poses:
- Maintain strict side-profile view
- Direction: Walking RIGHT
- Ground plane must be consistent
- Scale must be consistent
- Only leg positions and arm swing should change
- Character identity (hair, costume, proportions) must be preserved
