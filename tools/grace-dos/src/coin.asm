; COIN: the program on Grace's gold disk (AW-STUDY-0024). A real DOS program (nasm -f bin, a .COM file).
; A spinning 8-bit Abbie's World coin in 320x200 VGA, a little sparkle ring, and "A GOLDEN MEMORY!" (the coins are Daddy's core memories).
; It tells the basement over the serial port ("AW:coin-disk"), and the coin drops into Grace's jar.
        org 100h
        cpu 186

start:  mov ax, 0013h
        int 10h
        ; palette: 1 outline brown, 2 gold, 3 shine, 4 letter A, 5 shadow gold, 6 sparkle
        mov dx, 03C8h
        mov al, 1
        out dx, al
        inc dx
        mov si, pal
        mov cx, 6*3
.p:     lodsb
        out dx, al
        loop .p
        mov si, found
        call signal
        mov ax, 0A000h
        mov es, ax
        mov word [frame], 0

again:  ; clear the coin's box
        mov di, 20*320 + 100
        mov dx, 120
.cl:    push di
        mov cx, 120
        xor al, al
        rep stosb
        pop di
        add di, 320
        dec dx
        jnz .cl
        ; width this frame: 14 columns * 8 px * |cos|, from a table
        mov bx, [frame]
        and bx, 15
        mov al, [widths+bx]
        xor ah, ah
        mov [w], ax
        mov al, [faces+bx]
        mov [back], al
        call drawcoin
        call sparkle
        ; the words, once the coin has turned a few times
        cmp word [frame], 24
        jne .nw
        mov si, msg
        mov dx, 150Ch
        mov bl, 2
        call say
        mov si, msg2
        mov dx, 170Eh
        mov bl, 7
        call say
.nw:    ; wait one clock tick
        call clock
        mov bx, ax
.t:     call clock
        cmp ax, bx
        je .t
        inc word [frame]
        cmp word [frame], 24
        jb again
        mov ah, 1
        int 16h
        jz again
        mov ah, 0
        int 16h
        mov ax, 0003h
        int 10h
        mov ax, 4C00h
        int 21h

; drawcoin: the 14x14 picture, 8 px a cell, squeezed to [w] px wide around x = 160, from y = 32
drawcoin:
        mov cx, [w]
        or cx, cx
        jnz .go
        ret
.go:    xor bp, bp              ; output column 0..w-1
.col:   ; source column = bp * 14 / w
        mov ax, bp
        mov bx, 14
        mul bx
        div word [w]
        mov si, ax              ; 0..13
        ; screen x = 160 - w/2 + bp
        mov di, [w]
        shr di, 1
        neg di
        add di, 160
        add di, bp
        add di, 32*320
        xor dx, dx              ; row
.row:   mov bx, dx
        shl bx, 4               ; 16 bytes a pattern row
        mov al, [pattern+bx+si]
        cmp al, 4
        jne .c
        cmp byte [back], 0
        je .c
        mov al, 2               ; the back of the coin has no A
.c:     or al, al
        jz .skip
        mov cx, 8
        push di
.px:    mov [es:di], al
        add di, 320
        loop .px
        pop di
.skip:  add di, 8*320
        inc dx
        cmp dx, 14
        jne .row
        inc bp
        cmp bp, [w]
        jne .col
        ret

; sparkle: eight dots turning around the coin
sparkle:
        mov cx, 8
        xor si, si
.s:     mov bx, si
        add bx, [frame]
        and bx, 15
        shl bx, 1
        mov ax, [ringy+bx]
        mov di, ax
        mov ax, [ringx+bx]
        add di, ax
        mov byte [es:di], 6
        add si, 2
        loop .s
        ret

clock:  push es
        xor ax, ax
        mov es, ax
        mov ax, [es:046Ch]
        pop es
        ret

; say: SI text at DH row, DL col, colour BL (BIOS teletype in graphics mode)
say:    push es
        mov ah, 02h
        mov bh, 0
        int 10h
.l:     lodsb
        or al, al
        jz .e
        mov ah, 0Eh
        mov bh, 0
        int 10h
        jmp .l
.e:     pop es
        ret

signal: mov dx, 03F8h
.s:     lodsb
        or al, al
        jz .e
        out dx, al
        jmp .s
.e:     mov al, 10
        out dx, al
        ret

pal     db 30,18,0,   63,51,12,   63,61,48,   44,26,0,   53,38,6,   63,63,40
found   db 'AW:coin-disk', 0
msg     db 'A GOLDEN MEMORY!', 0
msg2    db 'press any key', 0
frame   dw 0
w       dw 0
back    db 0
widths  db 112,108,97,79,56,29,8,29,56,79,97,108,112,108,97,79
faces   db 0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0
; offsets of a ring of 16 points around (160, 88): y*320 and x
ringy   dw 28*320, 31*320, 40*320, 54*320, 72*320, 90*320, 108*320, 126*320, 140*320, 126*320, 108*320, 90*320, 72*320, 54*320, 40*320, 31*320
ringx   dw 160, 196, 226, 244, 250, 244, 226, 196, 160, 124, 94, 76, 70, 76, 94, 124
; 14x14 coin, rows padded to 16: 0 empty, 1 outline, 2 gold, 3 shine, 4 letter, 5 shadow
pattern db 0,0,0,0,1,1,1,1,1,1,0,0,0,0, 0,0
        db 0,0,1,1,2,2,2,2,2,2,1,1,0,0, 0,0
        db 0,1,2,2,3,3,2,2,2,2,2,2,1,0, 0,0
        db 0,1,2,3,2,2,2,2,2,2,2,2,1,0, 0,0
        db 1,2,2,2,2,2,4,4,2,2,2,2,2,1, 0,0
        db 1,2,2,2,2,4,2,2,4,2,2,2,2,1, 0,0
        db 1,2,2,2,2,4,4,4,4,2,2,2,2,1, 0,0
        db 1,2,2,2,2,4,2,2,4,2,2,2,2,1, 0,0
        db 1,2,2,2,2,4,2,2,4,2,2,2,2,1, 0,0
        db 1,2,2,2,2,2,2,2,2,2,2,2,2,1, 0,0
        db 0,1,2,2,2,2,2,2,2,2,2,5,1,0, 0,0
        db 0,1,2,2,2,2,2,2,2,2,5,1,0,0, 0,0
        db 0,0,1,1,2,2,2,2,2,5,5,1,0,0, 0,0
        db 0,0,0,0,1,1,1,1,1,1,0,0,0,0, 0,0
