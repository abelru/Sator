// Pulls player-made squares from Firestore and adds the valid new ones to the daily puzzle lists.
//
//   npm run import-squares            # update src/data/*.json, print what was added
//   npm run import-squares -- --dry   # just print what would be added
//   add --emulator to read from the local emulators (npm run emulators) instead of the live project
//
// Each square is re-checked here (letters only, symmetric, every row a real word, not already a puzzle),
// because the Firestore rules can only check shape. New squares go into the daily list starting two days
// from today, so today's and tomorrow's dailies never change. Review `git diff src/data` before pushing:
// the word list includes rare and crude words, and you may not want every square as a daily.
import { readFileSync, writeFileSync } from 'node:fs';

const dry = process.argv.includes('--dry');
const emu = process.argv.includes('--emulator');
const root = new URL('../', import.meta.url);
const project = emu ? 'demo-sator' : JSON.parse(readFileSync(new URL('.firebaserc', root), 'utf8')).projects.default;
const host = emu ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
const LAUNCH_UTC = Date.UTC(2026, 9, 29); // keep in sync with src/time.js

function dayNumber() { const d = new Date(); return Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - LAUNCH_UTC) / 864e5) + 1); }
const chunks = (s, k) => Array.from({ length: s.length / k }, (_, i) => s.substr(i * k, k));

async function fetchSquares() {
  const out = []; let token = '';
  do {
    const url = `${host}/v1/projects/${project}/databases/(default)/documents/squares?pageSize=300${token ? '&pageToken=' + token : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore read failed: ${res.status} ${await res.text()}`);
    const body = await res.json();
    for (const d of body.documents || []) {
      const f = d.fields || {};
      out.push({ n: Number(f.n?.integerValue), rows: f.rows?.stringValue || '' });
    }
    token = body.nextPageToken || '';
  } while (token);
  return out;
}

const squares = await fetchSquares();
console.log(`${squares.length} submitted square(s) in Firestore (${project})`);
const today = dayNumber();
let total = 0;

for (const n of [3, 4, 5, 6, 7, 8, 9]) {
  const file = new URL(`src/data/${n}.json`, root);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const L = n * n;
  const words = new Set(chunks(data.w, n));
  const everyday = new Set([...chunks(data.d, n), ...chunks(data.u, n)]); // words already used in our puzzles
  const existing = new Set([...chunks(data.d, L), ...chunks(data.u, L)]);
  const added = [];
  for (const { n: sn, rows } of squares) {
    if (sn !== n || rows.length !== L || !/^[a-z]+$/.test(rows) || existing.has(rows)) continue;
    const r = chunks(rows, n);
    let ok = r.every(w => words.has(w));
    for (let i = 0; ok && i < n; i++) for (let j = 0; j < n; j++) if (r[i][j] !== r[j][i]) { ok = false; break; }
    if (!ok) continue;
    existing.add(rows); added.push(r);
  }
  if (!added.length) continue;
  const flat = added.map(r => r.join('')).join('');
  if (n === 9) {
    // No 9×9 daily (it's the one legendary square), so new 9×9s join the unlimited list, which free play
    // draws from. Appended, so the legendary square at index 0 never changes.
    data.u += flat;
    console.log(`\n9×9: +${added.length} (added to free play)`);
  } else {
    // Insert after tomorrow's slot so dailies people may already be playing stay put. Once a size's daily
    // list has wrapped around, any insert would shift today's puzzle (index = (day-1) % count), so skip.
    const count = data.d.length / L;
    if (today - 1 >= count) { console.log(`\n${n}×${n}: skipped ${added.length}; the daily list has wrapped, so inserting would change today's puzzle`); continue; }
    const pos = Math.min(count, today + 1);
    data.d = data.d.slice(0, pos * L) + flat + data.d.slice(pos * L);
    console.log(`\n${n}×${n}: +${added.length} (first one is daily #${pos + 1})`);
  }
  for (const r of added) {
    const rare = n <= 6 && r.some(w => !everyday.has(w));
    console.log('  ' + r.join(' ') + (rare ? '   ← uses words outside our usual everyday list' : ''));
  }
  total += added.length;
  if (!dry) writeFileSync(file, JSON.stringify(data));
}

console.log(total ? `\n${dry ? 'Would add' : 'Added'} ${total} square(s).${dry ? '' : ' Review with `git diff --stat src/data`, then commit and push.'}` : '\nNothing new to add.');
