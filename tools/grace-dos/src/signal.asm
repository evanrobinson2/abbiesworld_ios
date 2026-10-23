; SIGNAL: tells the basement something happened on Grace's computer (AW-STUDY-0024). A real DOS .COM program.
; "SIGNAL dos-grace" sends "AW:dos-grace" and a newline out of COM1; the page listening to the serial port hears it.
        org 100h
        mov dx, 03F8h
        mov si, pre
.p:     lodsb
        or al, al
        jz .tail
        out dx, al
        jmp .p
.tail:  mov si, 81h             ; the command line
        mov cl, [80h]
        xor ch, ch
.t:     jcxz .e
        lodsb
        dec cx
        cmp al, ' '
        jbe .t
        out dx, al
        jmp .t
.e:     mov al, 10
        out dx, al
        mov ax, 4C00h
        int 21h
pre     db 'AW:', 0
