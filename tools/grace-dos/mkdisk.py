"""FAT12 disk images for Grace's computer (AW-STUDY-0024): 720 KB 3.5" floppies, like the PS/2 Model 25's drive, and a
small hard disk that boots FreeDOS. No tools beyond Python: the images are laid out byte by byte here.

  python3 mkdisk.py floppy OUT.img LABEL [--boot boot12.bin] SRC[=DOS/PATH] ...
  python3 mkdisk.py hdd    OUT.img LABEL --mbr mbr.bin --boot boot12.bin SRC[=DOS/PATH] ...

DOS paths may hold one or more folders (GRACE/README.TXT). Files keep the order given,
so put KERNEL.SYS first on a boot disk. Every date is 23 Oct 1986.
"""
import struct, sys

HIDDEN = {'GRACE.BAT', 'SIGNAL.COM'}  # Grace's secret word, and the little program it uses
DATE = (1986 - 1980) << 9 | 10 << 5 | 23
TIME = 19 << 11 | 30 << 5


def dos_name(n):
    if n in ('.', '..'):
        return n.ljust(11).encode()
    base, _, ext = n.upper().partition('.')
    return (base[:8].ljust(8) + ext[:3].ljust(3)).encode('ascii')


def entry(name, attr, first, size):
    return struct.pack('<11sB10sHHHI', dos_name(name), attr, bytes(10), TIME, DATE, first, size)


def volume(sectors, spc, spf, root_ents, media, hidden, spt, heads, drive, label, files, boot=None):
    img = bytearray(sectors * 512)
    bs = bytearray(boot if boot else b'\xeb\x3c\x90' + bytes(509))
    bs[3:3 + 33] = struct.pack('<8sHBHBHHBHHHII', b'GRACE1.0', 512, spc, 1, 2, root_ents,
                               sectors if sectors < 65536 else 0, media, spf, spt, heads, hidden,
                               sectors if sectors >= 65536 else 0)
    bs[0x24:0x24 + 26] = struct.pack('<BBBI11s8s', drive, 0, 0x29, 0x19861023,
                                     (label or 'NO NAME').upper()[:11].ljust(11).encode(), b'FAT12   ')
    if not boot:  # a data disk says so politely if you try to boot it
        msg = b'Not a system disk. Take it out and press a key.\r\n\0'
        code = bytes([0x31, 0xC0, 0x8E, 0xD8, 0xBE, 0x60, 0x7C, 0xAC, 0x08, 0xC0, 0x74, 0x06,
                      0xB4, 0x0E, 0xCD, 0x10, 0xEB, 0xF5, 0x31, 0xC0, 0xCD, 0x16, 0xCD, 0x19])
        bs[0x3E:0x3E + len(code)] = code
        bs[0x60:0x60 + len(msg)] = msg
    bs[510:512] = b'\x55\xaa'
    img[0:512] = bs

    root_secs = root_ents * 32 // 512
    data0 = 1 + 2 * spf + root_secs
    nclus = (sectors - data0) // spc
    assert nclus < 4085, 'too many clusters for FAT12'
    fat = [0xF00 | media, 0xFFF] + [0] * nclus
    cs = spc * 512
    nxt = [2]

    def alloc(data):
        n = max(1, (len(data) + cs - 1) // cs) if data else 0
        first = nxt[0] if n else 0
        for i in range(n):
            c = nxt[0] + i
            fat[c] = c + 1 if i < n - 1 else 0xFFF
            o = (data0 + (c - 2) * spc) * 512
            img[o:o + cs] = data[i * cs:(i + 1) * cs].ljust(cs, b'\0')
        nxt[0] += n
        return first

    # tree: folder -> list of (name, payload or subtree)
    tree = {}
    for src, path in files:
        parts = path.upper().split('/')
        node = tree
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = open(src, 'rb').read() if isinstance(src, str) else src

    def write_dir(node, me, parent):
        ents = []
        if me is not None:
            ents += [None, None]  # . and .. filled after we know our cluster
        for name, v in node.items():
            if isinstance(v, dict):
                ents.append((name, 0x10, None, v))
            else:
                attr = 0x22 if name in HIDDEN else 0x20
                ents.append((name, attr, alloc(v), len(v)))
        return ents

    def place(node, parent_cluster):
        # reserve this folder's own cluster first, so '.' is known
        raw = bytearray(cs)
        mine = alloc(bytes(raw))
        ents = write_dir(node, mine, parent_cluster)
        out = bytearray()
        out += entry('.', 0x10, mine, 0) + entry('..', 0x10, parent_cluster, 0)
        for e in ents[2:]:
            name, attr, a, b = e
            if attr == 0x10:
                sub = place(b, mine)
                out += entry(name, 0x10, sub, 0)
            else:
                out += entry(name, attr, a, b)
        assert len(out) <= cs, 'folder too big'
        o = (data0 + (mine - 2) * spc) * 512
        img[o:o + len(out)] = out
        return mine

    root = bytearray(root_ents * 32)
    slot = 0
    if label:
        root[0:32] = struct.pack('<11sB10sHHHI', label.upper()[:11].ljust(11).encode(), 0x08,
                                 bytes(10), TIME, DATE, 0, 0)
        slot = 1
    for name, v in tree.items():
        if isinstance(v, dict):
            continue
        attr = 0x07 if name == 'KERNEL.SYS' else 0x22 if name in HIDDEN else 0x20
        root[slot * 32:slot * 32 + 32] = entry(name, attr, alloc(v), len(v))
        slot += 1
    for name, v in tree.items():
        if isinstance(v, dict):
            root[slot * 32:slot * 32 + 32] = entry(name, 0x10, place(v, 0), 0)
            slot += 1

    fb = bytearray(spf * 512)
    fat += [0] * (len(fat) % 2)
    for i in range(0, len(fat), 2):
        a, b = fat[i], fat[i + 1]
        fb[i * 3 // 2:i * 3 // 2 + 3] = bytes([a & 0xFF, (a >> 8) | ((b & 0xF) << 4), b >> 4])
    for k in range(2):
        o = (1 + k * spf) * 512
        img[o:o + len(fb)] = fb
    o = (1 + 2 * spf) * 512
    img[o:o + len(root)] = root
    return img


def floppy(label, files, boot=None):
    return volume(1440, 2, 3, 112, 0xF9, 0, 9, 2, 0, label, files, boot)


def hdd(label, files, mbr, boot, cyl=2):
    heads, spt = 16, 63
    total = cyl * heads * spt
    part = total - spt
    spf = ((part // 4) * 3 // 2 + 3 + 511) // 512
    vol = volume(part, 4, spf, 512, 0xF8, spt, spt, heads, 0x80, label, files, boot)
    disk = bytearray(total * 512)
    m = bytearray(mbr[:446].ljust(446, b'\0')) + bytes(66)

    def chs(lba):
        c, r = divmod(lba, heads * spt)
        h, s = divmod(r, spt)
        return bytes([h, (s + 1) | ((c >> 2) & 0xC0), c & 0xFF])
    m[446:462] = bytes([0x80]) + chs(spt) + bytes([0x01]) + chs(total - 1) + struct.pack('<II', spt, part)
    m[510:512] = b'\x55\xaa'
    disk[0:512] = m
    disk[spt * 512:] = vol
    return disk


if __name__ == '__main__':
    a = sys.argv[1:]
    kind, out, label, rest = a[0], a[1], a[2], a[3:]
    opts = {}
    while rest and rest[0].startswith('--'):
        opts[rest[0][2:]] = open(rest[1], 'rb').read()
        rest = rest[2:]
    files = [(f.split('=')[0], f.split('=')[1] if '=' in f else f.rsplit('/', 1)[-1]) for f in rest]
    if kind == 'floppy':
        data = floppy(label, files, opts.get('boot'))
    else:
        data = hdd(label, files, opts['mbr'], opts['boot'])
    open(out, 'wb').write(data)
