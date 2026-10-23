/* A DOS .COM: one flat segment loaded at 0100h. .bss lives inside .data so it is in the file (DOS does not zero memory). */
OUTPUT_FORMAT(binary)
ENTRY(_start)
SECTIONS { . = 0x100; .text : { *(.text.start) *(.text*) } .rodata : { *(.rodata*) } .data : { *(.data*) *(.bss*) *(COMMON) } }
