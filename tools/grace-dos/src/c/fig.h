// fig.h: a moving figure drawn from joint angles, for DUSKBLADE (AW-STUDY-0024). The motion is keyframed like traced
// film (a run is a handful of key poses, eased between), then the skeleton is drawn with thick limbs. Our own code.
//   pose = angles in degrees: torso lean, extra lift off the floor (the feet are grounded for you), then thigh/knee and shoulder/elbow for the near (A) and far (B) side,
//   and the sword's angle (-1000 = no sword). Angles run from straight down, forward positive; a knee folds backwards, an
//   elbow forwards.
typedef struct { i16 lean, hip, ta, ka, tb, kb, sa, ea, sb, eb, sw; } pose_t;

// sine of a degree, scaled by 64
static const u8 SINQ[91] = {0,1,2,3,4,6,7,8,9,10,11,12,13,14,15,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,46,47,48,49,50,
 51,51,52,53,54,54,55,56,57,57,58,58,59,60,60,61,61,62,62,62,63,63,63,64,64,64,64,64,64,64,64,64,64,64,64};
static int sind(int a) { a %= 360; if (a < 0) a += 360; int s = 1; if (a >= 180) { a -= 180; s = -1; } if (a > 90) a = 180 - a; return s * (int)SINQ[a]; }
static int cosd(int a) { return sind(a + 90); }

typedef struct { int x[12], y[12], hy; } skel_t;       // 0 head 1 chest 2 elbowA 3 handA 4 elbowB 5 handB 6 kneeA 7 footA 8 kneeB 9 footB 10 sword tip 11 sword hilt
#define TH 9
#define SH 9
#define TOR 11
#define UA 7
#define FA 7
static void fk(const pose_t *p, int face, skel_t *s) {
 // hip at the origin; x grows forward, y grows down
 // the hip sits as high as the longer leg is, so the lowest foot is on the floor; hip is extra lift (jumps)
 int ea_ = TH * cosd(p->ta) / 64 + SH * cosd(p->ta - p->ka) / 64, eb_ = TH * cosd(p->tb) / 64 + SH * cosd(p->tb - p->kb) / 64;
 int hx = 0, hy = -(ea_ > eb_ ? ea_ : eb_) - p->hip;
 // legs from the hip
 int a = p->ta, b = p->ta - p->ka;
 s->x[6] = hx + TH * sind(a) / 64; s->y[6] = hy + TH * cosd(a) / 64; s->x[7] = s->x[6] + SH * sind(b) / 64; s->y[7] = s->y[6] + SH * cosd(b) / 64;
 a = p->tb; b = p->tb - p->kb;
 s->x[8] = hx + TH * sind(a) / 64; s->y[8] = hy + TH * cosd(a) / 64; s->x[9] = s->x[8] + SH * sind(b) / 64; s->y[9] = s->y[8] + SH * cosd(b) / 64;
 // torso up from the hip, leaning forward
 int cx = hx + TOR * sind(p->lean) / 64, cy = hy - TOR * cosd(p->lean) / 64;
 s->hy = hy; s->x[1] = cx; s->y[1] = cy; s->x[0] = cx + 5 * sind(p->lean + 8) / 64; s->y[0] = cy - 5 * cosd(p->lean + 8) / 64 - 3;
 a = p->sa; b = p->sa + p->ea;
 s->x[2] = cx + UA * sind(a) / 64; s->y[2] = cy + UA * cosd(a) / 64; s->x[3] = s->x[2] + FA * sind(b) / 64; s->y[3] = s->y[2] + FA * cosd(b) / 64;
 a = p->sb; b = p->sb + p->eb;
 s->x[4] = cx + UA * sind(a) / 64; s->y[4] = cy + UA * cosd(a) / 64; s->x[5] = s->x[4] + FA * sind(b) / 64; s->y[5] = s->y[4] + FA * cosd(b) / 64;
 s->x[11] = s->x[3]; s->y[11] = s->y[3];
 if (p->sw > -900) { s->x[10] = s->x[3] + 15 * cosd(p->sw) / 64; s->y[10] = s->y[3] - 15 * sind(p->sw) / 64; } else { s->x[10] = s->x[3]; s->y[10] = s->y[3]; }
 if (face < 0) for (int i = 0; i < 12; i++) s->x[i] = -s->x[i];
}
static void thick(int x0, int y0, int x1, int y1, int w, int c) {
 int dx = x1 - x0, dy = y1 - y0, n = (dx < 0 ? -dx : dx) > (dy < 0 ? -dy : dy) ? (dx < 0 ? -dx : dx) : (dy < 0 ? -dy : dy);
 if (n == 0) n = 1;
 for (int i = 0; i <= n; i++) { int x = x0 + dx * i / n, y = y0 + dy * i / n; rect(x - w / 2, y - w / 2, w, w, c); }
}
// draw with the feet on the floor at (x, y): an outline pass for everything, then the fills, far limbs first
typedef struct { u8 skin, tunic, trim, dark, steel, outline; } look_t;
static void draw_fig(int x, int y, const pose_t *p, int face, const look_t *lk) {
 skel_t s; fk(p, face, &s);
 int ox = x, oy = y, hx = ox, hy = oy + s.hy;
 int sx[12], sy[12]; for (int i = 0; i < 12; i++) { sx[i] = ox + s.x[i]; sy[i] = oy + s.y[i]; }
 // segments: x0 y0 x1 y1 width colour (index into the look)
 struct seg { int x0, y0, x1, y1, w, c; } g[16]; int n = 0;
 #define SEG(q0, q1, q2, q3, qw, qc) { g[n].x0 = q0; g[n].y0 = q1; g[n].x1 = q2; g[n].y1 = q3; g[n].w = qw; g[n].c = qc; n++; }
 SEG(hx, hy, sx[8], sy[8], 4, lk->dark) SEG(sx[8], sy[8], sx[9], sy[9], 4, lk->dark)
 SEG(sx[1], sy[1], sx[4], sy[4], 3, lk->dark) SEG(sx[4], sy[4], sx[5], sy[5], 3, lk->dark)
 SEG(hx, hy, sx[1], sy[1], 7, lk->tunic)
 SEG(hx, hy, sx[6], sy[6], 4, lk->tunic) SEG(sx[6], sy[6], sx[7], sy[7], 4, lk->skin)
 SEG(sx[1], sy[1], sx[2], sy[2], 4, lk->tunic) SEG(sx[2], sy[2], sx[3], sy[3], 3, lk->skin)
 for (int pass = 0; pass < 2; pass++) {
  for (int i = 0; i < n; i++) { int w = g[i].w + (pass ? 0 : 2); thick(g[i].x0, g[i].y0, g[i].x1, g[i].y1, w, pass ? g[i].c : lk->outline);
   if (i == 4) {   // after the torso: the head, then the rest
    int hxh = sx[0], hyh = sy[0];
    if (pass == 0) rect(hxh - 4, hyh - 4, 8, 8, lk->outline); else { rect(hxh - 3, hyh - 3, 6, 6, lk->skin); rect(hxh - 3, hyh - 4, 6, 2, lk->trim); rect(hxh + (face > 0 ? 1 : -2), hyh - 1, 2, 1, lk->outline); }
   } }
  if (p->sw > -900) { if (pass == 0) thick(sx[11], sy[11], sx[10], sy[10], 3, lk->outline); else { thick(sx[11], sy[11], sx[10], sy[10], 1, lk->steel); rect(sx[11] - 1, sy[11] - 1, 3, 3, lk->trim); } }
  if (pass == 1) rect(sx[7] - (face < 0 ? 3 : 0), sy[7] - 1, 4, 2, lk->dark);
 }
}
