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

Type any English word and press <kbd>Enter</kbd>. Every letter of the word is
fired at the bugs, one after another. A word that is not in the lexicon just
clears the rack and says so — no pause, no penalty.

**Chambers unseal as you use them.** The boiler has 8 chambers but starts with
only **one** open. Spend everything the open chambers hold and the next one
unseals, so the engine widens under you as the night goes on.

If a character you type is sitting in an open chamber, that chamber fires and
then empties and refills from the bag. Any character *not* in a chamber is a
**blank** worth 1 damage. So the game is not "type fast", it is "type the word
that spends your boiler well".

### Letters have levels

Letters are graded the way Scrabble grades them, and the grade is drawn as
**dots under the glyph**. The level is what sets the damage — a rare letter is
worth a great many common ones.

| Level | Damage | Letters |
|---|---|---|
| ●     | 8   | A E I O U L N S T R |
| ●●    | 24  | D G |
| ●●●   | 60  | B C M P |
| ●●●●  | 140 | F H V W Y |
| ●●●●● | 320 | K J X Q Z |

Bugs only ever drop plain **Iron**. In the boiler room you **combine** two
letters of the same level into one letter of the level above — same material,
and you choose which letter of that level you get. A letter has to reach level 5
before it is rare enough to be **refitted** with a material, which costs secrets.

### Materials are colour, not labels

Nothing on the rack is labelled: you read a material off its colour.

| Material | Cost | Damage | Effect |
|---|---|---|---|
| Iron | — | ×1.0 | plain shot |
| Thermite | 6 | ×0.5 | sets bugs alight, burning for 4 seconds |
| Amethyst | 8 | ×0.7 | passes through up to 2 targets |
| Lazurite | 10 | ×0.4 | freezes bugs for 4 seconds |
| Brass | 12 | ×0.9 | splash, and detonates every Iron letter in the same word |
| Jade | 15 | ×0.8 | every letter in the word hits harder, +5% per letter of the word |
| Aetherium | 20 | ×1.2 | the charge arcs to 3 nearby bugs |

### Other rules that matter

- **Longer words hit harder** (+15% per letter past four, capped at ×4).
- **Repeating a word** halves its power each time you reuse it, down to 20%.
- **Boiler overload** — spend every loaded chamber in one word for a bonus barrage.
- **Word of the day** — one word, the same for everyone, doubles everything and explodes.
- Bugs sweep the room in lanes — across, down, back across — reach the machine,
  take a page of the formula and retrace the whole route to get out. Kill the
  carrier and the page comes home. Lose all **5 pages** and the night is over.
- Loot is tabled by night: common letters fall constantly early on, and the rare
  ones only start appearing once you are deep enough — and off tougher bugs.

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
src/main.js           bootstrap, loop, input, save/load
```

Progress is kept in `localStorage` (`clockwords.save.v1`, `clockwords.badges.v1`).

## Credits and licence

Original game by **gabob** — Ben Ruiz and Jeremiah Hollis, 2009. This is an
independent fan remake: no original code, art, or audio was used, and none was
available to use. See [docs/FIDELITY.md](docs/FIDELITY.md) for exactly which
mechanics are documented canon and which are reconstruction.

The lexicon is [ENABLE1](https://github.com/dolph/dictionary), which is in the
public domain.
