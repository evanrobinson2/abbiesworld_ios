# After shots: light pass (R5, R4, MB9)

Same cameras and hours as `../ranch` and `../moon`, taken with `tools/remaster-shots` (weather fixed to clear) on the
weather branch (PR #153). Mean lightness, 0 to 255:

| Shot | Before | After |
|---|---|---|
| r00-wide (12:00) | 197 | 190 |
| r12-wide-golden (17:12) | 159 (rain) | 165 |
| r13-wide-night (22:00) | 15 | 40 |
| m00-wide (12:00) | 56 | 56 |
| m08-wide-night (22:00) | 56 | 14 |

The Moon's night only matched noon because a paused `setHour` never updated the time of day; that's fixed in `lab.mjs`.
Still open: meteorite pulse, sunrise terminator sweep, contact shadows under props, the Earth's night side.
