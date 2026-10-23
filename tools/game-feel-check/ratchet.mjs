// World-cover ratchet: a change may not hide more of the world than its base did.
// Usage: node ratchet.mjs base.json head.json   (outputs of world-cover.mjs)
import fs from 'node:fs';
const [base, head] = process.argv.slice(2).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
const SLACK = 2; // points of noise allowed
const rows = [], fails = [];
for (const h of head.results) {
  const b = base.results.find(r => r.viewport === h.viewport) || {coveredPct: 100, maskPct: 100, visibleWords: 1e9};
  const worse = h.coveredPct > b.coveredPct + SLACK, masked = h.maskPct > b.maskPct + SLACK;
  if (worse) fails.push(`${h.viewport}: covers ${h.coveredPct}% of the world, base ${b.coveredPct}%`);
  if (masked) fails.push(`${h.viewport}: mask over the world grew to ${h.maskPct}% (base ${b.maskPct}%)`);
  rows.push(`| ${h.viewport} | ${b.coveredPct}% | **${h.coveredPct}%** | ${h.maskPct}% | ${h.visibleWords} | ${h.coveredPct <= head.budgetPct ? 'within 8%' : 'over 8%'} |`);
}
const md = `## Game feel: how much of the world is hidden (${head.page})\n| screen | before | after | mask | words | budget |\n|---|---|---|---|---|---|\n${rows.join('\n')}\n\n${fails.length ? '**Hides more of the world than before:** ' + fails.join('; ') : 'Does not hide more of the world than before.'}\n`;
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
process.exit(fails.length ? 1 : 0);
