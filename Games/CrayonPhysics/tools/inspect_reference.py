"""Read selected recovered functions or PE constants without executing the reference."""
import argparse
import re
import struct
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('path', type=Path)
p.add_argument('addresses', nargs='+')
args = p.parse_args()
if args.path.suffix == '.c':
    text = args.path.read_text(encoding='utf-8', errors='replace')
    for address in args.addresses:
        match = re.search(r'/\* ' + address.lower() + r' .*?(?=/\* [0-9a-f]{8} |\Z)', text, re.S)
        print(match.group() if match else f'Not found: {address}')
else:
    data = args.path.read_bytes()
    pe = struct.unpack_from('<I', data, 0x3c)[0]
    count = struct.unpack_from('<H', data, pe + 6)[0]
    optional_size = struct.unpack_from('<H', data, pe + 20)[0]
    base = struct.unpack_from('<I', data, pe + 24 + 28)[0]
    sections = []
    for i in range(count):
        offset = pe + 24 + optional_size + i * 40
        size, va, raw_size, raw = struct.unpack_from('<IIII', data, offset + 8)
        sections.append((va, raw_size, raw))
    for address in args.addresses:
        rva = int(address, 16) - base
        for va, size, raw in sections:
            if va <= rva < va + size:
                offset = raw + rva - va
                print(address, 'float32=', struct.unpack_from('<f', data, offset)[0],
                      'float64=', struct.unpack_from('<d', data, offset)[0], 'bytes=', data[offset:offset+8].hex())
                break
        else:
            print(address, 'not in file-backed section')
