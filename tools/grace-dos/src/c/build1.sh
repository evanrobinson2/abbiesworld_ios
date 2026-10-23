#!/bin/sh
# build1.sh game.c OUT.COM: compile one game with GCC in 16-bit mode (see aw.h).
set -e
d=$(dirname "$0")
gcc -m16 -ffreestanding -Os -fno-pic -fno-stack-protector -fno-asynchronous-unwind-tables -fno-builtin -mno-sse -mno-mmx -fno-ident -Wa,--no-warn -Wall -Wno-misleading-indentation -Wno-unused-function -Wno-unused-variable -I"$d" -c "$1" -o "$2.o"
ld -m elf_i386 -T "$d/com.ld" -o "$2" "$2.o"
rm -f "$2.o"
