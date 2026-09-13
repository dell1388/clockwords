# Clockwords

A web remake of **Clockwords** (gabob — Ben Ruiz & Jeremiah Hollis, 2009), the
Victorian typing-defence game where you turn words into ammunition.

> Something mechanical is in the workshop, and it is after the pages of your
> formula. The engine on your bench turns words into ammunition. Type quickly.
> Type well.

No build step, no dependencies, no binary assets — the art and the sound are
both generated at runtime.

## Play it

```sh
python3 -m http.server 8000      # or: npx http-server -p 8000
# then open http://localhost:8000
```

It must be served over HTTP rather than opened as a `file://` URL, because the
lexicon is fetched and the code is ES modules.

## How it plays

Type any English word and press <kbd>Enter</kbd>. Every letter of the word
becomes one shell, and the cannon in the corner fires them **one every 0.2
seconds** (300 rounds a minute). A word that is not in the lexicon just clears
the rack and says so — no pause, no penalty.

**Every shell finds a target.** If its mark dies in flight the charge picks the
next one; with nothing in the room the breech simply holds until something walks
in.

**Chambers unseal as you use them, and bolt shut again every level.** The boiler
has 8 chambers but each level opens with only **one**. Fire *every letter that was
loaded when the last chamber opened* and exactly one more unseals — letters that
refill in the meantime don't count, so you really do have to clear the board. The boiler will not
load the same letter into two chambers at once unless it has nothing else to
load, and never fills more chambers than it has letters.

Type a character that is sitting in an open chamber and that chamber reads as
drawn down at once — you can see what a word will cost before you fire it. It
then empties and refills from the bag. Any character *not* in a chamber is a
**blank**: a flat 3 damage that no bonus or penalty ever touches.

### One way in, one route across

Everything comes through the single arch still standing on the back wall and
walks the route painted on the floor — across, down a lane, back across — to the
machine in the corner, where it takes a page of the formula and retraces the
whole run to get out. Kill a carrier and the page comes home. Lose all **5
pages** and the night is over.

### Letters have levels

Letters are graded the way Scrabble grades them. The grade is drawn as **dots
under the glyph**, and it is the level that sets the damage.

| Level | Damage | Letters |
|---|---|---|
| ●     | 8   | R A I S E |
| ●●    | 24  | N O G T D L |
| ●●●   | 60  | C B U P M H |
| ●●●●  | 140 | F K V Y W |
| ●●●●● | 320 | Z J X Q |

### The crucible

Bugs only ever drop plain **Iron**. In the boiler room the crucible takes any
**even number of letters of one level** and works through them in pairs:

- **Levels 1–4** → each pair becomes one letter of the level above, same material.
- **Level 5 pairs** → they burn away and leave a **material** behind, seeded on a
  fresh level 1 letter. This is the only way a material is ever made.

The crucible chooses what comes out, not you. A row of level buttons selects
every letter of a grade at once, so a big batch is one click. Level a materialised
letter up and it keeps its material.

Secrets buy a fresh level 1 Iron letter (3 ⚙) and come back from scrapping (1 ⚙).

### Materials are colour, not labels

Nothing on the rack is labelled: you read a material off its colour.

| Material | Damage | Effect |
|---|---|---|
| Iron | ×1.0 | plain shot |
| Thermite | ×0.5 | sets bugs alight, burning for 4 seconds |
| Amethyst | ×0.7 | passes through up to 2 targets |
| Lazurite | ×0.4 | freezes bugs for 4 seconds |
| Brass | ×0.9 | splash, and detonates every Iron letter in the same word |
| Jade | ×0.8 | every letter in the word hits harder, +5% per letter of the word |
| Aetherium | ×1.2 | the charge arcs to 3 nearby bugs |

### Boiler and storage

The boiler runs on between **15 and 50** letters. Everything else lives in
**storage**, out of the mix, until you draw it back — so a deep collection does
not dilute what the chambers pull.

### Other rules that matter

- **Longer words hit harder** (+15% per letter past four, capped at ×4).
- **Repeating a word** halves its power each time you reuse it, down to 20%.
- **Boiler overload** — spend every loaded chamber in one word for a bonus barrage.
- **Word of the day** — one word, the same for everyone, doubles everything and explodes.
- Loot is tabled by night: common letters fall constantly early on, and the rare
  ones only start appearing once you are deep enough — and off tougher bugs.
- Nights are long: the first runs about eighty seconds and twenty-odd bugs, the
  twentieth over two minutes and a hundred and twenty. Each wave starts before
  the last has finished, so the pressure never really lifts.

When the last bug is off the floor the room holds for a beat with **LEVEL
CLEARED** — or **LEVEL FAILED** — across it before the panel comes up.

The boiler room then lists **the night's work**: every word you fired, ranked by
the damage it actually dealt, with the letters that came out of a chamber lit in
their material colour and the blanks left grey. Burn damage is credited back to
the word that started the fire.

### Twenty nights, and a level select

The campaign is twenty levels. **Failing one costs you that night, not the
campaign**: every level you walk into is checkpointed with the run exactly as you
carried it in, so a loss drops you back to the same night with the same boiler.
The level select lists all twenty with your best score on each, and lets you
replay any night you have reached. Jumping to a night you have never entered
builds you a loadout out of that night's loot table.

Progress lives in `localStorage` under `clockwords.progress.v1`.

### Controls

<kbd>A</kbd>–<kbd>Z</kbd> type · <kbd>Enter</kbd> or <kbd>Space</kbd> fire ·
<kbd>Backspace</kbd> delete · <kbd>Esc</kbd> clears the rack, and again to pause.
Hold the **right mouse button** over the room to aim the cannon by hand;
otherwise it picks its own target. The gear in the corner mutes the sound.

On a phone, tapping the room raises the soft keyboard.

## Layout

```
index.html            the page
styles.css            screens, plates, chips
assets/enable1.txt    the lexicon: ENABLE1, filtered to 3–24 letters
src/content.js        materials, bug species, the campaign table
src/boiler.js         inventory, the bag, the 8 chambers, transmuting,
                      and turning a typed word into shots
src/dict.js           lexicon loading, word validation, word of the day
src/game.js           the simulation
src/render.js         all drawing (canvas, procedural)
src/audio.js          all sound (Web Audio, procedural)
src/ui.js             DOM screens: title, how-to, level cards, boiler room
src/achievements.js   the three badges
src/progress.js       levels reached, best scores, per-level checkpoints
src/main.js           bootstrap, loop, input, save/load
```

Progress is kept in `localStorage` (`clockwords.progress.v1`, `clockwords.badges.v1`).

## Credits and licence

Original game by **gabob** — Ben Ruiz and Jeremiah Hollis, 2009. This is an
independent fan remake: no original code, art, or audio was used, and none was
available to use. See [docs/FIDELITY.md](docs/FIDELITY.md) for exactly which
mechanics are documented canon and which are reconstruction.

The lexicon is [ENABLE1](https://github.com/dolph/dictionary), which is in the
public domain.
