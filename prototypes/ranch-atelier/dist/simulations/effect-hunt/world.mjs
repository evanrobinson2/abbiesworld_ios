// The ground the hunt drives on. `fromBoard(board, opts)` wraps window.AbbieTown.board (the Winchester hex board) in the
// four things the hunt needs. Scene axes: x east, z south, so the board's north is -z. `scale` is scene metres per board
// metre and `origin` is where the board's middle sits in the scene (both 1 / 0,0 unless the town says otherwise).
export function fromBoard(board, {scale = 1, origin = {x: 0, z: 0}, lift = 0, near = null} = {}) {
 const toBoard = (x, z) => [(x - origin.x) / scale, -(z - origin.z) / scale];
 const world = {
  board, scale, origin,
  heightAt: (x, z) => board.heightAt(...toBoard(x, z)) * 1 + lift,
  onBoard: (x, z) => !!board.tileAt(...toBoard(x, z)),
  tileAt: (x, z) => board.tileAt(...toBoard(x, z)),
  toScene: (px, py) => ({x: origin.x + px * scale, z: origin.z - py * scale}),
  home: {x: origin.x, z: origin.z},
  nearObstacles: near // (x, z) => [{x, z, r}] houses, trees and walls close by, in scene metres; optional
 };
 return world;
}
