// Cut a time range out of a WAV inside a remote zip without downloading the rest of it:
// read the header, then only the sample bytes for [a, b) seconds, and wrap them in a fresh WAV header.
// Compressed entries and other formats fall back to the whole file (ffmpeg cuts those).
import { readStored, readEntry } from './remote-zip.mjs';

export function parseWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') return null;
  let p = 12, fmt = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { tag: buf.readUInt16LE(p + 8), channels: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), blockAlign: buf.readUInt16LE(p + 20), bits: buf.readUInt16LE(p + 22), raw: buf.subarray(p + 8, p + 8 + size) };
    if (id === 'data') return fmt && { ...fmt, dataOffset: p + 8, dataBytes: size, needed: p + 8 };
    p += 8 + size + (size & 1);
  }
  return fmt ? { ...fmt, dataOffset: -1, needed: p + 8 } : { needed: p + 8 };
}

// Header facts of a WAV entry: { rate, channels, bits, duration, dataOffset, ... } or null.
export async function wavInfo(url, entry) {
  if (entry.method !== 0 || !/\.wav$/i.test(entry.name)) return null;
  let n = 65536, info = null;
  for (let tries = 0; tries < 4; tries++) {
    const head = await readStored(url, entry, 0, n);
    info = parseWav(head);
    if (!info) return null;
    if (info.dataOffset >= 0) break;
    n = Math.max(n * 4, info.needed + 64);
  }
  if (!info || info.dataOffset < 0 || !info.blockAlign) return null;
  const dataBytes = Math.min(info.dataBytes || Infinity, entry.csize - info.dataOffset);
  return { ...info, dataBytes, duration: dataBytes / (info.rate * info.blockAlign) };
}

function header(fmt, dataBytes) {
  const f = fmt.raw, h = Buffer.alloc(12 + 8 + f.length + 8);
  h.write('RIFF', 0); h.writeUInt32LE(h.length - 8 + dataBytes, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(f.length, 16); f.copy(h, 20);
  h.write('data', 20 + f.length); h.writeUInt32LE(dataBytes, 24 + f.length);
  return h;
}

// A playable file holding [a, b) seconds (b null = to the end), and whether it was cut here.
export async function sliceWav(url, entry, a = 0, b = null, info) {
  info ??= await wavInfo(url, entry);
  if (!info) return { body: await readEntry(url, entry), cut: false };
  const ba = info.blockAlign, bps = info.rate * ba;
  const from = Math.floor(Math.max(0, a) * bps / ba) * ba;
  const to = Math.min(info.dataBytes, b == null ? info.dataBytes : Math.ceil(b * bps / ba) * ba);
  const data = await readStored(url, entry, info.dataOffset + from, info.dataOffset + to);
  return { body: Buffer.concat([header(info, data.length), data]), cut: true, info };
}
