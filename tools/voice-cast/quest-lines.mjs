// Writes tools/voice-cast/lines/quests.json from the quest engine: every favour's ask, then each step's line, said by the
// giver's designed voice (GIVERS[x].cast). Run after changing a favour:  node tools/voice-cast/quest-lines.mjs
// Then render with the voice-cast workflow (mode=lines, game=quests). The game plays them from studies/family-cast/lines-quests.json.
import {writeFileSync} from 'node:fs';
import {TEMPLATES, GIVERS} from '../../prototypes/ranch-atelier/dist/simulations/quests.mjs';
export const questLines = () => { const lines = {}; for (const t of TEMPLATES) { const who = GIVERS[t.giver].cast; lines[t.id] = [who, t.ask]; t.steps.forEach((s, i) => { lines[`${t.id}-${i}`] = [who, `${s.say}.`]; }); } return lines; };
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
 writeFileSync(new URL('./lines/quests.json', import.meta.url), JSON.stringify({about: "Every townsfolk favour in simulations/quests.mjs: the ask (<questId>) and each step (<questId>-<n>), said by the giver's designed voice. Written by tools/voice-cast/quest-lines.mjs.", lines: questLines()}, null, 1) + '\n');
}
