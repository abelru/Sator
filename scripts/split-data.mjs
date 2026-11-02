// Pulls the DATA blob out of the original single-file build and writes one
// JSON file per grid size to src/data/, so each size loads only when played.
// Usage: node scripts/split-data.mjs legacy/sator-single-file.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/split-data.mjs <file.html>'); process.exit(1); }

const line = readFileSync(src, 'utf8').split('\n').find(l => l.startsWith('const DATA = '));
if (!line) { console.error('No "const DATA = " line found in ' + src); process.exit(1); }
const DATA = JSON.parse(line.slice('const DATA = '.length).replace(/;\s*$/, ''));

const out = new URL('../src/data/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const n of Object.keys(DATA.p)) {
  // d: daily puzzles, u: unlimited puzzles, w: every valid word of length n (all concatenated)
  const file = { d: DATA.p[n].d, u: DATA.p[n].u, w: DATA.w[n] };
  writeFileSync(new URL(`${n}.json`, out), JSON.stringify(file));
  console.log(`src/data/${n}.json  ${(JSON.stringify(file).length / 1024).toFixed(0)} KB`);
}
