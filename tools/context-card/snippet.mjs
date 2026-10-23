// Prints the context engineering card for one study as static HTML, to paste into that study's claude.ai artifact so
// the artifact and the live Studies page show the same sources. Usage: node tools/context-card/snippet.mjs <study-id>
// Data: prototypes/ranch-atelier/dist/studies/context.json. Same markup as look/context-card.mjs, styles inlined.
import {readFileSync} from 'node:fs';
import {contextHTML, fromStudyFile} from '../../prototypes/ranch-atelier/dist/look/context-card.mjs';
const id = process.argv[2];
if (!id) { console.error('usage: node tools/context-card/snippet.mjs <study-id>'); process.exit(1); }
const dist = new URL('../../prototypes/ranch-atelier/dist/', import.meta.url);
const data = JSON.parse(readFileSync(new URL('studies/context.json', dist), 'utf8'));
for (const e of Object.values(data.studies)) if (e.file) e.items = [...fromStudyFile(JSON.parse(readFileSync(new URL('studies/' + e.file, dist), 'utf8'))), ...(e.items || [])];
const css = readFileSync(new URL('look/context-card.css', dist), 'utf8').replace(/\.ctx-(tab|float)[^}]*}\n?/g, '');
const live = `https://app.abbies.world/studies/#${id}`;
console.log(`<aside class="ctx-aside" style="max-width:340px;margin:24px 0 24px auto"><style>${css}</style>${contextHTML(data, id)}
<p class="ctx-foot"><a href="${live}">Live study page</a></p></aside>`);
