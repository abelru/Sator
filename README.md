# Sator

A daily word-square puzzle. Fill the grid so every row is a real word and each row matches the column with the same number. Includes daily and unlimited modes, sizes 3×3 to 8×8, one legendary 9×9, hints, stats, and a daily leaderboard for each size.

Live at **[satordle.org](https://satordle.org)**.

Built with plain JavaScript (no framework) and bundled by [Vite](https://vitejs.dev). Hosted on **GitHub Pages**, with the leaderboard on **Firebase** (Firestore + anonymous Auth).

---

## Quick start

```bash
npm install        # once
npm run dev        # http://localhost:5173, reloads as you edit
```

The game runs without Firebase. Until you fill in `src/services/firebase-config.js`, the leaderboard says it isn't switched on and everything else works.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server with hot reload |
| `npm run dev:emu` | Dev server wired to the local Firebase emulators (run `npm run emulators` first, in a second terminal) |
| `npm run emulators` | Local Firestore + Auth emulators, with a UI at http://localhost:4000. Needs Java. |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the `dist/` build locally to check it before deploying |
| `npm run deploy:rules` | Upload `firestore.rules` to Firebase (only needed when you change the rules) |

## Project layout

```
index.html                 Page markup (header, board, dialogs)
src/
  main.js                  Entry point: imports CSS, wires buttons, boots the game
  state.js                 Saved progress and settings (localStorage)
  time.js                  Daily puzzle number, countdown, time formatting
  words.js                 Loads puzzle and word data one size at a time; dictionary lookups
  solver.js                Backtracking search behind the Hint button
  game.js                  Current puzzle (G) and all game actions: typing, check, hints, win
  render.js                Draws the board and controls from the game state
  dom.js                   Tiny $() helper
  ui/
    dialogs.js             Open/close dialogs, confirm box, toast
    keyboard.js            On-screen keyboard and physical key handling
    result.js              Result dialog, stats dialog, share text
    board.js               Leaderboard dialog and the "add your name" prompt
  services/
    firebase-config.js     Your Firebase web config (paste it here)
    firebase.js            The only file that imports the Firebase SDK
    leaderboard.js         Leaderboard API used by the UI; loads firebase.js lazily
  styles/                  CSS split by area (base, controls, board, keyboard, dialogs, responsive)
  data/3.json … 9.json     Puzzles + word list for each size
public/favicon.svg         Copied into the build as-is
scripts/split-data.mjs     Regenerates src/data/ from the original single-file build
legacy/                    The original one-file version, kept for reference
firebase.json              Firestore + emulator config
.github/workflows/deploy.yml  Builds and publishes to GitHub Pages on every push to main
firestore.rules            Who can read and write the leaderboard
```

### Why it's split up like this

- **Faster first load.** The original file was 860 KB because every word list was inlined. Each size now lives in its own file and downloads only when someone plays that size. A first visit to 5×5 loads about 45 KB gzipped in total.
- **Firebase loads only when needed.** The SDK (~110 KB gzipped) loads the first time someone opens the leaderboard, never on page load.
- **Safe caching.** Vite puts a content hash in every built file name (`5-DzD-811_.js`), so a changed file always gets a new URL and players never get stuck with stale code after a deploy.
- **Smaller files to work in.** Changing hints means editing `game.js` and `solver.js`, not searching through one huge file.

### How the leaderboard works

```
Firestore
└── boards/
    └── d{day}-{size}/          e.g. d5-5 = daily puzzle #5, 5×5
        └── times/
            └── {uid}           { name: "Abel", ms: 45210, at: <server time> }
```

- Each browser signs in **anonymously**, so players get a stable id without making an account.
- `firestore.rules` lets anyone **read** the boards. A player can **create one entry per board**, stored under their own uid, with a name of 1–16 characters and a time between 1 second and 24 hours. Entries can't be edited or deleted from the client.
- The page fetches the 10 fastest entries for a board. No cleanup job is needed.

> **Honest limitation:** solve times come from the player's browser, so a determined cheater could post a fake time that passes the rules. Stopping that needs server-side verification (a Cloud Function, which requires the paid Blaze plan). For a friends-and-classmates game the rules above are a reasonable bar. You can delete bad entries from the Firebase console.

---

## Deploying

**Push to `main`.** The GitHub Action in `.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages, and satordle.org updates in a minute or two. Watch progress in the repo's **Actions** tab.

The only other deploy is the Firestore rules, and only when you change `firestore.rules`:

```bash
npx firebase login       # once per computer
npm run deploy:rules
```

### One-time setup (already done for satordle.org)

1. **Firebase** (project `sator-8b0d8`): Firestore database created; Authentication → Anonymous enabled; web app config pasted into `src/services/firebase-config.js`; `.firebaserc` points at the project.
2. **GitHub:** repo **Settings → Pages → Source: GitHub Actions**, then **Custom domain: `satordle.org`** and **Enforce HTTPS**.
3. **Squarespace DNS** (domains.squarespace.com → satordle.org → DNS): Squarespace defaults removed, plus these custom records:

   | Host | Type | Data |
   |---|---|---|
   | `@` | A | `185.199.108.153` |
   | `@` | A | `185.199.109.153` |
   | `@` | A | `185.199.110.153` |
   | `@` | A | `185.199.111.153` |
   | `www` | CNAME | `abelru.github.io` |

4. **Firebase → Authentication → Settings → Authorized domains:** add `satordle.org` and `www.satordle.org`.

To roll back a bad deploy, `git revert` the commit and push.

---

## Testing the leaderboard locally

You can test without touching the real database:

```bash
npm run emulators     # terminal 1: fake Firestore + Auth on your machine
npm run dev:emu       # terminal 2: game at http://localhost:5173 pointed at the emulators
```

Solve a daily puzzle without hints and add your name. The entry shows up in the emulator UI at http://localhost:4000/firestore. The emulators need Java 11 or newer (`brew install openjdk`).

## Editing puzzles or word lists

The files in `src/data/` were extracted from the original single-file build with:

```bash
node scripts/split-data.mjs legacy/sator-single-file.html
```

Each file is `{ "d": daily puzzles, "u": unlimited puzzles, "w": word list }`, with every entry packed end to end. A 5×5 puzzle is 25 letters read row by row, and each 5-letter word takes 5 characters.

Daily puzzle #1 was **29 Oct 2026** (`LAUNCH_UTC` in `src/time.js`). A new daily starts at local midnight and cycles through the `d` list.
