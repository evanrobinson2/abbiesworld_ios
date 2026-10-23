// The Sonniss GDC Game Audio bundles (https://sonniss.com/gameaudiogdc/), one entry per zip part.
// Royalty-free for games, no attribution; the sounds themselves may not be redistributed as sound effects
// and may not be used to train AI (see LICENSE.md). Downloads are big, so we never fetch a whole part:
// remote-zip.mjs reads each zip's directory and pulls single files with HTTP range requests.
// downloads.sonniss.com sits behind a Cloudflare bot check that GitHub runners can't pass, and the feral mirror
// doesn't answer them, so the pipeline reads byte-identical copies: your.org (Sonniss's own mirror, 2015-2019)
// and the Internet Archive item that keeps every part under its original name. Sonniss stays the last resort.
const HOST = 'https://downloads.sonniss.com/';
const ARCHIVE = 'https://archive.org/download/sonniss.com-gdc-game-audio-bundles/';
const MIRROR = { yourorg: 'https://ftpmirror.your.org/pub/misc/' };

const parts = (n, name) => Array.from({ length: n }, (_, i) => name(i + 1, n));

export const BUNDLES = [
  { id: 'gdc2026', year: 2026, gb: 6.9, files: parts(5, (i, n) => `Sonniss.com-GDC2026-GameAudioBundle${i}of${n}.zip`) },
  { id: 'gdc2024', year: 2024, gb: 23.5, files: parts(9, (i, n) => `Sonniss.com-GDC2024-GameAudioBundle${i}of${n}.zip`) },
  { id: 'gdc2023', year: 2023, label: 'GDC 2021 to 2023', gb: 38.7, files: parts(14, (i, n) => `Sonniss.com-GDC2023-GameAudioBundle${i}of${n}.zip`) },
  { id: 'gdc2020', year: 2020, gb: 48.2, files: parts(14, (i, n) => `Sonniss.com - GDC 2020 - Game Audio Bundle Part${i}of${n}.zip`) },
  { id: 'gdc2019', year: 2019, gb: 26.2, files: parts(8, (i, n) => `Sonniss.com - GDC 2019 - Game Audio Bundle Part ${i}of${n}.zip`), mirror: MIRROR.yourorg + 'sonniss2019/' },
  { id: 'gdc2018', year: 2018, gb: 29.3, files: parts(8, (i, n) => `Sonniss.com - GDC 2018 - Game Audio Bundle Part ${i}of${n}.zip`), mirror: MIRROR.yourorg + 'sonniss2018/' },
  { id: 'gdc2017', year: 2017, gb: 19.2, files: parts(9, (i, n) => `Sonniss.com - GDC 2017 - Game Audio Bundle Part ${i}of${n}.zip`), mirror: MIRROR.yourorg + 'sonniss2017/' },
  { id: 'gdc2016', year: 2016, gb: 12.9, files: parts(6, (i, n) => `Sonniss.com - GDC 2016- Game Audio Bundle Part ${i}of${n}.zip`), mirror: MIRROR.yourorg + 'sonniss2016/' },
  { id: 'gdc2015', year: 2015, gb: 9.0, files: parts(5, (i, n) => `Sonniss.com - GDC - Game Audio Bundle ${i}of${n}.zip`) },
];

// "gdc2024/3" -> { bundle, part: 3, file, urls: [primary, mirror] }
export function partRef(ref) {
  const [id, n] = String(ref).split('/');
  const bundle = BUNDLES.find(b => b.id === id);
  const file = bundle?.files[Number(n) - 1];
  if (!file) throw new Error(`Unknown bundle part ${ref}`);
  const enc = encodeURIComponent(file);
  return { bundle, part: Number(n), file, urls: [...(bundle.mirror ? [bundle.mirror + enc] : []), ARCHIVE + enc, HOST + enc] };
}

export const allParts = () => BUNDLES.flatMap(b => b.files.map((_, i) => `${b.id}/${i + 1}`));
