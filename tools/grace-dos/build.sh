#!/bin/sh
# Builds Grace's computer (AW-STUDY-0024): the DOS programs, her hard disk and the floppies in her disk box.
# Needs nasm, gcc and python3. Output: prototypes/ranch-atelier/dist/studies/basement/disks/*.img.gz
set -e
cd "$(dirname "$0")"
OUT=../../prototypes/ranch-atelier/dist/studies/basement/disks
B=build
rm -rf $B && mkdir -p $B/c $B/grace $B/keystorm $B/recipes $B/coin $B/blocks $B/duskblade $OUT
nasm -f bin src/mbr.asm -o $B/mbr.bin
nasm -DISFAT12 -f bin src/fdboot.asm -o $B/boot12.bin
nasm -f bin src/keystorm.asm -o $B/KEYSTORM.COM
nasm -f bin src/coin.asm -o $B/COIN.COM
nasm -f bin src/signal.asm -o $B/SIGNAL.COM
# The games are our own C, built with GCC in 16-bit mode against src/c/aw.h (see build1.sh).
sh src/c/build1.sh src/c/brickfall.c $B/BLOCKS.COM
sh src/c/build1.sh src/c/duskblade.c $B/DUSKBLD.COM
# DOS text files end their lines with CR LF.
for f in files/*/*; do python3 -c "import sys;d=open(sys.argv[1],'rb').read().replace(b'\r\n',b'\n').replace(b'\n',b'\r\n');open(sys.argv[2],'wb').write(d)" "$f" "$B/${f#files/}"; done
python3 mkdisk.py hdd $B/grace-hd.img GRACE --mbr $B/mbr.bin --boot $B/boot12.bin \
  freedos/KERNEL.SYS freedos/COMMAND.COM $B/c/CONFIG.SYS $B/c/AUTOEXEC.BAT \
  $B/grace/README.TXT=GRACE/README.TXT $B/KEYSTORM.COM=GRACE/KEYSTORM.COM $B/grace/HELP.BAT=GRACE/HELP.BAT \
  $B/grace/GRACE.BAT=GRACE/GRACE.BAT $B/SIGNAL.COM=GRACE/SIGNAL.COM $B/grace/GAMES.BAT=GRACE/GAMES.BAT \
  $B/BLOCKS.COM=GRACE/BLOCKS.COM $B/DUSKBLD.COM=GRACE/DUSKBLD.COM
python3 mkdisk.py floppy $B/keystorm.img KEYSTORM $B/KEYSTORM.COM $B/keystorm/GO.BAT
python3 mkdisk.py floppy $B/recipes.img RECIPES $B/recipes/TOAST.TXT $B/recipes/GO.BAT
python3 mkdisk.py floppy $B/blank.img ""
python3 mkdisk.py floppy $B/coin.img GOLD $B/COIN.COM $B/coin/GO.BAT
python3 mkdisk.py floppy $B/blocks.img BLOCKS $B/BLOCKS.COM $B/blocks/GO.BAT
python3 mkdisk.py floppy $B/duskblade.img DUSKBLADE $B/DUSKBLD.COM $B/duskblade/GO.BAT
for f in grace-hd keystorm recipes blank coin blocks duskblade; do gzip -9n < $B/$f.img > $OUT/$f.img.gz; done
ls -l $OUT
