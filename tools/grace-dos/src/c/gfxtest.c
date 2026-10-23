#include "aw.h"
void aw_main(void) {
 mode13(); hook_keys();
 pal(1, 63, 20, 20); pal(2, 20, 63, 20); pal(3, 63, 63, 63);
 int x = 160, y = 100, f = 0;
 for (;;) {
  clear(0); str(8, 8, "AW GFX TEST", 3);
  rect(x - 5, y - 5, 10, 10, 1);
  { int n = 0; for (int k = 0; k < 128; k++) if (key(k)) { num(8 + (n % 8) * 32, 30 + (n / 8) * 10, k, 3, 2); n++; } if (hit(SC_X)) str(200, 8, "X HIT", 3); }
  num(8, 190, f++, 5, 3); num(100, 190, aw_last, 3, 3);
  if (key(SC_LEFT)) x -= 2; if (key(SC_RIGHT)) x += 2; if (key(SC_UP)) y--; if (key(SC_DOWN)) y++;
  if (key(SC_ESC)) break;
  flip();
 }
 quit();
}
