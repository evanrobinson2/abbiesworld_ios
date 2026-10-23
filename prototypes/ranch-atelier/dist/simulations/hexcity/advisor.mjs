// The steward and the townspeople speak (AW-STUDY-0033). Everything they say is grounded in the simulation:
// facts() turns one year of the run into a short fact sheet, and the words are either written live by the AI
// (api/advisor.js, which may only use those facts) or, offline, put together from the same facts here.
// Speakers are people in the world, so this is diegetic: the steward answers when asked; a baker by a dry fountain
// grumbles about it. Voices are designed ones from tools/voice-cast/cast.json (never cloned).
import { KINDS, WORK_IDS } from './hexcity.mjs';

export const SPEAKERS = {
 steward:  { name: 'The steward', cast: 'city-steward', fallbackVoice: 'JBFqnCBsd6RMkjVDRZzb', about: 'runs the town hall, knows every number, kind and a little proud' },
 baker:    { name: 'A baker', cast: 'city-baker', fallbackVoice: 'XrExE9yKIg1WjnnlVkGX', about: 'up before dawn, cheerful, talks about bread and flour' },
 fisher:   { name: 'A fisher', cast: 'city-fisher', fallbackVoice: 'IKne3meq5aSn9XLyUdCD', about: 'salty and funny, talks about boats, ships and the weather' },
 mason:    { name: 'A builder', cast: 'city-mason', fallbackVoice: 'bIHbv24MWmeRgasZH58o', about: 'practical, talks about timber, tiles, roofs and streets' },
 watercarrier: { name: 'A water carrier', cast: 'city-water', fallbackVoice: 'cgSgspJ2msm6clMCkdW9', about: 'quick and chatty, knows every well and fountain' }
};

const NEED_WORDS = { water: 'water close by', fountain: 'a fountain', food: 'enough food', market: 'a market close by', oil: 'olive oil', cloth: 'cloth', bath: 'a bath house', school: 'a school', tiles: 'tiled roofs', temple: 'a temple', theatre: 'a theatre', wine: 'wine', view: 'a nicer spot (a view or a garden)' };
export const needWords = k => NEED_WORDS[k] || k;

// The fact sheet for one year: numbers the AI may use, nothing else.
export function facts(st, year) {
 const y = st.years[Math.max(0, Math.min(st.years.length - 1, year - 1))], H = st.tile.hexes;
 const count = {}; for (let i = 0; i < H.length; i++) if (y.work[i] >= 0) { const id = WORK_IDS[y.work[i]]; count[id] = (count[id] || 0) + 1; }
 // What holds households back from the next kind: needs missing, by block count, this year.
 const short = shortages(st, y);
 const news = st.log.filter(e => e.year <= y.year && e.text).slice(-5).map(e => `year ${e.year}: ${e.text}`);
 return {
  year: y.year, people: y.pop,
  kinds: Object.fromEntries([1, 2, 3, 4].map(k => [KINDS[k], y.byKind[k]])),
  food: pct(y.food), water: pct(y.water), oil: pct(y.goods.oil), cloth: pct(y.goods.cloth), wine: pct(y.goods.wine),
  stores: y.stock, workers: y.workers, works: count,
  channel: st.aqueduct && y.year >= (st.log.find(e => e.tag === 'aqueduct')?.year ?? 1e9) ? { km: Math.round(st.aqueduct.length / 100) / 10, arrivesAt: Math.round(st.aqueduct.level) + ' m', litresPerSecond: Math.round(st.aqueduct.lps * 10) / 10 } : null,
  holdingBack: short.slice(0, 4).map(s => `${s.blocks} ${s.blocks === 1 ? 'block' : 'blocks'} of ${s.kind.toLowerCase()} ${s.blocks === 1 ? 'needs' : 'need'} ${needWords(s.need)}`),
  news
 };
}
const pct = v => Math.round(v * 100) + '%';
export function shortages(st, y) {
 // Recomputed from the snapshot: for each home block, the first need of the next kind it lacks is not stored, so
 // the run keeps the tally (st.missingByYear) when it was asked to; otherwise use unmet counts.
 const tally = st.missingByYear?.[y.year] || {};
 return Object.entries(tally).map(([k, blocks]) => { const [kind, need] = k.split(':'); return { kind: KINDS[+kind], need, blocks }; }).sort((a, b) => b.blocks - a.blocks);
}

// Offline answer, built from the facts only. The live AI answer replaces it when the game is online.
export function stewardLine(f, question = '') {
 const q = question.toLowerCase(), out = [];
 const ok = v => parseInt(v) >= 95;
 if (/water|fountain|well|thirst/.test(q)) out.push(ok(f.water) ? `Water is good: ${f.works.well || 0} wells${f.works.fountain ? ` and ${f.works.fountain} fountains` : ''}.` : `We only have ${f.water} of the water we need. Another well would help.`);
 else if (/food|bread|fish|hungry|eat/.test(q)) out.push(ok(f.food) ? `Everyone has enough to eat. ${Math.round(f.workers.farmers)} families farm and ${Math.round(f.workers.fishers)} fish.` : `We grow only ${f.food} of the food we need.`);
 else out.push(`It's year ${f.year}, and ${f.people.toLocaleString('en-US')} people live in our town.`);
 const lack = f.holdingBack[0];
 if (lack) out.push(`${cap(lack)}.`);
 else if (!ok(f.food)) out.push(`Food is short: only ${f.food} of what we need.`);
 const last = f.news.filter(t => t.length < 110 && !/council keeps|wells now|fountains now/.test(t)).pop(); if (last) out.push(`Latest news, ${last.replace(/^year (\d+): /, 'year $1: ')}`);
 return out.join(' ');
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Townspeople speak up about what happens near them: one line per event, from the event's own numbers.
export function bark(e) {
 const t = e.tag;
 const lines = {
  well: ['watercarrier', 'A new well! No more long walks with the buckets.'],
  fountain: ['watercarrier', 'Running water, right here on our street!'],
  aqueduct: ['mason', 'Water all the way from the spring, and it never once runs uphill.'],
  market: ['baker', 'A market where all the paths meet. Fresh bread, everyone!'],
  mill: ['baker', 'The mill wheel is turning. Flour for everybody!'],
  bakery: ['baker', 'Ovens are hot. Who wants bread?'],
  harbour: ['fisher', 'Boats in the water! Fish for supper.'],
  trade: ['fisher', 'A ship! They want our oil, and they brought grain.'],
  fire: ['mason', 'Fire! Thatch burns fast. We need tiled roofs.'],
  watch: ['mason', 'Buckets and hooks are ready. The fire watch is on duty.'],
  kiln: ['mason', 'Red clay tiles. These roofs will not burn.'],
  flood: ['fisher', 'The river came right up to the doors. We will build higher.'],
  bath: ['watercarrier', 'A warm bath house! Everybody in.'],
  theatre: ['baker', 'A theatre! I am going to the very first show.'],
  temple: ['steward', 'The temple on the hill. The boats can see it from far out.'],
  garden: ['steward', 'Trees and a pool. This street will be the finest in town.'],
  road: ['mason', 'Stone paving. No more mud on market day.']
 };
 const l = lines[t] || lines[(WORK_IDS.includes(t) ? t : '')];
 return l ? { speaker: l[0], text: l[1], hex: e.hex, year: e.year } : null;
}

// The system prompt the live AI gets (api/advisor.js). It may only use the facts it is given.
export const ADVISOR_PROMPT = `You are a character in Abbie's World, a gentle building game for children aged 5 to 10.
You live in a small harbour town on a limestone headland. The child playing is in charge of the town.
Rules:
- Use ONLY the facts in the FACTS block. Never invent numbers, names, places or events. If you do not know, say so kindly.
- Answer in 1 to 3 short sentences a 7-year-old understands. Warm, concrete, a little playful. No lists, no markdown.
- If something is holding the town back, say the single most useful thing the child could build or do next.
- Stay in character as the speaker described. Keep everything PG: no scary, violent or grown-up topics. Fires and floods are told gently.
- If the child asks about something outside the town, steer back to the town kindly.`;
