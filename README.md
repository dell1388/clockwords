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

**The cannon leads its target** — it solves for where the bug will be, and the
shell trims that lead gently in flight. It can't turn sharply enough to circle,
so a shell that really misses is gone. It also counts the damage already in the
air and won't spend a shell on a bug that is as good as dead, so the breech holds
rather than waste one. In practice around 98–100% of shells connect.

**Chambers unseal on a full house.** The boiler has 8 but each level opens with
only **one**. A chamber unseals only when *a single word spends every chamber
that is loaded* — the same full house that earns a boiler overload. Draining them
across several words does nothing. Stuck with a letter you can't use? **Click the
tank** to tip it back into the bag and draw another. The boiler won't load the
same letter into two chambers at once unless it has nothing else, and never fills
more chambers than it has letters.

Type a character that is sitting in an open chamber and that chamber reads as
drawn down at once — you can see what a word will cost before you fire it. It
then empties and refills from the bag. Any character *not* in a chamber is a
**blank**: a flat 5 damage that no bonus or penalty ever touches.

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
| ●     | 12  | R A I S E |
| ●●    | 36  | N O G T D L |
| ●●●   | 90  | C B U P M H |
| ●●●●  | 210 | F K V Y W |
| ●●●●● | 500 | Z J X Q |

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

A material lends its effect to **every letter in the word it is fired with** —
blanks included — and different materials **stack**. One Lazurite and one
Thermite and the whole word freezes *and* burns. Each letter still does its own
damage.

The **level of the letter carrying a material** sets how hard the effect works,
the way it sets damage — the figures below are level 1 → level 5.

| Material | Damage | Effect (spreads to the whole word) |
|---|---|---|
| Iron | ×1.0 | plain shot |
| Thermite | ×0.5 | sets bugs alight for 4 seconds, burning for 80% → 208% of the word's best letter |
| Amethyst | ×0.7 | passes through 2 → 6 targets |
| Lazurite | ×0.4 | freezes bugs for 4 → 9 seconds |
| Brass | ×0.9 | splash damage, radius ×1.0 → ×1.4 |
| Jade | ×0.8 | the whole word is fired again, at 70% → 100% damage |
| Aetherium | ×1.2 | the charge arcs to 3 → 7 nearby bugs |

The boiler room is a screen in its own right, with a **Boiler room** button on
the title screen, on the level select, and on the card in front of every night.
Anything you change there is saved straight away, and Esc backs out.

### Boiler and storage

The boiler runs on between **15 and 50** letters. **Everything new lands in
storage** — letters the bugs drop, anything out of the crucible, anything you
stoke — so the boiler only ever holds what you put there and a deep collection
never dilutes what the chambers pull.

Set a **quota** per letter and it looks after itself: the number is drawn out of
storage, and anything above it is sent back down. **∞** leaves a letter alone;
**0** keeps it out of the boiler entirely, swapping in something wanted so the
15-letter minimum still holds. **Tidy** applies the quotas in one click, **Fuse
extras** pairs off everything in storage and over quota, and the rack filters by
level and material.

### Other rules that matter

- **Length pays steeply**: damage scales as `(length / 3) ^ 1.61`, so twice the
  length is three times the damage and three times the length about six.
- **A pure word** — every letter out of a chamber, no blanks at all — does **double**.
- **Repeating a word** halves its power each time you reuse it *within the same
  level*, down to 20%. Every level starts the ledger again.
- **Boiler overload** — spend every loaded chamber in one word for a bonus barrage.
- **Word of the day** — one word, the same for everyone, doubles everything and explodes.
- Loot is tabled by night: common letters fall constantly early on, and the rare
  ones only start appearing once you are deep enough — and off tougher bugs.
- Nights are long: the first runs about eighty seconds and twenty-odd bugs, the
  twentieth over two minutes and a hundred and twenty. Each wave starts before
  the last has finished, so the pressure never really lifts.

When the last bug is off the floor the room holds for a beat with **LEVEL
CLEARED** — or **LEVEL FAILED** — across it before the panel comes up.

Both end-of-level screens — the boiler room and the defeat panel — then show
**the night in figures** (that level only: score, kills, words, damage, chamber
letters against blanks, hardest and longest word, pages, secrets, time) beside
**the night's work**: every word you fired, ranked by the damage it actually
dealt, with the letters that came out of a chamber lit in their material colour
and the blanks left grey. Burn damage is credited back to the word that started
the fire.

### Twenty nights, and a level select

The campaign is twenty levels. **One boiler carries the whole run** — it belongs
to the run, not to any level, so whichever night you pick you take the same
letters in, and they only ever change in the boiler room. Letters the bugs drop
during a night are only added when you reach the boiler room, so a night you fail
changes nothing.

**Failing a level costs you that night, not the campaign.** The level select
lists all twenty with your best score on each, and lets you replay any night you
have reached.

Progress lives in `localStorage` under `clockwords.progress.v1`.

### Sound

Everything is synthesised at runtime: a typewriter clack per keystroke, a small
pop per shell out of the barrel, a wet crunch when a bug comes apart, a soft ding
for a fresh word that actually spent the boiler, and a quiet buzzer for one you
have already used tonight. The speaker in the corner mutes it during play; the
title screen has a Sound toggle.

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
