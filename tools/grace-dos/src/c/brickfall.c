// BRICKFALL (AW-STUDY-0024): an original falling-blocks puzzle for Grace's computer. Our own code and our own look.
// Arrows left/right slide, up or X turns, Z turns the other way, down drops faster, SPACE drops all the way, P pauses.
#include "aw.h"

#define W 10
#define H 18
#define CELL 10
#define OX 110
#define OY 10

// seven shapes as four (x, y) cells in a 4x4 box, in their first turn; the others are found by turning
static const i8 SHAPE[7][4][2] = {
 {{0,1},{1,1},{2,1},{3,1}},   // bar
 {{1,0},{2,0},{1,1},{2,1}},   // block
 {{1,0},{0,1},{1,1},{2,1}},   // tee
 {{1,0},{2,0},{0,1},{1,1}},   // step right
 {{0,0},{1,0},{1,1},{2,1}},   // step left
 {{0,0},{0,1},{1,1},{2,1}},   // hook left
 {{2,0},{0,1},{1,1},{2,1}},   // hook right
};
static const u8 SIDE[7] = {4, 2, 3, 3, 3, 3, 3};          // the box each shape turns inside

static u8 well[H][W];            // 0 empty, 1..7 a brick colour
static int px_, py_, kind, turn_, nextk, score, lines, level, over, paused, bag[7], bagn;
static int flash[H], flashT;     // rows being cleared
static u32 best;

static void cells(int k, int t, int x, int y, int out[4][2]) {
 int n = SIDE[k];
 for (int i = 0; i < 4; i++) {
  int cx = SHAPE[k][i][0], cy = SHAPE[k][i][1];
  for (int r = 0; r < (t & 3); r++) { int nx = n - 1 - cy, ny = cx; cx = nx; cy = ny; }
  out[i][0] = x + cx; out[i][1] = y + cy;
 }
}
static int fits(int k, int t, int x, int y) {
 int c[4][2]; cells(k, t, x, y, c);
 for (int i = 0; i < 4; i++) { int cx = c[i][0], cy = c[i][1]; if (cx < 0 || cx >= W || cy >= H) return 0; if (cy >= 0 && well[cy][cx]) return 0; }
 return 1;
}
static int draw_bag(void) {
 if (bagn == 0) { for (int i = 0; i < 7; i++) bag[i] = i; for (int i = 6; i > 0; i--) { int j = rnd(i + 1), t = bag[i]; bag[i] = bag[j]; bag[j] = t; } bagn = 7; }
 return bag[--bagn];
}
static void spawn(void) {
 kind = nextk; nextk = draw_bag(); turn_ = 0; px_ = (W - SIDE[kind]) / 2; py_ = kind == 0 ? -1 : 0;
 if (!fits(kind, turn_, px_, py_)) over = 1;
}

// colours: 7 brick families of 4 shades each at 16.., plus the well, text and the sky
static void palette(void) {
 static const u8 base[7][3] = {{20,60,63},{63,58,16},{50,24,63},{24,63,28},{63,24,28},{24,34,63},{63,40,16}};
 for (int c = 0; c < 7; c++) for (int s = 0; s < 4; s++) { int f = 40 + s * 22; pal(16 + c * 4 + s, base[c][0] * f / 100 > 63 ? 63 : base[c][0] * f / 100, base[c][1] * f / 100 > 63 ? 63 : base[c][1] * f / 100, base[c][2] * f / 100 > 63 ? 63 : base[c][2] * f / 100); }
 pal(1, 63, 63, 63); pal(2, 38, 42, 52); pal(3, 63, 56, 20); pal(4, 4, 6, 14); pal(5, 8, 12, 26);
 for (int i = 0; i < 16; i++) pal(48 + i, 2 + i / 2, 4 + i / 2, 14 + i);   // night sky behind the well
}
static void brick(int x, int y, int c) {
 int b = 16 + (c - 1) * 4;
 rect(x, y, CELL, CELL, b + 1);
 rect(x, y, CELL, 1, b + 3); rect(x, y, 1, CELL, b + 3);
 rect(x, y + CELL - 1, CELL, 1, b); rect(x + CELL - 1, y, 1, CELL, b);
 rect(x + 3, y + 3, CELL - 6, CELL - 6, b + 2);
}
static void sky(void) {
 for (int y = 0; y < 200; y++) rect(0, y, 320, 1, 48 + y * 15 / 199);
 for (int i = 0; i < 40; i++) px((i * 97 + 13) % 320, (i * 53 + 7) % 130, 2 + (i & 1) * 0);
}
static void frame(int t) {
 sky();
 rect(OX - 4, OY - 4, W * CELL + 8, H * CELL + 8, 2); rect(OX - 2, OY - 2, W * CELL + 4, H * CELL + 4, 4);
 for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) {
  if (well[y][x]) { if (flash[y] && ((flashT / 3) & 1)) rect(OX + x * CELL, OY + y * CELL, CELL, CELL, 1); else brick(OX + x * CELL, OY + y * CELL, well[y][x]); }
  else if (((x + y) & 1) == 0) rect(OX + x * CELL, OY + y * CELL, CELL, CELL, 5);
 }
 if (!over) { int c[4][2], gy = py_; while (fits(kind, turn_, px_, gy + 1)) gy++;
  cells(kind, turn_, px_, gy, c); for (int i = 0; i < 4; i++) if (c[i][1] >= 0) rect(OX + c[i][0] * CELL + 2, OY + c[i][1] * CELL + 2, CELL - 4, CELL - 4, 2);
  cells(kind, turn_, px_, py_, c); for (int i = 0; i < 4; i++) if (c[i][1] >= 0) brick(OX + c[i][0] * CELL, OY + c[i][1] * CELL, kind + 1); }
 bigstr(8, 14, "BRICK", 2, 3); bigstr(8, 32, "FALL", 2, 3);
 str(8, 70, "SCORE", 2); num(8, 80, score, 6, 1);
 str(8, 100, "LEVEL", 2); num(8, 110, level, 2, 1);
 str(8, 130, "LINES", 2); num(8, 140, lines, 3, 1);
 str(226, 14, "NEXT", 2); rect(224, 26, 52, 36, 4);
 { int c[4][2]; cells(nextk, 0, 0, 0, c); int ox = 230 + (4 - SIDE[nextk]) * 4, oy = 32 + (nextk == 0 ? 4 : 0); for (int i = 0; i < 4; i++) { int x = ox + c[i][0] * 8, y = oy + c[i][1] * 8; rect(x, y, 8, 8, 16 + nextk * 4 + 1); rect(x, y, 8, 1, 16 + nextk * 4 + 3); rect(x, y + 7, 8, 1, 16 + nextk * 4); } }
 str(226, 90, "BEST", 2); num(226, 100, best, 6, 1);
 str(226, 160, "SPACE DROP", 2); str(226, 170, "P PAUSE", 2); str(226, 180, "ESC QUIT", 2);
 if (paused) { rect(OX + 10, OY + 70, 80, 24, 4); bigstr(OX + 14, OY + 74, "PAUSED", 2, 3); }
 if (over) { rect(OX + 6, OY + 56, 88, 50, 4); str(OX + 14, OY + 62, "GAME OVER", 1); str(OX + 12, OY + 76, "SPACE: AGAIN", 2); str(OX + 12, OY + 88, "ESC: QUIT", 2); }
}

static void tone(int hz, int frames, int *left) { beep(hz); *left = frames; }
static int sfx;

static void lock_piece(void) {
 int c[4][2]; cells(kind, turn_, px_, py_, c);
 for (int i = 0; i < 4; i++) if (c[i][1] >= 0) well[c[i][1]][c[i][0]] = kind + 1;
 tone(110, 3, &sfx);
 int n = 0; for (int y = 0; y < H; y++) { int full = 1; for (int x = 0; x < W; x++) if (!well[y][x]) full = 0; flash[y] = full; n += full; }
 if (n) { flashT = 0; static const int pts[5] = {0, 10, 30, 60, 100}; score += pts[n] * level; lines += n; level = 1 + lines / 10; if (level > 12) level = 12; tone(660 + n * 120, 10, &sfx); }
 else spawn();
 if (score > (int)best) best = score;
}
static void collapse(void) {
 int to = H - 1;
 for (int y = H - 1; y >= 0; y--) { if (flash[y]) continue; if (to != y) for (int x = 0; x < W; x++) well[to][x] = well[y][x]; to--; }
 for (; to >= 0; to--) for (int x = 0; x < W; x++) well[to][x] = 0;
 for (int y = 0; y < H; y++) flash[y] = 0;
 spawn();
}
static void reset(void) {
 for (int y = 0; y < H; y++) for (int x = 0; x < W; x++) well[y][x] = 0;
 score = lines = 0; level = 1; over = paused = 0; bagn = 0; nextk = draw_bag(); spawn(); flashT = 0; for (int y = 0; y < H; y++) flash[y] = 0;
}
static void try_turn(int d) {
 int t = (turn_ + d) & 3;
 static const i8 kick[5] = {0, -1, 1, -2, 2};
 for (int i = 0; i < 5; i++) if (fits(kind, t, px_ + kick[i], py_)) { px_ += kick[i]; turn_ = t; tone(520, 2, &sfx); return; }
}

static void title(void) {
 int t = 0;
 for (;;) {
  sky(); for (int i = 0; i < 7; i++) for (int j = 0; j < 3; j++) { int x = 40 + i * 34, y = 40 + ((t / 4 + i * 5) % 40) - 20 + j * 0; if (j == 0) brick(x, y, i + 1); }
  rect(30, 78, 260, 44, 4); bigstr(52, 90, "BRICKFALL", 3, 3);
  str(92, 140, "GRACE'S COMPUTER, 1986", 2); if ((t / 18) & 1) str(100, 160, "PRESS SPACE", 1);
  str(70, 180, "ARROWS MOVE  X TURN  ESC QUIT", 2);
  flip(); t++;
  if (hit(SC_SPACE) || hit(SC_ENTER)) return;
  if (hit(SC_ESC)) quit();
 }
}

void aw_main(void) {
 mode13(); hook_keys(); palette(); seed ^= now(); fps = 35;
 title(); reset(); beep(880); sfx = 2;
 int drop = 0, das = 0, tick = 0;
 for (;;) {
  tick++;
  if (sfx && --sfx == 0) hush();
  if (hit(SC_ESC)) quit();
  if (over) { if (hit(SC_SPACE) || hit(SC_ENTER)) { reset(); } }
  else if (hit(SC_P)) paused = !paused;
  if (!over && !paused) {
   if (flashT || (flash[0] | flash[1] | flash[2] | flash[3] | flash[4] | flash[5] | flash[6] | flash[7] | flash[8] | flash[9] | flash[10] | flash[11] | flash[12] | flash[13] | flash[14] | flash[15] | flash[16] | flash[17])) {
    if (++flashT > 18) { flashT = 0; collapse(); }
   } else {
    // sideways with a short delay before the repeat, like a keyboard
    int dx = 0; if (key(SC_LEFT)) dx = -1; else if (key(SC_RIGHT)) dx = 1;
    if (dx == 0) das = 0; else { if (das == 0 || (das > 8 && (das & 1))) { if (fits(kind, turn_, px_ + dx, py_)) { px_ += dx; tone(300, 1, &sfx); } } das++; }
    if (hit(SC_UP) || hit(SC_X)) try_turn(1); if (hit(SC_Z)) try_turn(3);
    if (hit(SC_SPACE)) { while (fits(kind, turn_, px_, py_ + 1)) { py_++; score += 1; } lock_piece(); drop = 0; }
    else {
     int speed = 30 - level * 2; if (speed < 4) speed = 4; if (key(SC_DOWN)) speed = 2;
     if (++drop >= speed) { drop = 0; if (fits(kind, turn_, px_, py_ + 1)) { py_++; if (key(SC_DOWN)) score++; } else lock_piece(); }
    }
   }
  }
  frame(tick); flip();
 }
}
