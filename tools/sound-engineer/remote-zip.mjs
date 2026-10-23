// Read a zip that lives on a web server without downloading it: the directory comes from the tail of
// the file and each entry from its own byte range (HTTP Range). Handles ZIP64, which the multi-GB
// Sonniss parts use. Only stored and deflated entries, which is all zips of WAVs contain.
import { inflateRawSync } from 'node:zlib';

async function range(url, start, end, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { Range: `bytes=${start}-${end}` }, signal: AbortSignal.timeout(120000) });
      if (r.status !== 206) { r.body?.cancel(); throw Object.assign(new Error(`${url} answered ${r.status} to a range request`), { final: r.status >= 400 && r.status < 500 }); }
      return Buffer.from(await r.arrayBuffer());
    } catch (e) {
      if (e.final || i + 1 >= tries) throw e;
      await new Promise(res => setTimeout(res, 1000 * 2 ** i));
    }
  }
}

async function size(url) {
  const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${url} answered ${r.status}`);
  return Number(r.headers.get('content-length'));
}

const u64 = (b, o) => Number(b.readBigUInt64LE(o));

// The directory: [{ name, method, csize, size, offset, crc }]
export async function listZip(url) {
  const total = await size(url);
  const tailLen = Math.min(total, 65557 + 20 + 56);
  const tail = await range(url, total - tailLen, total - 1);
  let e = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (tail.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error(`${url}: no end of central directory`);
  let count = tail.readUInt16LE(e + 10), cdSize = tail.readUInt32LE(e + 12), cdOffset = tail.readUInt32LE(e + 16);
  if (count === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    const loc = e - 20;
    if (loc < 0 || tail.readUInt32LE(loc) !== 0x07064b50) throw new Error(`${url}: ZIP64 locator missing`);
    const z64At = u64(tail, loc + 8);
    const z64 = z64At >= total - tailLen ? tail.subarray(z64At - (total - tailLen)) : await range(url, z64At, z64At + 55);
    if (z64.readUInt32LE(0) !== 0x06064b50) throw new Error(`${url}: bad ZIP64 record`);
    count = u64(z64, 32); cdSize = u64(z64, 40); cdOffset = u64(z64, 48);
  }
  const cd = await range(url, cdOffset, cdOffset + cdSize - 1);
  const out = [];
  for (let p = 0, k = 0; k < count; k++) {
    if (cd.readUInt32LE(p) !== 0x02014b50) throw new Error(`${url}: bad directory entry ${k}`);
    const flags = cd.readUInt16LE(p + 8), method = cd.readUInt16LE(p + 10), crc = cd.readUInt32LE(p + 16);
    let csize = cd.readUInt32LE(p + 20), usize = cd.readUInt32LE(p + 24);
    const nl = cd.readUInt16LE(p + 28), xl = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32);
    let offset = cd.readUInt32LE(p + 42);
    const name = cd.subarray(p + 46, p + 46 + nl).toString(flags & 0x800 ? 'utf8' : 'latin1');
    for (let x = p + 46 + nl, end = x + xl; x + 4 <= end;) {
      const id = cd.readUInt16LE(x), len = cd.readUInt16LE(x + 2);
      if (id === 1) {
        let q = x + 4;
        if (usize === 0xffffffff) { usize = u64(cd, q); q += 8; }
        if (csize === 0xffffffff) { csize = u64(cd, q); q += 8; }
        if (offset === 0xffffffff) { offset = u64(cd, q); q += 8; }
      }
      x += 4 + len;
    }
    if (!name.endsWith('/')) out.push({ name, method, csize, size: usize, offset, crc });
    p += 46 + nl + xl + cl;
  }
  return { url, bytes: total, entries: out };
}

// Where an entry's bytes start in the zip (after its local header).
export async function entryStart(url, entry) {
  if (entry.start) return entry.start;
  const head = await range(url, entry.offset, entry.offset + 29);
  if (head.readUInt32LE(0) !== 0x04034b50) throw new Error(`${entry.name}: bad local header`);
  return entry.start = entry.offset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
}

// Bytes [from, to) of a stored (uncompressed) entry.
export async function readStored(url, entry, from, to) {
  if (entry.method !== 0) throw new Error(`${entry.name} is compressed`);
  const start = await entryStart(url, entry);
  const end = Math.min(entry.csize, to);
  return from >= end ? Buffer.alloc(0) : range(url, start + from, start + end - 1);
}

// The bytes of one entry. `limit` reads only the start of a stored entry (enough for a WAV header).
export async function readEntry(url, entry, { limit } = {}) {
  const start = await entryStart(url, entry);
  if (entry.method === 0) {
    const n = limit ? Math.min(limit, entry.csize) : entry.csize;
    return range(url, start, start + n - 1);
  }
  if (entry.method !== 8) throw new Error(`${entry.name}: compression method ${entry.method} not supported`);
  const data = await range(url, start, start + entry.csize - 1);
  return inflateRawSync(data);
}
