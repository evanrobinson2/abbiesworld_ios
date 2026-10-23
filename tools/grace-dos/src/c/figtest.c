#include "aw.h"
#include "fig.h"
#include "duskpose.h"
void aw_main(void) {
 mode13(); hook_keys();
 pal(1, 63, 63, 63); pal(2, 46, 36, 24); pal(3, 56, 16, 14); pal(4, 20, 14, 8); pal(5, 52, 52, 60); pal(6, 40, 40, 44); pal(7, 8, 6, 14);
 look_t lk = {2, 1, 3, 4, 5, 7};
 for (;;) {
  clear(7); rect(0, 0, 320, 200, 6);
  for (int i = 0; i < P_N; i++) { int x = 20 + (i % 8) * 38, y = 56 + (i / 8) * 46; draw_fig(x, y, &POSES[i], 1, &lk); num(x - 8, y + 6, i, 2, 7); }
  if (hit(SC_ESC)) break;
  flip();
 }
 quit();
}
