; KEYSTORM: a typing game for Grace's computer (AW-STUDY-0024). A real DOS program (nasm -f bin, a .COM file).
; Letters drift down over a little town at night. Type a letter and it pops; a letter that reaches the roofs puts a
; house's lights out. Four dark houses and the town sleeps. Nights teach the keyboard row by row, home row first.
; Our homage to the 1980s letter-shooting tutors: the genre's idea, with our own town, pictures, words and rules.
; Reaching night 5 sends "AW:keystorm-night-5" down the serial port, which the basement hears as a found coin.
        org 100h
        cpu 8086

COLS    equ 80
GROUND  equ 24
ROOF    equ 19          ; a letter that reaches this row lands on the town
MAXL    equ 14

start:  mov ax, 0003h
        int 10h
        mov ah, 01h             ; hide the cursor
        mov cx, 2000h
        int 10h
        mov ax, 0B800h
        mov es, ax
        mov ah, 0
        int 1Ah                 ; seed the dice from the clock
        mov [seed], dx

title:  call scene
        mov si, t_title
        mov dx, 0623h
        mov bl, 0Eh
        call text
        mov si, t_line1
        mov dx, 0919h
        mov bl, 0Fh
        call text
        mov si, t_line2
        mov dx, 0A1Eh
        mov bl, 0Fh
        call text
        mov si, t_line3
        mov dx, 0D1Ch
        mov bl, 0Bh
        call text
        mov si, t_line4
        mov dx, 0E1Bh
        mov bl, 07h
        call text
        call getkey
        cmp al, 27
        je quit
        mov word [score], 0
        mov byte [night], 0
        mov byte [houses], 0Fh
        mov byte [told], 0

newnight:
        call scene
        call deal
        ; announce the night and its letters for two seconds
        mov si, t_night
        mov dx, 0A20h
        mov bl, 0Eh
        call text
        mov al, [night]
        inc al
        call putdigit
        mov si, [setptr]
        mov dx, 0C22h
        mov bl, 0Fh
        call textsp
        mov ax, [pitchup]
        call beep3
        mov cx, 36
        call wait_ticks
        call scene

play:   call draw
        call clock
        cmp ax, [last]
        je .keys
        mov [last], ax
        call sound_tick
        dec byte [stepin]
        jnz .keys
        mov al, [speed]
        mov [stepin], al
        call fall
        cmp byte [houses], 0
        je sleeps
.keys:  mov ah, 01h
        int 16h
        jz .done
        mov ah, 0
        int 16h
        cmp al, 27
        je quit
        call zap
.done:  call alive
        or al, al
        jnz play
        ; night cleared
        inc byte [night]
        mov ax, 523
        call beep3
        cmp byte [night], 4
        jne .next
        cmp byte [told], 0
        jne .next
        mov byte [told], 1
        mov si, sig_night5
        call signal
.next:  jmp newnight

sleeps: call scene
        mov si, t_sleeps
        mov dx, 0A1Fh
        mov bl, 0Eh
        call text
        mov si, t_score
        mov dx, 0C21h
        mov bl, 0Fh
        call text
        mov ax, [score]
        call putnum
        mov si, t_again
        mov dx, 0E1Bh
        mov bl, 07h
        call text
        mov ax, 196
        call beep3
        mov cx, 18
        call wait_ticks
        call flushkeys
        call getkey
        cmp al, 27
        je quit
        jmp title

quit:   call quiet
        mov ax, 0003h
        int 10h
        mov ax, 4C00h
        int 21h

; ---------------------------------------------------------------- the town
scene:  xor di, di
        mov cx, COLS*GROUND
.sky:   mov ax, 0020h           ; the night sky
        stosw
        loop .sky
        mov cx, COLS
.grass: mov ax, 02B1h           ; green ground
        stosw
        loop .grass
        ; stars
        mov si, stars
.st:    lodsw
        or ax, ax
        jz .moon
        mov di, ax
        mov word [es:di], 082Eh ; a grey star
        jmp .st
.moon:  mov di, (2*COLS+70)*2
        mov word [es:di], 0EDBh
        mov word [es:di+2], 0EDDh
        ; four houses
        xor bx, bx
.h:     call house
        inc bx
        cmp bx, 4
        jne .h
        ; score and night
        mov si, t_scorel
        mov dx, 0001h
        mov bl, 1Fh
        call text
        mov ax, [score]
        call putnum
        mov si, t_nightl
        mov dx, 0046h
        mov bl, 1Fh
        call text
        mov al, [night]
        inc al
        call putdigit
        ret

; house number BX (0..3) at column 6 + 19*BX, rows 19..23
house:  push bx
        mov ax, bx
        mov cl, 19
        mul cl
        add ax, 6
        mov di, ax              ; column
        mov cl, bl
        mov al, 1
        shl al, cl
        test [houses], al
        mov ah, 6Eh             ; lit window: yellow
        jnz .lit
        mov ah, 60h             ; dark window: black
.lit:   mov [winattr], ah
        ; roof: rows 19..20
        mov dx, ROOF
        mov cx, 11
        mov al, '/'
        call hrow_roof
        ; walls: rows 21..23
        mov dx, 21
.w:     push dx
        mov ax, dx
        mov cl, COLS
        mul cl
        add ax, di
        shl ax, 1
        mov si, ax
        mov cx, 11
.wc:    mov word [es:si], 06DBh ; brown wall
        add si, 2
        loop .wc
        pop dx
        inc dx
        cmp dx, 24
        jne .w
        ; two windows and a door
        mov ax, 21*COLS
        add ax, di
        shl ax, 1
        mov si, ax
        mov ah, [winattr]
        mov al, 0DBh
        mov [es:si+4], ax
        mov [es:si+6], ax
        mov [es:si+14], ax
        mov [es:si+16], ax
        mov word [es:si+COLS*2+10], 0020h
        mov word [es:si+COLS*4+10], 0020h
        pop bx
        ret

hrow_roof:
        ; row 19: "  /^^^^^\  " and row 20: " /_______\ " in red
        push di
        mov ax, ROOF*COLS
        add ax, di
        shl ax, 1
        mov si, ax
        mov word [es:si+4], 042Fh
        mov cx, 5
        mov bx, 6
.r1:    mov word [es:si+bx], 44DBh
        add bx, 2
        loop .r1
        mov word [es:si+16], 045Ch
        add si, COLS*2
        mov word [es:si+2], 042Fh
        mov cx, 7
        mov bx, 4
.r2:    mov word [es:si+bx], 44DBh
        add bx, 2
        loop .r2
        mov word [es:si+18], 045Ch
        pop di
        ret

; ---------------------------------------------------------------- letters
; deal: pick this night's letter set and drop MAXL-ish letters in a staggered column pattern
deal:   mov bl, [night]
        cmp bl, 8
        jb .ok
        mov bl, 8
.ok:    xor bh, bh
        shl bx, 1
        mov si, [nightsets+bx]
        mov [setptr], si
        ; how many letters: 5 + 2*night, at most MAXL
        mov al, [night]
        shl al, 1
        add al, 5
        cmp al, MAXL
        jbe .n
        mov al, MAXL
.n:     mov [count], al
        ; speed: ticks per row, 9 down to 3
        mov al, 9
        sub al, [night]
        cmp al, 3
        jge .s
        mov al, 3
.s:     mov [speed], al
        mov [stepin], al
        ; letters
        mov di, lx
        xor cx, cx
        mov cl, [count]
        xor dx, dx
.l:     push cx
        ; x: spread across the sky
        call rnd
        xor ah, ah
        mov bl, 70
        div bl
        mov al, ah
        add al, 5
        mov [di], al            ; lx
        ; y: start above the sky, staggered
        mov al, dl
        neg al
        mov [di+MAXL], al       ; ly (signed)
        add dl, 3
        ; letter from the set
        call rnd
        push dx
        xor ah, ah
        mov si, [setptr]
        call slen
        div bl
        mov bl, ah
        xor bh, bh
        mov al, [si+bx]
        pop dx
        mov [di+2*MAXL], al     ; lc
        inc di
        pop cx
        loop .l
        ; clear the rest
        xor cx, cx
        mov cl, MAXL
        sub cl, [count]
        jz .done
.z:     mov byte [di+2*MAXL], 0
        inc di
        loop .z
.done:  ret

slen:   push si
        xor bl, bl
.c:     cmp byte [si], 0
        je .e
        inc si
        inc bl
        jmp .c
.e:     pop si
        ret

; fall: every live letter moves down a row; one that reaches the roofs darkens the house under it
fall:   call erase
        mov si, 0
.f:     cmp byte [lc+si], 0
        je .nx
        inc byte [ly+si]
        mov al, [ly+si]
        cmp al, ROOF
        jl .nx
        ; landed
        mov byte [lc+si], 0
        mov al, [lx+si]
        push si
        call darken
        pop si
        mov ax, 147
        call beep3
.nx:    inc si
        cmp si, MAXL
        jne .f
        ret

; darken the house under column AL (or the first lit one)
darken: xor ah, ah
        sub al, 6
        jns .p
        xor al, al
.p:     mov bl, 19
        div bl
        cmp al, 3
        jbe .h
        mov al, 3
.h:     mov cl, al
        mov al, 1
        shl al, cl
        test [houses], al
        jnz .off
        ; that one is already dark: take the first lit house
        mov al, 1
.find:  test [houses], al
        jnz .off
        shl al, 1
        cmp al, 16
        jb .find
        ret
.off:   not al
        and [houses], al
        call scene
        ret

; zap: the key in AL pops the lowest matching letter
zap:    cmp al, 'a'
        jb .u
        cmp al, 'z'
        ja .u
        sub al, 20h
.u:     mov bx, -1
        mov dl, -128
        xor si, si
.z:     cmp [lc+si], al
        jne .n
        mov ah, [ly+si]
        cmp ah, 0
        jl .n
        cmp ah, dl
        jle .n
        mov dl, ah
        mov bx, si
.n:     inc si
        cmp si, MAXL
        jne .z
        cmp bx, -1
        je .miss
        ; pop!
        call erase
        mov byte [lc+bx], 0
        mov al, [ly+bx]
        mov ah, [lx+bx]
        mov [popy], al
        mov [popx], ah
        mov byte [poptime], 4
        mov ax, [score]
        add ax, 10
        mov cl, [night]
        xor ch, ch
        shl cx, 1
        add ax, cx
        mov [score], ax
        call scorebar
        mov ax, 1047
        call beep1
        ret
.miss:  mov ax, 110
        call beep1
        ret

; alive: AL = number of letters still in the sky
alive:  xor al, al
        xor si, si
.a:     cmp byte [lc+si], 0
        je .n
        inc al
.n:     inc si
        cmp si, MAXL
        jne .a
        ret

; erase every letter (redraw sky under it)
erase:  xor si, si
.e:     cmp byte [lc+si], 0
        je .n
        mov al, [ly+si]
        cmp al, 1
        jl .n
        call cellof
        mov word [es:di], 0020h
.n:     inc si
        cmp si, MAXL
        jne .e
        ; and the pop
        cmp byte [poptime], 0
        je .r
        mov al, [popy]
        mov ah, [popx]
        call cell2
        mov word [es:di], 0020h
.r:     ret

; draw letters and the pop
draw:   xor si, si
.d:     cmp byte [lc+si], 0
        je .n
        mov al, [ly+si]
        cmp al, 1
        jl .n
        call cellof
        mov ah, 5Fh             ; white on magenta
        cmp byte [ly+si], ROOF-4
        jl .c
        mov ah, 4Fh             ; white on red: nearly at the roofs
.c:     mov al, [lc+si]
        mov [es:di], ax
.n:     inc si
        cmp si, MAXL
        jne .d
        cmp byte [poptime], 0
        je .r
        mov al, [popy]
        mov ah, [popx]
        call cell2
        mov word [es:di], 1E2Ah ; a yellow star where the letter was
.r:     ret

cellof: mov ah, [lx+si]
cell2:  push ax
        push dx
        mov dl, ah
        xor ah, ah
        mov dh, COLS
        mul dh
        add al, dl
        adc ah, 0
        shl ax, 1
        mov di, ax
        pop dx
        pop ax
        ret

scorebar:
        mov si, t_scorel
        mov dx, 0001h
        mov bl, 1Fh
        call text
        mov ax, [score]
        call putnum
        ret

; ---------------------------------------------------------------- text helpers (write straight to the screen)
; text: SI = zero-terminated string, DH = row, DL = col, BL = colour. Leaves [cur] after the string.
text:   push ax
        mov al, dh
        mov ah, COLS
        mul ah
        add al, dl
        adc ah, 0
        shl ax, 1
        mov di, ax
.t:     lodsb
        or al, al
        jz .e
        mov ah, bl
        mov [es:di], ax
        add di, 2
        jmp .t
.e:     mov [cur], di
        mov [curattr], bl
        pop ax
        ret

; textsp: like text, with a space between letters
textsp: call text.sp
        ret
text.sp:
        mov al, dh
        mov ah, COLS
        mul ah
        add al, dl
        adc ah, 0
        shl ax, 1
        mov di, ax
.t:     lodsb
        or al, al
        jz .e
        mov ah, bl
        mov [es:di], ax
        add di, 4
        jmp .t
.e:     ret

putdigit:
        add al, '0'
        mov ah, [curattr]
        mov di, [cur]
        mov [es:di], ax
        add word [cur], 2
        ret

; putnum: AX as five digits
putnum: mov cx, 5
        mov bx, 10
        mov di, [cur]
        add di, 8
.p:     xor dx, dx
        div bx
        add dl, '0'
        mov dh, [curattr]
        mov [es:di], dx
        sub di, 2
        loop .p
        add word [cur], 10
        ret

; ---------------------------------------------------------------- time, keys, dice, sound
clock:  push es
        xor ax, ax
        mov es, ax
        mov ax, [es:046Ch]
        pop es
        ret

wait_ticks:                     ; CX ticks
        call clock
        mov [waitfrom], ax
.w:     call sound_tick_raw
        call clock
        sub ax, [waitfrom]
        cmp ax, cx
        jb .w
        ret

getkey: mov ah, 0
        int 16h
        ret

flushkeys:
        mov ah, 1
        int 16h
        jz .e
        mov ah, 0
        int 16h
        jmp flushkeys
.e:     ret

rnd:    push cx
        push dx
        mov ax, [seed]
        mov cx, 25173
        mul cx
        add ax, 13849
        mov [seed], ax
        mov al, ah
        pop dx
        pop cx
        ret

; beep1: one short note, AX = Hz.  beep3: three notes climbing from AX.
beep1:  mov byte [notes], 1
        mov [note0], ax
        jmp beepgo
beep3:  mov byte [notes], 3
        mov [note0], ax
beepgo: mov byte [notelen], 2
        mov byte [noteidx], 0
        call tone
        ret

tone:   mov bx, ax
        mov dx, 0012h
        mov ax, 34DCh           ; 1193180 / Hz
        cmp bx, 20
        jb .q
        div bx
        push ax
        mov al, 0B6h
        out 43h, al
        pop ax
        out 42h, al
        mov al, ah
        out 42h, al
        in al, 61h
        or al, 3
        out 61h, al
        ret
.q:     call quiet
        ret

quiet:  in al, 61h
        and al, 0FCh
        out 61h, al
        ret

; sound_tick: called once per clock tick; walks the notes, and ages the pop star
sound_tick:
        cmp byte [poptime], 0
        je sound_tick_raw
        dec byte [poptime]
        jnz sound_tick_raw
        mov al, [popy]
        mov ah, [popx]
        call cell2
        mov word [es:di], 0020h
sound_tick_raw:
        cmp byte [notes], 0
        je .r
        dec byte [notelen]
        jnz .r
        inc byte [noteidx]
        mov al, [noteidx]
        cmp al, [notes]
        jb .next
        mov byte [notes], 0
        call quiet
        ret
.next:  mov byte [notelen], 2
        mov ax, [note0]
        mov bx, ax
        shr bx, 1
        shr bx, 1
        add ax, bx              ; each note a third higher
        mov [note0], ax
        call tone
.r:     ret

; signal: send the zero-terminated string at SI out of COM1, so the basement knows
signal: mov dx, 03F8h
.s:     lodsb
        or al, al
        jz .e
        out dx, al
        jmp .s
.e:     mov al, 10
        out dx, al
        ret

; ---------------------------------------------------------------- data
t_title  db 'K E Y S T O R M', 0
t_line1  db 'Type the letters before they reach', 0
t_line2  db 'the little town below!', 0
t_line3  db 'Press any key to start', 0
t_line4  db 'Esc goes back to Grace', 39, 's computer', 0
t_night  db 'NIGHT ', 0
t_sleeps db 'THE TOWN SLEEPS', 0
t_score  db 'Score ', 0
t_again  db 'Press any key to play again', 0
t_scorel db 'SCORE ', 0
t_nightl db 'NIGHT ', 0
sig_night5 db 'AW:keystorm-night-5', 0

w0 db 'FJ', 0
w1 db 'FJDK', 0
w2 db 'ASDFJKL', 0
w3 db 'ASDFGHJKL', 0
w4 db 'EIRUWO', 0
w5 db 'QWERTYUIOP', 0
w6 db 'ASDFGHJKLEIRU', 0
w7 db 'ZXCVBNM', 0
w8 db 'QWERTYUIOPASDFGHJKLZXCVBNM', 0
nightsets dw w0, w1, w2, w3, w4, w5, w6, w7, w8

stars   dw (1*COLS+12)*2, (3*COLS+30)*2, (2*COLS+51)*2, (5*COLS+64)*2, (4*COLS+7)*2, (7*COLS+44)*2, (6*COLS+22)*2
        dw (9*COLS+75)*2, (8*COLS+58)*2, (11*COLS+3)*2, (10*COLS+36)*2, (12*COLS+68)*2, (13*COLS+15)*2, 0

pitchup dw 392
seed    dw 1
score   dw 0
last    dw 0
waitfrom dw 0
cur     dw 0
curattr db 0
night   db 0
houses  db 0Fh
told    db 0
count   db 0
speed   db 9
stepin  db 9
winattr db 0
setptr  dw w0
popx    db 0
popy    db 0
poptime db 0
notes   db 0
notelen db 0
noteidx db 0
note0   dw 0
lx      times MAXL db 0
ly      times MAXL db 0
lc      times MAXL db 0
