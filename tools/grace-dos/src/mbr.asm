; Grace's hard disk master boot record: find the active partition, load its boot sector, go.
        org 0x600
        cli
        xor ax, ax
        mov ds, ax
        mov es, ax
        mov ss, ax
        mov sp, 0x7c00
        sti
        mov si, 0x7c00
        mov di, 0x600
        mov cx, 256
        rep movsw
        jmp 0:start
start:
        mov si, 0x7be
        mov cx, 4
find:   cmp byte [si], 0x80
        je found
        add si, 16
        loop find
        mov si, nopart
        jmp fail
found:  mov dh, [si+1]
        mov cx, [si+2]
        mov bx, 0x7c00
        mov di, 5
again:  mov ax, 0x0201
        push si
        int 0x13
        pop si
        jnc loaded
        xor ax, ax
        int 0x13
        dec di
        jnz again
        mov si, readerr
        jmp fail
loaded: cmp word [0x7dfe], 0xaa55
        jne bad
        jmp 0:0x7c00
bad:    mov si, nosys
fail:   lodsb
        or al, al
        jz $
        mov ah, 0x0e
        int 0x10
        jmp fail
nopart  db 'No active partition', 0
readerr db 'Disk read error', 0
nosys   db 'Missing operating system', 0
