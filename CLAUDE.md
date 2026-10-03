# Word War 3 — working notes

A typing-defence game. Type a word, every letter becomes a shell, the gun
fires them at an armoured column crossing the room. Vocabulary is the skill:
how rare a word is and what shape it has both change what it does.

Branch: **main**. Work directly on it, commit, push.

## Run it

```sh
python3 -m http.server 8099      # must be served; ES modules + fetched assets
# then http://localhost:8099
```

## Check it

```sh
node test/wordcraft.test.mjs     # pure logic: tiers, tricks, the multiplier curve
```

Everything else is verified by driving the real game in a real browser with
Playwright (installed at `/opt/node22/lib/node_modules/playwright`, Chromium
pre-installed — never run `playwright install`). The pattern used throughout:

```js
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e.message));
await p.addInitScript(() => localStorage.clear());
await p.goto('http://localhost:8099/');
await p.waitForFunction(() => document.querySelector('#title.on'));
// window.CLOCKWORDS = { game, state, sfx } is exposed for tests
```

Scratch test scripts live in the scratchpad, not the repo. Always check
`pageerror` — a thrown module error leaves a black screen and nothing else.

## Publish

```sh
./build-artifact.sh              # inlines styles.css into build/page.html
```

Then publish `build/page.html` with the Artifact tool, passing every changed
`src/*.js` and any new asset in `files`. The artifact is
<https://claude.ai/artifact/U4nHmqTKR4G3Fg94yftnzg> — republish it, never
create a second one. A "not what you last saw" refusal on a file this project
published itself is the service's own copy: confirm with
`git show HEAD~1:<file> | sha256sum` before overwriting.

## Where things are

| File | Holds |
| --- | --- |
| `src/content.js` | All data and tuning: materials, species, levels, loot, every balance constant |
| `src/wordcraft.js` | Rarity tiers and structure tricks. **Pure** — keep it that way, it is the only tested file |
| `src/boiler.js` | The letter economy: inventory, bag, chambers, foundry, and `resolve()` which turns a word into shots |
| `src/game.js` | The simulation. Pure state + `update(dt)`; no drawing |
| `src/render.js` | All drawing. Battlefield to an offscreen frame, then the film pass, then the HUD |
| `src/film.js` | The vintage-film projector: grading, weave, grain, scratches, halation, the academy leader |
| `src/ui.js` | DOM screens (title, how-to, armoury, after-action, pause) |
| `src/main.js` | Flow, input, the loop, saves |
| `assets/enable1.txt` | 172,722-word lexicon |
| `assets/freq20k.txt` | 20,972 words in frequency order — what makes a word rare |

## House rules

- **No build step, no dependencies, no binary assets.** Art and sound are
  generated at runtime. Keep it that way.
- Saves are `clockwords.progress.v1` and `clockwords.badges.v1`. Material ids
  (`iron`, `jade`…) are serialised — rename the display name, never the id.
- Panels never scroll. `fitPlates()` in `ui.js` scales a panel to the window;
  the only scrolling element in the game is `.wl`, the after-action word list.
- The HUD is drawn after the film pass and stays crisp. Atmosphere never goes
  on top of something the player has to read.
- Comments explain *why*, in plain prose. Match the surrounding voice.

## What to do next

`docs/WORK-QUEUE.md` — an ordered queue with acceptance criteria. Take the top
unchecked item, do it, tick it, commit. `docs/ROADMAP.md` holds the longer
design plan behind it.
