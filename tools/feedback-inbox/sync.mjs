// Copies new app feedback (speech-bubble button, /api/feedback) into the repo's feedback inbox branch,
// then comments on the open "Feedback inbox" pull request so the Claude thread watching it wakes up.
// Usage: node sync.mjs <inbox-dir>   (run by .github/workflows/feedback-inbox.yml)
// Env: SITE (default https://abbies-ranch-atelier.vercel.app), GITHUB_REPOSITORY, GH_TOKEN (for comments).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SITE = process.env.SITE || 'https://abbies-ranch-atelier.vercel.app';
const inbox = path.resolve(process.argv[2] || '.');
const dir = path.join(inbox, 'feedback');
fs.mkdirSync(dir, { recursive: true });
const lastFile = path.join(dir, 'LAST');
const last = fs.existsSync(lastFile) ? fs.readFileSync(lastFile, 'utf8').trim() : '';
const ID = /^[a-z0-9]{8,12}-[a-f0-9]{8}$/;

const git = (...args) => execFileSync('git', ['-C', inbox, ...args], { encoding: 'utf8' }).trim();
const commit = message => git('-c', 'user.name=feedback-inbox', '-c', 'user.email=feedback-inbox@users.noreply.github.com', 'commit', '-m', message);
const repo = process.env.GITHUB_REPOSITORY;
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const readme = path.join(dir, 'README.md');
if (!fs.existsSync(readme)) {
  // First run: start the inbox branch and its never-merged PR, which the watching Claude thread subscribes to.
  fs.writeFileSync(readme, '# Feedback inbox\n\nNotes and pictures Evan sends from the app\'s speech-bubble button, one folder per item.\nCopied here by `.github/workflows/feedback-inbox.yml`; see `prototypes/ranch-atelier/dist/FEEDBACK.md` on the live branch.\nThis branch is never merged.\n');
  git('add', 'feedback'); commit('Start the feedback inbox'); git('push', 'origin', 'HEAD:feedback-inbox');
  // Needs "Allow GitHub Actions to create pull requests"; otherwise open the PR by hand from branch feedback-inbox.
  if (repo && process.env.GH_TOKEN) try { gh('pr', 'create', '--repo', repo, '--draft', '--base', 'main', '--head', 'feedback-inbox', '--title', 'Feedback inbox (never merge)',
    '--body', 'Each comment here is one note Evan sent from the app, with its picture. The Claude thread "iPhone update and feedback loop" watches this PR and passes each note to the thread that made the change. Do not merge.'); } catch (error) { console.log('Could not open the inbox PR:', String(error.message).slice(0, 300)); }
}
const res = await fetch(`${SITE}/api/feedback${last ? `?since=${encodeURIComponent(last)}` : ''}`);
if (res.status === 404) { console.log('The site has no /api/feedback yet (not deployed); nothing to copy.'); process.exit(0); }
if (!res.ok) throw new Error(`Feedback list failed: ${res.status}`);
const items = (await res.json()).items.filter(i => ID.test(i.id) && (!last || i.id > last)).sort((a, b) => a.id.localeCompare(b.id));
if (!items.length) { console.log('No new feedback.'); process.exit(0); }

for (const item of items) {
  const folder = path.join(dir, item.id);
  fs.mkdirSync(folder, { recursive: true });
  if (item.imageUrl) {
    const pic = await fetch(SITE + item.imageUrl);
    if (pic.ok) fs.writeFileSync(path.join(folder, 'shot.jpg'), Buffer.from(await pic.arrayBuffer()));
  }
  const { imageUrl, ...note } = item;
  fs.writeFileSync(path.join(folder, 'note.json'), JSON.stringify({ ...note, picture: fs.existsSync(path.join(folder, 'shot.jpg')) ? 'shot.jpg' : null }, null, 2) + '\n');
}
fs.writeFileSync(lastFile, items.at(-1).id + '\n');

git('add', 'feedback');
commit(`Feedback inbox: ${items.length} new from the app`);
git('push', 'origin', 'HEAD:feedback-inbox');
const sha = git('rev-parse', 'HEAD');
console.log(`Stored ${items.length} feedback item(s) at ${sha}.`);

if (!repo || !process.env.GH_TOKEN) process.exit(0);
const pr = JSON.parse(gh('pr', 'list', '--repo', repo, '--head', 'feedback-inbox', '--state', 'open', '--json', 'number'))[0]?.number;
if (!pr) { console.log('No open Feedback inbox PR to comment on.'); process.exit(0); }
for (const item of items) {
  const quote = (item.note || '(picture only)').split('\n').map(l => `> ${l}`).join('\n');
  const body = [
    `**App feedback \`${item.id}\`** from \`${item.page || '?'}\`${item.standalone ? ' (home-screen app)' : ''}, ${item.receivedAt}`,
    '', quote, '',
    item.thread ? `For thread \`${item.thread}\`${item.threadTitle ? ` (${item.threadTitle})` : ''}` : 'No thread tagged',
    `Build \`${item.buildId || '?'}\`${item.sha ? `, commit ${item.sha.slice(0, 7)}` : ''}. Files: \`feedback/${item.id}/\` on branch \`feedback-inbox\`.`,
    item.imageUrl ? `\n<img src="https://github.com/${repo}/blob/${sha}/feedback/${item.id}/shot.jpg?raw=true" width="320">` : ''
  ].join('\n');
  gh('pr', 'comment', String(pr), '--repo', repo, '--body', body);
}
