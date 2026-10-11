/**
 * Sample starship room pack — game-ready metadata for the composed renderer.
 */
export const SHIP = {
  name: "AW-Prospect",
  decks: "∞",
};

export const PAL = {
  hull: "#c9b8a4",
  hullDeep: "#8f8072",
  hullDark: "#3a342e",
  trim: "#8a6a4a",
  trimLite: "#c4a07a",
  guide: "#5ec8d8",
  amber: "#e0a45a",
  life: "#e8b0b8",
  ink: "#1a1612",
  cream: "#f3ebe0",
  void: "#0b0e14",
  glass: "rgba(140, 190, 220, 0.18)",
};

/** Logical room tile: 4:3. 2x rooms are twice as wide. */
export const TILE_H = 540;
export const TILE_W = 720; // 4:3

export const ROOMS = [
  {
    id: "OBS-01",
    name: "Observation Gallery",
    deck: 16,
    district: "obs",
    purpose: "Watch the stars",
    format: "tile-2x",
    aperture: "gallery",
    profile: "obs",
    doors: { left: "CMD-02", right: "CMD-02" },
    hero: "gallery",
    pip: "sky",
  },
  {
    id: "CMD-02",
    name: "Bridge Ante-Chamber",
    deck: 14,
    district: "cmd",
    purpose: "Receive the briefing",
    format: "tile-1x",
    aperture: "slit",
    profile: "cmd",
    doors: { left: "OBS-01", right: "CONN-01" },
    hero: "holomap",
    pip: "tactical",
  },
  {
    id: "CONN-01",
    name: "Pressure Spine",
    deck: 12,
    district: "conn",
    purpose: "Connect the districts",
    format: "tile-1x",
    aperture: "none",
    profile: "conn",
    doors: { left: "CMD-02", right: "SCI-04" },
    hero: "spine",
    pip: "directory",
  },
  {
    id: "SCI-04",
    name: "Spectrometry",
    deck: 11,
    district: "sci",
    purpose: "Sample the anomaly",
    format: "tile-1x",
    aperture: "port",
    profile: "sci",
    doors: { left: "CONN-01", right: "CREW-07" },
    hero: "analyzer",
    pip: "spectrum",
  },
  {
    id: "CREW-07",
    name: "Hab Nook",
    deck: 9,
    district: "crew",
    purpose: "Rest the crew",
    format: "tile-1x",
    aperture: "port",
    profile: "crew",
    doors: { left: "SCI-04", right: "ENG-01" },
    hero: "berth",
    pip: "schedule",
  },
  {
    id: "ENG-01",
    name: "Core Systems Bay",
    deck: 3,
    district: "eng",
    purpose: "Tune the core",
    format: "tile-2x",
    aperture: "none",
    profile: "eng",
    doors: { left: "CREW-07", right: "CONN-01" },
    hero: "core",
    pip: "telemetry",
  },
];

export function roomWidth(room) {
  return room.format === "tile-2x" ? TILE_W * 2 : TILE_W;
}

export function findRoom(id) {
  return ROOMS.find((r) => r.id === id) || ROOMS[0];
}

export function floorY() {
  return TILE_H * 0.82;
}
