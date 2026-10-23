# Grace's computer, for real (AW-STUDY-0024)

The basement's PC runs real DOS in the browser: the [v86](https://github.com/copy/v86) x86 emulator booting FreeDOS
from a small hard disk image, with Grace's files and our own DOS programs. `build.sh` makes every disk image from
the sources here and writes them, gzipped, to `prototypes/ranch-atelier/dist/studies/basement/disks/`.

Needs `nasm`, `python3` and `gzip`. Run `bash tools/grace-dos/build.sh`.

## What is ours

- `src/keystorm.asm`: KEYSTORM, a typing game in the spirit of 80s typing tutors (letters fall on a sleeping town;
  type them before they reach the roofs). Night five tells the basement with `AW:keystorm-night-5`.
- `src/coin.asm`: the golden memory on the coin disk (a spinning VGA coin). The coins are Daddy's core memories.
- `src/signal.asm`: writes `AW:<id>` to COM1, which the page hears (`grace-pc.mjs`).
- `src/mbr.asm`: a minimal master boot record. `mkdisk.py`: the FAT12 disk image builder.
- `files/`: Grace's CONFIG.SYS, AUTOEXEC.BAT, README, HELP and the disk contents.

No copyrighted DOS or game is in this repo or on any disk. MS-DOS and Typing Tutor III are never shipped; Typing
Tutor III was studied privately for feel only and deleted.

## Third-party pieces and licences

| Piece | Licence | Binary here | Source |
|---|---|---|---|
| FreeDOS kernel 2043 (`freedos/KERNEL.SYS`) | GPL-2.0-or-later | yes | `third-party-source/freedos-kernel-001a5b6f.tar.gz` (gitlab.com/FreeDOS/base/kernel) |
| FreeCOM 0.86 (`freedos/COMMAND.COM`) | GPL-2.0-or-later | yes | `third-party-source/freedos-freecom-6cc73980.tar.gz` (gitlab.com/FreeDOS/base/freecom) |
| FreeDOS FAT12 boot sector (`src/fdboot.asm`) | GPL-2.0-or-later | assembled | from the kernel source above |
| SeaBIOS 1.16.2 and its VGA BIOS (`dist/vendor/v86/seabios.bin`, `vgabios.bin`) | LGPL-3.0 | yes | `third-party-source/seabios-rel-1.16.2.tar.gz` (gitlab.com/qemu-project/seabios) |
| v86 0.5.472 (`dist/vendor/v86/libv86.mjs`, `v86.wasm`) | BSD-2-Clause | yes | github.com/copy/v86, `dist/vendor/v86/LICENSE-v86.txt` |

The GPL and LGPL pieces ship unmodified, beside their complete corresponding source in this public repository,
with their licence texts (`freedos/COPYING`, `dist/vendor/v86/COPYING.LESSER-seabios.txt`). Our own programs only
run on top of FreeDOS; they are separate works.
