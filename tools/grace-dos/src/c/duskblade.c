// DUSKBLADE (AW-STUDY-0024): an original swordfighting platformer for Grace's computer, in the spirit of the old palace
// adventures: single-screen rooms, careful jumps, loose floor, blades and gates, and duels. Our own code, our own art.
// Arrows run (SHIFT walks carefully), UP jumps or climbs, DOWN crouches or lets you down, X draws the sword and lunges,
// Z parries, P pauses, ESC quits. The people are drawn from key poses, eased between like traced film (fig.h).
#include "aw.h"
#include "fig.h"
#include "duskpose.h"

#define FX 16                       // positions are in sixteenths of a pixel
static const int FL[3] = {56, 118, 180};   // the floor line of each of a room's three storeys

// ---------- the palace: four rooms, three storeys each ----------
// ' ' open  # floor  W wall  ^ spikes  L loose floor  B blades  T plate  G gate  D exit  h potion  s start  g guard  b captain
#define ROOMS 4
static const char *MAP[ROOMS][3] = {
 {"####  ####", "#s######L#", "##########"},
 {"##########", "##^#  ##g#", "##########"},
 {"##########", "#T#B####G#", "##########"},
 {"##########", "#h#####bD#", "##########"},
};
typedef struct { u8 t[3][10]; int loose[3][10]; } room_t;     // tile kinds and loose-floor timers
static char tile[ROOMS][3][10];
static int loose_t[ROOMS][3][10];     // 0 solid, >0 shaking, <0 fallen
static int gate_open[ROOMS];          // frames the gate stays up
static int gate_h[ROOMS];             // 0..40 how far it is raised
static int plate_down[ROOMS];

// ---------- people ----------
typedef struct { int x, y, row, vx, vy, face, hp, maxhp, state, t, ai, cool, alive, drawn, kind, fall_from, hurt; const u8 *seq; int n, i, ft; pose_t from, cur; int loop; const u8 *dur; } man_t;
enum {ST_IDLE, ST_RUN, ST_WALK, ST_CROUCH, ST_JUMP, ST_LEAP, ST_FALL, ST_LAND, ST_CLIMB, ST_DROP, ST_DRAW, ST_FIGHT, ST_LUNGE, ST_PARRY, ST_HIT, ST_DEAD, ST_SHEATHE};

#define SEQ(name, ...) static const u8 name[] = {__VA_ARGS__};
SEQ(A_IDLE, P_STAND)                         SEQ(D_IDLE, 6)
SEQ(A_RUN, P_RUN0, P_RUN1, P_RUN2, P_RUN3, P_RUN4, P_RUN5)   SEQ(D_RUN, 3, 3, 3, 3, 3, 3)
SEQ(A_WALK, P_WALK0, P_WALK1, P_WALK2, P_WALK3)             SEQ(D_WALK, 5, 5, 5, 5)
SEQ(A_CROUCH, P_CROUCH)                      SEQ(D_CROUCH, 4)
SEQ(A_JUMP, P_CROUCH, P_JUMP, P_JUMP, P_STAND)              SEQ(D_JUMP, 3, 6, 4, 4)
SEQ(A_LEAP, P_RUN0, P_LEAP)                  SEQ(D_LEAP, 2, 8)
SEQ(A_FALL, P_FALL)                          SEQ(D_FALL, 4)
SEQ(A_LAND, P_LAND, P_CROUCH, P_STAND)       SEQ(D_LAND, 5, 6, 4)
SEQ(A_CLIMB, P_HANG, P_CLIMB1, P_CLIMB2, P_STAND)           SEQ(D_CLIMB, 6, 8, 8, 6)
SEQ(A_DROP, P_REACH, P_HANG, P_HANG)         SEQ(D_DROP, 5, 8, 6)
SEQ(A_DRAW, P_STAND, P_DRAW1, P_DRAW2, P_GUARD0)            SEQ(D_DRAW, 2, 4, 4, 4)
SEQ(A_FIGHT, P_GUARD0, P_GUARD1)             SEQ(D_FIGHT, 7, 7)
SEQ(A_LUNGE, P_LUNGE0, P_LUNGE1, P_LUNGE2, P_GUARD0)        SEQ(D_LUNGE, 3, 4, 4, 4)
SEQ(A_PARRY, P_PARRY)                        SEQ(D_PARRY, 14)
SEQ(A_HIT, P_HIT, P_GUARD0)                  SEQ(D_HIT, 6, 4)
SEQ(A_DIE, P_HIT, P_DIE0, P_DIE1)            SEQ(D_DIE, 3, 7, 10)
SEQ(A_SHEATHE, P_DRAW2, P_DRAW1, P_STAND)    SEQ(D_SHEATHE, 4, 4, 4)

static pose_t lerp_pose(const pose_t *a, const pose_t *b, int t) {
 pose_t r; i16 *ra = (i16 *)&r; const i16 *pa = (const i16 *)a, *pb = (const i16 *)b;
 for (int k = 0; k < 10; k++) ra[k] = pa[k] + (pb[k] - pa[k]) * t / 256;
 if (a->sw < -900 || b->sw < -900) r.sw = t >= 128 ? b->sw : a->sw; else r.sw = a->sw + (b->sw - a->sw) * t / 256;
 return r;
}
static void play(man_t *m, const u8 *seq, const u8 *dur, int n, int loop) {
 if (m->seq == seq) return;
 m->from = m->cur; m->seq = seq; m->dur = dur; m->n = n; m->i = 0; m->ft = 0; m->loop = loop;
}
static void replay(man_t *m, const u8 *seq, const u8 *dur, int n, int loop) { m->seq = 0; play(m, seq, dur, n, loop); }
static int anim_done(man_t *m) { return !m->loop && m->i >= m->n - 1 && m->ft >= m->dur[m->i]; }
static void animate(man_t *m) {
 m->ft++;
 if (m->ft >= m->dur[m->i]) {
  if (m->i < m->n - 1 || m->loop) { m->from = POSES[m->seq[m->i]]; m->i = (m->i + 1) % m->n; m->ft = 0; if (!m->loop && m->i == 0) { m->i = m->n - 1; m->ft = m->dur[m->i]; } }
  else m->ft = m->dur[m->i];
 }
 int span = m->dur[m->i]; if (span < 1) span = 1;
 int t = m->ft * 256 / span; if (t > 256) t = 256;
 m->cur = lerp_pose(&m->from, &POSES[m->seq[m->i]], t);
}

static man_t hero, foe[3]; static int nfoe;
static int room = 0, over, won, paused, tick, ticks_left, hint, checkpoint_room, shake;
static look_t HEROLOOK, GUARDLOOK, CAPLOOK;

// ---------- the world ----------
static char at_(int r, int row, int c) { if (c < 0 || c > 9) return 'W'; return tile[r][row][c]; }
static int solid_floor(int r, int row, int c) {
 char k = at_(r, row, c);
 if (k == ' ' || k == 'W') return 0;
 if (k == 'L' && loose_t[r][row][c] < 0) return 0;
 return 1;
}
static int blocks(int r, int row, int c) { char k = at_(r, row, c); return k == 'W' || (k == 'G' && gate_h[r] < 36); }
static int floor_at(int px_) { int c = px_ / 32; return solid_floor(room, hero.row, c); }

// colours: 8 wall, 9 mortar, 10 slab, 11 slab top, 12-14 torch light, 15 steel, 16 spike, 17 gold, 18 dark, 19 white, 20 skin, 21 tunic, 22 trim,
// 23 guard tunic, 24 guard trim, 25 captain, 26 heart, 27 shadow, 28 door glow, 29 blood red
static void palette(void) {
 pal(0, 4, 3, 8); pal(8, 14, 11, 18); pal(9, 9, 7, 13); pal(10, 28, 23, 30); pal(11, 40, 34, 40); pal(12, 63, 44, 16); pal(13, 63, 32, 8); pal(14, 56, 18, 6);
 pal(15, 52, 54, 60); pal(16, 58, 58, 62); pal(17, 63, 54, 18); pal(18, 6, 4, 10); pal(19, 63, 63, 63); pal(20, 47, 34, 24); pal(21, 58, 56, 50); pal(22, 18, 30, 56);
 pal(23, 44, 14, 14); pal(24, 12, 8, 8); pal(25, 36, 16, 50); pal(26, 63, 14, 22); pal(27, 8, 6, 12); pal(28, 63, 56, 30); pal(29, 50, 6, 8); pal(30, 18, 14, 22);
}
static void load_room_state(void) {
 for (int r = 0; r < ROOMS; r++) { for (int row = 0; row < 3; row++) for (int c = 0; c < 10; c++) { tile[r][row][c] = MAP[r][row][c]; loose_t[r][row][c] = 0; } gate_open[r] = 0; gate_h[r] = 0; plate_down[r] = 0; }
}

static void man_init(man_t *m, int x, int row, int face, int kind) {
 m->x = x * FX; m->row = row; m->y = FL[row]; m->vx = m->vy = 0; m->face = face; m->kind = kind; m->state = ST_IDLE; m->alive = 1; m->drawn = 0; m->ai = 0; m->cool = 30; m->t = 0; m->hurt = 0;
 m->maxhp = kind == 0 ? 3 : kind == 1 ? 3 : 5; m->hp = m->maxhp; m->seq = 0; m->cur = POSES[P_STAND]; m->from = m->cur;
 play(m, A_IDLE, D_IDLE, 1, 1);
}
static void enter_room(int r, int x_px, int keep_row) {
 room = r; nfoe = 0; int row0 = keep_row;
 for (int row = 0; row < 3; row++) for (int c = 0; c < 10; c++) {
  char k = tile[r][row][c];
  if ((k == 'g' || k == 'b') && nfoe < 3) { man_init(&foe[nfoe], c * 32 + 16, row, -1, k == 'b' ? 2 : 1); foe[nfoe].state = ST_FIGHT; foe[nfoe].drawn = 1; replay(&foe[nfoe], A_FIGHT, D_FIGHT, 2, 1); if (loose_t[r][row][c] < 0) foe[nfoe].alive = 0; nfoe++; }
 }
 (void)x_px; (void)row0;
}
static void start_room(int r) {
 // the guards stay dead once beaten: remember by blanking their tile
 enter_room(r, 0, 1);
}
static void spawn_hero(int r, int x, int row, int face) {
 man_init(&hero, x, row, face, 0); hero.hp = hero.maxhp = 3; room = r; enter_room(r, x, row);
}

// ---------- sound ----------
static int sfx, sfx_pri;
static void tone(int hz, int frames, int pri) { if (sfx && pri < sfx_pri) return; beep(hz); sfx = frames; sfx_pri = pri; }
static void clang(void) { tone(1500 + rnd(500), 3, 5); }

// ---------- drawing ----------
static void draw_back(int t) {
 clear(0);
 for (int row = 0; row < 3; row++) {
  int top = row == 0 ? 6 : FL[row - 1] + 6, bot = FL[row];
  rect(0, top, 320, bot - top, 8);
  for (int y = top; y < bot; y += 12) { rect(0, y, 320, 1, 9); int off = ((y / 12) & 1) * 16; for (int x = off; x < 320; x += 32) rect(x, y, 1, 12 < bot - y ? 12 : bot - y, 9); }
  // arches and torches
  for (int c = 0; c < 10; c++) {
   if (((c + row + room) % 3) == 0) { int ax = c * 32 + 6, ay = top + 10, ah = bot - ay; rect(ax, ay + 8, 20, ah - 8, 18); rect(ax + 4, ay + 2, 12, 6, 18); rect(ax + 2, ay + 5, 16, 4, 18); }
   if (((c + row * 2 + room) % 5) == 1 && c > 0 && c < 9) { int tx = c * 32 + 14, ty = top + 14; rect(tx, ty + 5, 3, 10, 18); rect(tx - 1, ty + 4, 5, 2, 24);
    int fl = (t / 3 + c * 5 + row) & 3; rect(tx - 1, ty - fl % 2, 5, 5 + fl % 2, 12 + (fl == 3)); rect(tx, ty - 3 - fl % 3, 3, 4, 13); rect(tx + 1, ty - 4 - fl % 3, 1, 2, 12);
    for (int g = 0; g < 4; g++) rect(tx - 14 + g * 5, ty + 14 - g * 3, 28 - g * 10, 1, 9); }
  }
 }
}
static void draw_tiles(int t) {
 rect(0, 0, 320, 6, 10); rect(0, 5, 320, 1, 11);
 for (int row = 0; row < 3; row++) for (int c = 0; c < 10; c++) {
  char k = tile[room][row][c]; int x = c * 32, y = FL[row];
  if (k == 'W') { rect(x, y - 56, 32, 62, 10); rect(x, y - 56, 32, 1, 11); rect(x + 31, y - 56, 1, 62, 9); for (int j = 0; j < 5; j++) rect(x, y - 44 + j * 12, 32, 1, 9); rect(x + (row & 1 ? 8 : 20), y - 56, 1, 62, 9); continue; }
  int ls = loose_t[room][row][c];
  if (k == ' ' || (k == 'L' && ls < 0)) continue;
  int dy = (k == 'L' && ls > 0) ? ((ls / 2) & 1) : 0;
  rect(x, y + dy, 32, 6, 10); rect(x, y + dy, 32, 1, 11); rect(x + 31, y + dy, 1, 6, 9); rect(x, y + 6 + dy, 32, 2, 27);
  if (k == 'L') { rect(x + 6, y + 2 + dy, 8, 1, 9); rect(x + 14, y + 3 + dy, 6, 1, 9); }
  if (k == '^') { for (int s = 0; s < 6; s++) { int sx = x + 3 + s * 5; for (int h = 0; h < 9; h++) rect(sx + (9 - h) / 4, y - h, 4 - (9 - h) / 3, 1, h > 6 ? 15 : 16); } }
  if (k == 'T') { rect(x + 8, y - (plate_down[room] ? 0 : 2), 16, plate_down[room] ? 1 : 2, 17); }
  if (k == 'G') { int up = gate_h[room]; for (int b = 0; b < 6; b++) rect(x + 3 + b * 5, y - 50 - 0, 2, 50 - up, 15); rect(x, y - 52, 32, 3, 18); }
  if (k == 'B') {   // two jaws that snap together
   int ph = (tick / 2) % 56, jaw = ph < 34 ? 0 : ph < 40 ? (ph - 34) * 8 : ph < 48 ? 48 : 48 - (ph - 48) * 6;
   rect(x + 12, y - 52, 8, 3, 18); rect(x + 12, y, 8, 1, 18);
   for (int j = 0; j < jaw; j += 2) { rect(x + 12 + (j & 2 ? 0 : 2), y - 52 + j / 2 + 3, 8 - (j & 2 ? 0 : 2), 2, 15); rect(x + 12 + (j & 2 ? 0 : 2), y - j / 2 - 2, 8 - (j & 2 ? 0 : 2), 2, 15); }
  }
  if (k == 'D') { rect(x + 4, y - 50, 24, 50, 18); rect(x + 6, y - 52, 20, 4, 18); rect(x + 7, y - 48, 18, 48, 28); rect(x + 9, y - 46, 14, 46, 12); rect(x + 4, y - 50, 2, 50, 11); rect(x + 26, y - 50, 2, 50, 11);
   int fl = (t / 4) & 3; rect(x + 14, y - 40, 4, 40, 28 + 0 * fl); }
  if (k == 'h') { rect(x + 12, y - 8, 8, 8, 26); rect(x + 14, y - 11, 4, 3, 19); rect(x + 13, y - 7, 2, 3, 29); }
 }
}
static void heart(int x, int y, int full) { rect(x, y, 3, 2, full ? 26 : 9); rect(x + 4, y, 3, 2, full ? 26 : 9); rect(x, y + 2, 7, 2, full ? 26 : 9); rect(x + 1, y + 4, 5, 1, full ? 26 : 9); rect(x + 2, y + 5, 3, 1, full ? 26 : 9); }
static void hud(void) {
 rect(0, 186, 320, 14, 18);
 for (int i = 0; i < hero.maxhp; i++) heart(8 + i * 10, 191, i < hero.hp);
 for (int i = 0; i < nfoe; i++) if (foe[i].alive && foe[i].state != ST_DEAD && foe[i].drawn) { int d = foe[i].x / FX - hero.x / FX; if (d < 0) d = -d; if (d < 120 && foe[i].row == hero.row) for (int k = 0; k < foe[i].maxhp; k++) rect(312 - k * 8, 192, 6, 4, k < foe[i].hp ? 29 : 9); }
 str(120, 190, "ROOM", 11); num(160, 190, room + 1, 1, 19); str(176, 190, "OF 4", 11);
 { int s = ticks_left / 35; num(240, 190, s / 60, 2, 17); str(256, 190, ":", 17); num(264, 190, s % 60, 2, 17); }
}

// ---------- behaviour ----------
static int hx_(man_t *m) { return m->x / FX; }
static int col_(man_t *m) { return hx_(m) / 32; }
static void hurt_man(man_t *m, int dmg, int from_dir) {
 m->hp -= dmg; shake = 4; tone(180, 6, 6);
 if (m->hp <= 0) { m->hp = 0; m->state = ST_DEAD; m->alive = m == &hero ? 0 : 0; replay(m, A_DIE, D_DIE, 3, 0); m->vx = 0; if (m != &hero) { tone(120, 14, 7); } return; }
 m->state = ST_HIT; replay(m, A_HIT, D_HIT, 2, 0); m->vx = -from_dir * 20; m->t = 0;
}
static void die_hero(const char *why) { (void)why; if (hero.state == ST_DEAD) return; hero.hp = 0; hero.state = ST_DEAD; hero.vx = 0; replay(&hero, A_DIE, D_DIE, 3, 0); tone(90, 20, 9); }

static void land(man_t *m, int row) {
 int rows = row - m->fall_from; m->row = row; m->y = FL[row]; m->vy = 0;
 if (rows >= 2) { if (m == &hero) { die_hero("fall"); } else { m->hp = 0; m->state = ST_DEAD; replay(m, A_DIE, D_DIE, 3, 0); } tone(70, 12, 8); return; }
 if (rows == 1) { tone(110, 8, 4); if (m == &hero) { hero.hp--; shake = 4; if (hero.hp <= 0) { die_hero("fall"); return; } } }
 m->state = ST_LAND; m->t = 0; m->vx = 0; replay(m, A_LAND, D_LAND, 3, 0);
}

static int keyx(void) { return (key(SC_RIGHT) ? 1 : 0) - (key(SC_LEFT) ? 1 : 0); }

static man_t *nearest_foe(int *dist) {
 man_t *best = 0; int bd = 9999;
 for (int i = 0; i < nfoe; i++) { man_t *f = &foe[i]; if (!f->alive || f->state == ST_DEAD || f->row != hero.row) continue; int d = hx_(f) - hx_(&hero); int ad = d < 0 ? -d : d; if (ad < bd) { bd = ad; best = f; } }
 *dist = bd; return best;
}

static void update_hero(void) {
 man_t *h = &hero; int dx = keyx(), shift = key(SC_LSHIFT) || key(SC_RSHIFT);
 int fd; man_t *f = nearest_foe(&fd);
 if (h->state == ST_DEAD) { return; }
 if (!h->drawn && f && fd < 110 && h->state != ST_DRAW && (h->state == ST_IDLE || h->state == ST_RUN || h->state == ST_WALK)) { h->state = ST_DRAW; h->t = 0; h->vx = 0; replay(h, A_DRAW, D_DRAW, 4, 0); h->face = hx_(f) > hx_(h) ? 1 : -1; tone(1200, 3, 3); }
 switch (h->state) {
 case ST_IDLE: case ST_RUN: case ST_WALK: case ST_CROUCH: {
  // fell off an edge?
  if (!floor_at(hx_(h))) { h->state = ST_FALL; h->fall_from = h->row; h->vy = 0; play(h, A_FALL, D_FALL, 1, 1); break; }
  // the world's traps
  { char k = at_(room, h->row, col_(h)); int fx = hx_(h) % 32;
   if (k == '^' ) { die_hero("spikes"); return; }
   if (k == 'B') { int ph = (tick / 2) % 56; if (ph >= 38 && ph < 50 && fx > 8 && fx < 24) { die_hero("blades"); return; } }
   if (k == 'T' && !plate_down[room]) { plate_down[room] = 1; gate_open[room] = 500; tone(220, 10, 3); }
   if (k == 'L' && loose_t[room][h->row][col_(h)] == 0) loose_t[room][h->row][col_(h)] = 1;
   if (k == 'h' && h->hp < h->maxhp) { tile[room][h->row][col_(h)] = '#'; h->hp = h->hp + 1 > 5 ? 5 : h->hp + 1; if (h->maxhp < h->hp) h->maxhp = h->hp; tone(1700, 6, 4); }
   if (k == 'D' && hit(SC_UP)) { won = 1; return; }
  }
  if (hit(SC_X) && !h->drawn) { h->state = ST_DRAW; h->t = 0; h->vx = 0; replay(h, A_DRAW, D_DRAW, 4, 0); tone(1200, 3, 3); break; }
  if (h->drawn) { h->state = ST_FIGHT; break; }
  if (dx) { h->face = dx; }
  if (key(SC_DOWN)) {
   // let yourself down over an edge, or crouch
   int nc = col_(h) + h->face;
   if (!solid_floor(room, h->row, nc) && h->row < 2 && solid_floor(room, h->row + 1, nc) && hit(SC_DOWN) == 0 && (hx_(h) % 32 > 8 && hx_(h) % 32 < 24 ? 0 : 1)) { }
   if (h->row < 2 && !solid_floor(room, h->row, nc) && solid_floor(room, h->row + 1, nc)) { h->state = ST_DROP; h->t = 0; h->x = (nc * 32 + (h->face > 0 ? 3 : 29)) * FX; replay(h, A_DROP, D_DROP, 3, 0); tone(300, 4, 2); break; }
   h->state = ST_CROUCH; h->vx = 0; play(h, A_CROUCH, D_CROUCH, 1, 1); break;
  }
  if (h->state == ST_CROUCH) h->state = ST_IDLE;
  if (hit(SC_UP)) {
   int c = col_(h), nc = c + h->face;
   // jump up to a ledge: an opening above, a floor beside it
   if (h->row > 0 && dx == 0 && !solid_floor(room, h->row - 1, c) && solid_floor(room, h->row - 1, nc)) { h->state = ST_CLIMB; h->t = 0; h->vx = 0; replay(h, A_CLIMB, D_CLIMB, 4, 0); tone(500, 4, 2); break; }
   if (h->row > 0 && dx == 0 && !solid_floor(room, h->row - 1, c) && solid_floor(room, h->row - 1, c - h->face)) { h->face = -h->face; h->state = ST_CLIMB; h->t = 0; h->vx = 0; replay(h, A_CLIMB, D_CLIMB, 4, 0); tone(500, 4, 2); break; }
   if (dx && h->state == ST_RUN) { h->state = ST_LEAP; h->t = 0; h->vx = h->face * 70; replay(h, A_LEAP, D_LEAP, 2, 0); tone(700, 5, 2); break; }
   h->state = ST_JUMP; h->t = 0; h->vx = 0; replay(h, A_JUMP, D_JUMP, 4, 0); tone(560, 3, 2); break;
  }
  if (dx) {
   int sp = shift ? 18 : 44, nx = h->x + dx * sp, c = nx / FX / 32;
   int probe = nx / FX + dx * 6;
   if (blocks(room, h->row, probe / 32)) { h->vx = 0; if (h->state != ST_IDLE) { h->state = ST_IDLE; play(h, A_IDLE, D_IDLE, 1, 1); } break; }
   if (shift && !solid_floor(room, h->row, probe / 32) && probe >= 0 && probe < 320) { h->vx = 0; h->state = ST_IDLE; play(h, A_IDLE, D_IDLE, 1, 1); break; }   // careful steps stop at an edge
   (void)c; h->x = nx; h->state = shift ? ST_WALK : ST_RUN;
   if (shift) play(h, A_WALK, D_WALK, 4, 1); else play(h, A_RUN, D_RUN, 6, 1);
   if ((tick & 7) == 0) tone(shift ? 90 : 110, 1, 1);
  } else if (h->state != ST_IDLE || h->seq != A_IDLE) { h->state = ST_IDLE; play(h, A_IDLE, D_IDLE, 1, 1); }
  break; }
 case ST_JUMP: h->t++; if (anim_done(h) || h->t > 17) { h->state = ST_IDLE; play(h, A_IDLE, D_IDLE, 1, 1); } break;
 case ST_LEAP: {
  h->t++; h->x += h->vx;
  int probe = h->x / FX + (h->vx > 0 ? 6 : -6);
  if (blocks(room, h->row, probe / 32)) { h->x -= h->vx; h->vx = 0; }
  if (h->x < 0 || h->x >= 320 * FX) { h->vx = 0; if (h->x < 0) h->x = 0; else h->x = 319 * FX; }
  if (h->t >= 17) { if (floor_at(hx_(h))) { h->y = FL[h->row]; h->state = ST_LAND; h->t = 0; h->vx = 0; replay(h, A_LAND, D_LAND, 3, 0); tone(130, 3, 3); h->hurt = 0; }
   else { h->state = ST_FALL; h->fall_from = h->row; h->vy = 0; h->vx = h->vx / 3; play(h, A_FALL, D_FALL, 1, 1); } }
  break; }
 case ST_FALL: {
  h->vy += 10; if (h->vy > 120) h->vy = 120; h->x += h->vx;
  int ny = h->y * FX + h->vy, ty = ny / FX, row = h->row;
  for (int r = row + 1; r < 3; r++) if (h->y < FL[r] + 0 && ty >= FL[r] && solid_floor(room, r, hx_(h) / 32)) { h->y = FL[r]; land(h, r); goto fell; }
  h->y = ty;
  if (h->y > FL[2] + 40) { die_hero("pit"); }
  fell: break; }
 case ST_LAND: h->t++; if (anim_done(h)) { h->state = ST_IDLE; play(h, A_IDLE, D_IDLE, 1, 1); } break;
 case ST_CLIMB: h->t++;
  if (h->t == 14) { h->row--; h->y = FL[h->row]; h->x = ((col_(h) + h->face) * 32 + (h->face > 0 ? 6 : 26)) * FX; }
  if (anim_done(h)) { h->state = ST_IDLE; play(h, A_IDLE, D_IDLE, 1, 1); }
  break;
 case ST_DROP: h->t++;
  if (h->t == 13) { h->row++; h->y = FL[h->row]; h->state = ST_LAND; h->t = 0; replay(h, A_LAND, D_LAND, 3, 0); }
  break;
 case ST_DRAW: h->t++; if (anim_done(h)) { h->state = ST_FIGHT; h->drawn = 1; replay(h, A_FIGHT, D_FIGHT, 2, 1); } break;
 case ST_SHEATHE: h->t++; if (anim_done(h)) { h->state = ST_IDLE; h->drawn = 0; play(h, A_IDLE, D_IDLE, 1, 1); } break;
 case ST_FIGHT: {
  int ft; man_t *tf = nearest_foe(&ft);
  if (tf) h->face = hx_(tf) > hx_(h) ? 1 : -1;
  if (dx) { int nx = h->x + dx * 20, probe = nx / FX + dx * 8; if (solid_floor(room, h->row, probe / 32) && !blocks(room, h->row, probe / 32) && !(tf && dx == h->face && ft < 20)) h->x = nx; }
  if (!floor_at(hx_(h))) { h->state = ST_FALL; h->fall_from = h->row; h->vy = 0; h->drawn = 1; play(h, A_FALL, D_FALL, 1, 1); break; }
  if (hit(SC_X)) { h->state = ST_LUNGE; h->t = 0; replay(h, A_LUNGE, D_LUNGE, 4, 0); tone(900, 3, 4); break; }
  if (hit(SC_Z)) { h->state = ST_PARRY; h->t = 0; replay(h, A_PARRY, D_PARRY, 1, 0); break; }
  if (key(SC_DOWN) && (!tf || ft > 130)) { h->state = ST_SHEATHE; h->t = 0; replay(h, A_SHEATHE, D_SHEATHE, 3, 0); break; }
  play(h, A_FIGHT, D_FIGHT, 2, 1);
  break; }
 case ST_LUNGE: {
  h->t++; if (h->t >= 10 && h->t <= 11) { h->x += h->face * 28; }
  if (h->t == 6) { int ft; man_t *tf = nearest_foe(&ft); if (tf && ft < 44 && (hx_(tf) - hx_(h)) * h->face > 0) { if (tf->state == ST_PARRY) { clang(); h->x -= h->face * 40; } else { hurt_man(tf, 1, h->face); } } }
  if (anim_done(h)) { h->state = ST_FIGHT; replay(h, A_FIGHT, D_FIGHT, 2, 1); }
  break; }
 case ST_PARRY: h->t++; if (anim_done(h) || h->t > 16) { h->state = ST_FIGHT; replay(h, A_FIGHT, D_FIGHT, 2, 1); } break;
 case ST_HIT: h->t++; h->x += h->vx / 3; h->vx = h->vx * 3 / 4; if (anim_done(h)) { h->state = ST_FIGHT; replay(h, A_FIGHT, D_FIGHT, 2, 1); } break;
 }
 if (h->x < 0) { if (room > 0 && solid_floor(room - 1, h->row, 9)) { room--; h->x = 319 * FX; enter_room(room, 0, h->row); } else h->x = 0; }
 if (h->x >= 320 * FX) { if (room < ROOMS - 1) { room++; h->x = 1 * FX; enter_room(room, 0, h->row); } else h->x = 319 * FX; }
 // two people cannot share a spot
 for (int i = 0; i < nfoe; i++) if (foe[i].alive && foe[i].state != ST_DEAD && foe[i].row == h->row && h->state != ST_FALL && h->state != ST_LEAP) { int d = hx_(&foe[i]) - hx_(h); if (d * h->face > 0 && (d < 0 ? -d : d) < 16) h->x = (hx_(&foe[i]) - h->face * 16) * FX; }
 // the loose floor and the gate
 for (int row = 0; row < 3; row++) for (int c = 0; c < 10; c++) { int *t = &loose_t[room][row][c]; if (*t > 0) { (*t)++; if (*t == 2) tone(160, 2, 2); if (*t > 22) { *t = -1; tone(100, 8, 6); } } }
 if (gate_open[room] > 0) { gate_open[room]--; if (gate_h[room] < 40) gate_h[room]++; } else if (gate_h[room] > 0) { gate_h[room] -= 2; if (gate_h[room] < 0) gate_h[room] = 0; }
}

static void update_foe(man_t *g) {
 if (!g->alive) return;
 if (g->state == ST_DEAD) { return; }
 int d = hx_(&hero) - hx_(g), ad = d < 0 ? -d : d;
 g->t++; if (g->cool > 0) g->cool--;
 int tough = g->kind == 2;
 switch (g->state) {
 case ST_FIGHT: {
  g->face = d > 0 ? 1 : -1;
  if (hero.row != g->row || hero.state == ST_DEAD) { play(g, A_FIGHT, D_FIGHT, 2, 1); break; }
  if (ad > 38) { int nx = g->x + g->face * (tough ? 17 : 13); if (solid_floor(room, g->row, nx / FX / 32) && !blocks(room, g->row, nx / FX / 32 + 0)) g->x = nx; }
  else if (ad < 22) g->x -= g->face * 12;
  else if (g->cool == 0) {
   int r = rnd(100);
   if (r < (tough ? 55 : 45)) { g->state = ST_LUNGE; g->t = 0; replay(g, A_LUNGE, D_LUNGE, 4, 0); g->cool = tough ? 22 : 34; tone(800, 3, 4); }
   else if (r < 85) { g->state = ST_PARRY; g->t = 0; replay(g, A_PARRY, D_PARRY, 1, 0); g->cool = 16; }
   else g->cool = 12;
  }
  if (g->state == ST_FIGHT) play(g, A_FIGHT, D_FIGHT, 2, 1);
  break; }
 case ST_LUNGE:
  if (g->t >= 10 && g->t <= 11) g->x += g->face * 24;
  if (g->t == 6 && ad < 46 && hero.row == g->row) {
   if (hero.state == ST_PARRY && hero.t > 1) { clang(); g->x -= g->face * 36; }
   else if (hero.state != ST_DEAD) { hurt_man(&hero, 1, g->face); }
  }
  if (anim_done(g)) { g->state = ST_FIGHT; replay(g, A_FIGHT, D_FIGHT, 2, 1); }
  break;
 case ST_PARRY: if (anim_done(g) || g->t > 18) { g->state = ST_FIGHT; replay(g, A_FIGHT, D_FIGHT, 2, 1); } break;
 case ST_HIT: g->x += g->vx / 3; g->vx = g->vx * 3 / 4; if (anim_done(g)) { g->state = ST_FIGHT; replay(g, A_FIGHT, D_FIGHT, 2, 1); g->cool = 10; } break;
 }
 if (g->x < 8 * FX) g->x = 8 * FX; if (g->x > 312 * FX) g->x = 312 * FX;
}

static void draw_man(man_t *m, const look_t *lk) {
 int x = m->x / FX, y = m->y;
 draw_fig(x, y, &m->cur, m->face, lk);
}
static void draw_all(void) {
 int sx = shake > 0 ? (shake & 1 ? 2 : -2) : 0; (void)sx;
 draw_back(tick); draw_tiles(tick);
 for (int i = 0; i < nfoe; i++) if (foe[i].alive || foe[i].state == ST_DEAD) draw_man(&foe[i], foe[i].kind == 2 ? &CAPLOOK : &GUARDLOOK);
 draw_man(&hero, &HEROLOOK);
 hud();
}

static void reset_game(void) {
 load_room_state(); over = won = paused = 0; tick = 0; shake = 0; ticks_left = 35 * 60 * 12;
 spawn_hero(0, 24, 1, 1);
}
static void title(void) {
 for (;;) {
  tick++; draw_back(tick);
  rect(0, 40, 320, 56, 18); rect(0, 40, 320, 1, 17); rect(0, 95, 320, 1, 17);
  bigstr(40, 48, "DUSKBLADE", 4, 17);
  str(80, 84, "A TALE OF THE LOWER PALACE", 11);
  str(52, 112, "ARROWS RUN    SHIFT CAREFUL STEPS", 19);
  str(52, 124, "UP JUMP OR CLIMB   DOWN CROUCH", 19);
  str(52, 136, "X SWORD AND LUNGE   Z PARRY", 19);
  str(52, 148, "REACH THE GOLDEN DOOR IN 4 ROOMS", 12);
  if ((tick / 12) & 1) str(100, 170, "PRESS ENTER", 17);
  flip(); pace();
  if (hit(SC_ENTER) || hit(SC_SPACE) || hit(SC_X)) return;
  if (hit(SC_ESC)) { quit(); }
 }
}
static void banner(const char *a, const char *b, int col) {
 rect(40, 70, 240, 56, 18); rect(40, 70, 240, 1, col); rect(40, 125, 240, 1, col);
 bigstr(160 - slen(a) * 8, 78, a, 2, col); str(160 - slen(b) * 4, 108, b, 19);
}
void aw_main(void) {
 HEROLOOK = (look_t){20, 21, 22, 18, 15, 18}; GUARDLOOK = (look_t){20, 23, 24, 18, 15, 18}; CAPLOOK = (look_t){20, 25, 17, 18, 15, 18};
 hook_keys(); mode13(); palette(); seed ^= now();
 title(); reset_game();
 int dead_wait = 0, win_wait = 0;
 for (;;) {
  tick++;
  if (hit(SC_ESC)) break;
  if (hit(SC_P)) paused = !paused;
  if (!paused && !won) {
   if (sfx > 0 && --sfx == 0) { hush(); sfx_pri = 0; }
   if (hero.state != ST_DEAD) ticks_left--;
   update_hero(); for (int i = 0; i < nfoe; i++) update_foe(&foe[i]);
   animate(&hero); for (int i = 0; i < nfoe; i++) animate(&foe[i]);
   if (shake > 0) shake--;
   if (ticks_left <= 0 && hero.state != ST_DEAD) die_hero("time");
   if (hero.state == ST_DEAD) dead_wait++; else dead_wait = 0;
  }
  draw_all();
  if (paused) banner("PAUSED", "P TO GO ON", 17);
  if (hero.state == ST_DEAD && dead_wait > 40) { banner("YOU FELL", "ENTER TO TRY THE ROOM AGAIN", 29); if (hit(SC_ENTER) || hit(SC_X)) { reset_game(); dead_wait = 0; } }
  if (won) { win_wait++; banner("ESCAPED", "THE GOLDEN DOOR OPENS", 17); if (win_wait == 1) signal("duskblade-escape"); if (win_wait > 120 && (hit(SC_ENTER) || hit(SC_X))) break; }
  flip(); pace();
 }
 hush(); text();
}
