/**
 * Finger Lemmings — level blueprints.
 * Legend: # wall  . floor  S spawn  G goal  X hazard
 */

export const TILE = 40;

export const LEVELS = [
  {
    id: 1,
    name: "Warm-up corridor",
    need: 4,
    spawnEvery: 0.4,
    maxDots: 8,
    map: [
      "##############",
      "#S...........#",
      "#.##########.#",
      "#............#",
      "##########.#.#",
      "#..........G.#",
      "##############",
    ],
  },
  {
    id: 2,
    name: "Don’t drop them",
    need: 5,
    spawnEvery: 0.45,
    maxDots: 10,
    map: [
      "################",
      "#S....#........#",
      "#####.#.##.###.#",
      "#.....#..X.....#",
      "#.#########.##.#",
      "#.........X..G.#",
      "#####.##########",
      "#..............#",
      "################",
    ],
  },
  {
    id: 3,
    name: "Split attention",
    need: 7,
    spawnEvery: 0.4,
    maxDots: 12,
    map: [
      "##################",
      "#S....#..........#",
      "####..#..######..#",
      "#.....#......X...#",
      "#.##.######.####.#",
      "#.##........#..G.#",
      "#.###########.##.#",
      "#....X...........#",
      "##################",
    ],
  },
];

export function parseLevel(level) {
  const rows = level.map;
  const h = rows.length;
  const w = rows[0].length;
  const tiles = [];
  const spawns = [];
  const goals = [];
  const hazards = [];

  for (let y = 0; y < h; y++) {
    tiles[y] = [];
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x] || "#";
      if (ch === "#") tiles[y][x] = "wall";
      else if (ch === "X") {
        tiles[y][x] = "hazard";
        hazards.push({ x, y });
      } else {
        tiles[y][x] = "floor";
        if (ch === "S") spawns.push({ x, y });
        if (ch === "G") goals.push({ x, y });
      }
    }
  }

  return {
    ...level,
    w,
    h,
    tiles,
    spawns,
    goals,
    hazards,
    pixelW: w * TILE,
    pixelH: h * TILE,
  };
}
