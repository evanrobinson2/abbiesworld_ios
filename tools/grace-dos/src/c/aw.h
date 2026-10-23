// aw.h: a tiny freestanding runtime for Grace's DOS games (AW-STUDY-0024). Our own code, GCC in 16-bit mode, one
// 64 KB .COM per game, running on FreeDOS in the v86 emulator. No libc, no copyrighted material.
//
//   mode13() / text()        VGA 320x200x256 and back          pal(i, r, g, b)   one palette entry, 0..63
//   px(x, y, c) rect(...)    draw into an off-screen buffer    flip()            wait for the retrace, show it
//   str(x, y, "TEXT", c)     the BIOS 8x8 font                 key(SC_LEFT)      held right now?   hit(SC_X)  tapped since last asked?
//   beep(hz) / hush()        the PC speaker                    rnd(n)            small random numbers
//   signal("id")             tells the basement page "AW:id"   quit()            back to DOS, keyboard restored
#define SC_ESC 1
#define SC_ENTER 28
#define SC_SPACE 57
#define SC_UP 0x48
#define SC_DOWN 0x50
#define SC_LEFT 0x4B
#define SC_RIGHT 0x4D
#define SC_Z 44
#define SC_X 45
#define SC_C 46
#define SC_P 25
#define SC_R 19
#define SC_Q 16
#define SC_A 30
#define SC_S 31
#define SC_D 32
#define SC_W 17
#define SC_LSHIFT 42
#define SC_RSHIFT 54

typedef int i32_; typedef unsigned char u8; typedef unsigned short u16; typedef unsigned int u32; typedef signed char i8; typedef short i16;

// The program starts here: one 64 KB segment, stack at the top. Keyboard interrupt hook keeps a table of held keys and
// still passes every key on to the BIOS, so DOS text input keeps working underneath.
__asm__(".code16gcc\n.section .text.start\n.globl _start\n_start:\n cli\n mov %cs,%ax\n mov %ax,%ds\n mov %ax,%es\n mov %ax,%ss\n mov $0xfff0,%esp\n sti\n call aw_main\n call aw_exit\n"
 ".code16\naw_isr9:\n push %ax\n push %bx\n in $0x60,%al\n mov %al,%cs:aw_last\n mov %al,%bl\n and $0x7f,%bl\n xor %bh,%bh\n test $0x80,%al\n jnz 1f\n movb $3,%cs:aw_keys(%bx)\n jmp 2f\n1: andb $2,%cs:aw_keys(%bx)\n2: pop %bx\n pop %ax\n ljmp *%cs:aw_old9\n"
 ".code16gcc\n.section .data\naw_old9: .long 0\n.globl aw_keys\naw_keys: .skip 128\n.globl aw_last\naw_last: .byte 0\n.text\n");
extern volatile u8 aw_keys[128], aw_last;   // aw_last: the newest raw scancode, for debugging
extern u32 aw_old9;
void aw_main(void);

static u16 bb_seg, ticks_seg = 0x40;
static u8 font[1024];
static int hooked, in_gfx;

static void hush(void);
static void quit(void) {
 hush();
 if (in_gfx) { __asm__ volatile("int $0x10" :: "a"(3)); in_gfx = 0; }
 if (hooked) { u16 off = aw_old9 & 0xFFFF, seg = aw_old9 >> 16;
  __asm__ volatile("push %%ds; mov %0,%%ds; int $0x21; pop %%ds" :: "m"(seg), "a"(0x2509), "d"(off) : "memory"); hooked = 0; }
 __asm__ volatile("int $0x21" :: "a"(0x4C00));
 for (;;) {}
}

void aw_exit(void) { quit(); }

static void hook_keys(void) {
 u16 seg, off; u32 isr;
 __asm__ volatile("push %%es; int $0x21; mov %%es,%0; pop %%es" : "=r"(seg), "=b"(off) : "a"(0x3509));
 aw_old9 = ((u32)seg << 16) | off;
 __asm__ volatile("mov $aw_isr9,%0" : "=r"(isr));
 __asm__ volatile("int $0x21" :: "a"(0x2509), "d"((u16)isr));
 hooked = 1;
}

// key(): held right now.  hit(): pressed since the last hit() (a quick tap is never missed between two frames).
static int key(int sc) { return aw_keys[sc & 127] & 1; }
static int hit(int sc) { u8 v = aw_keys[sc & 127] & 2; aw_keys[sc & 127] &= ~2; return v; }
static void keys_clear(void) { for (int i = 0; i < 128; i++) aw_keys[i] = 0; }

static void outb(u16 port, u8 v) { __asm__ volatile("outb %0,%1" :: "a"(v), "d"(port)); }
static u8 inb(u16 port) { u8 v; __asm__ volatile("inb %1,%0" : "=a"(v) : "d"(port)); return v; }

static void pal(int i, int r, int g, int b) { outb(0x3C8, i); outb(0x3C9, r); outb(0x3C9, g); outb(0x3C9, b); }

static void gs_set(void) { __asm__ volatile("mov %0,%%gs" :: "r"(bb_seg)); }

static void mode13(void) {
 u16 paras;
 __asm__ volatile("int $0x21" :: "a"(0x4A00), "b"(0x1000));            // keep 64 KB, hand the rest back
 __asm__ volatile("int $0x21" : "=a"(bb_seg), "=b"(paras) : "a"(0x4800), "b"(4000));  // 64000 bytes for the picture
 __asm__ volatile("int $0x10" :: "a"(0x13)); in_gfx = 1;
 // the BIOS 8x8 font: ES:BP points at the table; copy the first 128 glyphs
 u16 fs_, bp;
 __asm__ volatile("push %%es; push %%bp; int $0x10; mov %%es,%0; mov %%bp,%1; pop %%bp; pop %%es" : "=r"(fs_), "=r"(bp) : "a"(0x1130), "b"(0x0300) : "cx", "dx");
 for (int i = 0; i < 1024; i++) { u8 v; __asm__ volatile("push %%fs; mov %1,%%fs; movb %%fs:(%2),%0; pop %%fs" : "=q"(v) : "r"(fs_), "r"((u32)(bp + i))); font[i] = v; }
 gs_set();
}
static void text(void) { __asm__ volatile("int $0x10" :: "a"(3)); in_gfx = 0; }

static void px(int x, int y, int c) {
 if ((unsigned)x < 320 && (unsigned)y < 200) { u32 a = y * 320 + x; __asm__ volatile("movb %0,%%gs:(%1)" :: "q"((u8)c), "r"(a) : "memory"); }
}
static int getpx(int x, int y) { u8 v = 0; if ((unsigned)x < 320 && (unsigned)y < 200) { u32 a = y * 320 + x; __asm__ volatile("movb %%gs:(%1),%0" : "=q"(v) : "r"(a)); } return v; }
static void rect(int x, int y, int w, int h, int c) { for (int j = 0; j < h; j++) for (int i = 0; i < w; i++) px(x + i, y + j, c); }
static void clear(int c) { u32 v = c * 0x01010101; for (u32 a = 0; a < 64000; a += 4) __asm__ volatile("movl %0,%%gs:(%1)" :: "r"(v), "r"(a) : "memory"); }
static void ch(int x, int y, int c, int col) { const u8 *g = font + (c & 127) * 8; for (int j = 0; j < 8; j++) for (int i = 0; i < 8; i++) if (g[j] & (0x80 >> i)) px(x + i, y + j, col); }
static void str(int x, int y, const char *s, int col) { for (; *s; s++, x += 8) ch(x, y, *s, col); }
static void num(int x, int y, int n, int digits, int col) { for (int i = digits - 1; i >= 0; i--) { ch(x + i * 8, y, '0' + n % 10, col); n /= 10; } }

// Time: the BIOS tick count (18.2 Hz) plus the timer chip's own counter give 1/1193182 s steps. v86 has no steady
// retrace to wait on, and a real one is not needed: the game paces itself and then copies the picture in one go.
static u32 now(void) {
 u32 t1, t2; u16 c;
 do { __asm__ volatile("push %%fs; mov $0x40,%%ax; mov %%ax,%%fs; movl %%fs:0x6C,%0; pop %%fs" : "=r"(t1) :: "eax");
  outb(0x43, 0); c = inb(0x40); c |= (u16)inb(0x40) << 8;
  __asm__ volatile("push %%fs; mov $0x40,%%ax; mov %%ax,%%fs; movl %%fs:0x6C,%0; pop %%fs" : "=r"(t2) :: "eax");
 } while (t1 != t2);
 return t1 * 65536u + (u16)(0 - c);
}
static u32 next_frame; static int fps = 35, paced;
static void pace(void) {
 u32 step = 1193182u / fps, t = now();
 if (!paced || (i32_)(t - next_frame) > (i32_)(step * 4)) { paced = 1; next_frame = t; }   // first frame, or far behind (a slow machine): start again
 while ((i32_)(now() - next_frame) < 0) {}
 next_frame += step;
}
static void flip(void) {
 pace();
 __asm__ volatile("push %%ds; push %%es; push %%gs; pop %%ds; mov $0xA000,%%ax; mov %%ax,%%es; xor %%esi,%%esi; xor %%edi,%%edi; mov $16000,%%ecx; cld; rep movsl; pop %%es; pop %%ds"
  ::: "eax", "ecx", "esi", "edi", "memory");
}

static u32 seed = 12345;
static int rnd(int n) { seed = seed * 1103515245u + 12345u; return (int)((seed >> 16) % (u32)n); }

static void beep(int hz) { u32 d = 1193180 / hz; outb(0x43, 0xB6); outb(0x42, d & 255); outb(0x42, d >> 8); outb(0x61, inb(0x61) | 3); }
static void hush(void) { outb(0x61, inb(0x61) & ~3); }

// "AW:id" out of COM1 and a newline; the basement page listens (grace-pc.mjs).
static void signal(const char *id) {
 const char *p = "AW:"; for (; *p; p++) outb(0x3F8, *p);
 for (; *id; id++) outb(0x3F8, *id);
 outb(0x3F8, 10);
}
