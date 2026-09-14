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

The crucible chooses *which letter* comes out, not you — but of each pair, the
**first letter you picked** sets the material. Pair a material with plain **Iron**
and the material simply moves across to a fresh letter of the *same* level, so a
material can be carried without levelling it up. A row of level buttons selects
every letter of a grade at once, so a big batch is one click. Level a materialised
letter up and it keeps its material.

Secrets buy a fresh level 1 Iron letter (3 ⚙) and come back from scrapping (1 ⚙).

### Materials are colour, not labels

Nothing on the rack is labelled: you read a material off its colour.

A material lends its effect to **every letter in the word it is fired with** —
blanks included — and different materials **stack**. One Lazurite and one
Thermite and the whole word freezes *and* burns.

Both the damage and the effect come from the **level of the letter carrying the
material**. The top figure is what one such letter hits for before any word
bonus; the line under it is the effect it lends the whole word.

| | ● (12) | ●● (36) | ●●● (90) | ●●●● (210) | ●●●●● (500) |
|---|---|---|---|---|---|
| **Iron** ×1.0 | 12 | 36 | 90 | 210 | 500 |
| **Thermite** ×0.5 | 6<br>burn 80% | 18<br>burn 112% | 45<br>burn 144% | 105<br>burn 176% | 250<br>burn 208% |
| **Amethyst** ×0.7 | 8<br>pierce 2 | 25<br>pierce 3 | 63<br>pierce 4 | 147<br>pierce 5 | 350<br>pierce 6 |
| **Lazurite** ×0.4 | 5<br>freeze 4s | 14<br>freeze 5.6s | 36<br>freeze 7.2s | 84<br>freeze 8.8s | 200<br>freeze 9s |
| **Brass** ×0.9 | 11<br>splash 68px | 32<br>splash 75px | 81<br>splash 82px | 189<br>splash 88px | 450<br>splash 95px |
| **Jade** ×0.8 | 10<br>echo 70% | 29<br>echo 77% | 72<br>echo 85% | 168<br>echo 93% | 400<br>echo 100% |
| **Aetherium** ×1.2 | 14<br>3 arcs · 140px | 43<br>5 arcs · 157px | 108<br>6 arcs · 174px | 252<br>8 arcs · 190px | 600<br>9 arcs · 207px |

**Freeze** is how long a bug stands still, capped at 9 seconds. **Pierce** is how
many bugs a shell passes through. **Splash** is the blast radius. **Arcs** is how
many further bugs the charge jumps to, and over what distance. **Burn** is the
total fire damage over 4 seconds as a percentage of the hardest letter in the
word. **Echo** is the damage Jade's repeated volley does.

Under the hood the effect strength is `1 + (level − 1) × 0.4`, so a level 5
letter works its material 2.6× as hard as a level 1 one.

### Boiler and storage

The boiler runs on between **15 and 50** letters. **Everything new lands in
storage** — letters the bugs drop, anything out of the crucible, anything you
stoke — so the boiler only ever holds what you put there and a deep collection
never dilutes what the chambers pull.

The quota view lists **all 26 letters**, so you can set one for a letter you do
not hold yet. Set a **quota** per letter and it looks after itself: the number is drawn out of
storage, and anything above it is sent back down. **∞** leaves a letter alone;
**0** keeps it out of the boiler entirely, swapping in something wanted so the
15-letter minimum still holds. **Tidy** applies the quotas in one click, **Fuse
extras** sweeps up the plain **Iron** in storage and over quota and pairs it off
level by level — letters carrying a material are never swept up — and the rack
filters by level and material.

### Other rules that matter

- **Length pays steeply**: damage scales as `(length / 3) ^ 1.61`, so twice the
  length is three times the damage and three times the length about six.
- **A pure word** — every letter out of a chamber, no blanks at all — does **double**.
- **Repeating a word** halves its power each time you reuse it *within the same
  level*, down to 20%. Every level starts the ledger again.
- **Boiler overload** — spend every loaded chamber in one word for a bonus barrage.
- **Word of the day** — one word, the same for everyone, doubles everything and explodes.
- Loot is tabled by night: common letters fall constantly early on, and the rare
  ones only start appearing once you are deep enough — and off tougher bugs. A
  dropped letter lifts out of the wreck with a sparkle that gets busier the rarer
  it is, and **the letters are yours whether you clear the night or lose it**.

### The proving floor

**Test drive**, from the title screen or the boiler room, puts you in a room of
standing dummies with every chamber open and nothing that can reach you. Type
anything and the damage each word actually deals is listed as it lands — the
place to find out what a material really does before you spend a night on it.
Esc leaves.

### Score

Score is a tally, not a currency — it buys nothing, and your best on each night
is kept. Per word you earn **half the damage it deals plus the
square of its length**; per bug, **10 to 260** depending on what it was; per
night cleared, **250 plus 100 for every page still on the rack**. It rewards
long, well-spent words and a clean defence rather than time on the floor.
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

### The nights keep coming

Ten nights are written by hand, and every night after that is generated from the
same curve — more bugs, faster, tougher, with a boss on every tenth. There is no
end to reach and no level select: you play the next night, and the one after that.
**Failing a night costs you that night, not the run** — the boiler is untouched
and the letters you found are still yours, so you start the same night again.

### Boiler and storage

The boiler runs on between **15 and 50** letters. **Everything new lands in
storage** — letters the bugs drop, anything out of the crucible, anything you
stoke — so the boiler only ever holds what you put there and a deep collection
never dilutes what the chambers pull.

The quota view lists **all 26 letters**, so you can set one for a letter you do
not hold yet. Set a **quota** per letter and it looks after itself: the number is drawn out of
storage, and anything above it is sent back down. **∞** leaves a letter alone;
**0** keeps it out of the boiler entirely, swapping in something wanted so the
15-letter minimum still holds. **Tidy** applies the quotas in one click, **Fuse
extras** sweeps up the plain **Iron** in storage and over quota and pairs it off
level by level — letters carrying a material are never swept up — and the rack
filters by level and material.

### Other rules that matter

- **Length pays steeply**: damage scales as `(length / 3) ^ 1.61`, so twice the
  length is three times the damage and three times the length about six.
- **A pure word** — every letter out of a chamber, no blanks at all — does **double**.
- **Repeating a word** halves its power each time you reuse it *within the same
  level*, down to 20%. Every level starts the ledger again.
- **Boiler overload** — spend every loaded chamber in one word for a bonus barrage.
- **Word of the day** — one word, the same for everyone, doubles everything and explodes.
- Loot is tabled by night: common letters fall constantly early on, and the rare
  ones only start appearing once you are deep enough — and off tougher bugs. A
  dropped letter lifts out of the wreck with a sparkle that gets busier the rarer
  it is, and **the letters are yours whether you clear the night or lose it**.

### The proving floor

**Test drive**, from the title screen or the boiler room, puts you in a room of
standing dummies with every chamber open and nothing that can reach you. Type
anything and the damage each word actually deals is listed as it lands — the
place to find out what a material really does before you spend a night on it.
Esc leaves.

### Score

Score is a tally, not a currency — it buys nothing, and your best on each night
is kept. Per word you earn **half the damage it deals plus the
square of its length**; per bug, **10 to 260** depending on what it was; per
night cleared, **250 plus 100 for every page still on the rack**. It rewards
long, well-spent words and a clean defence rather than time on the floor.
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

**One boiler carries the whole run** — it belongs to the run, not to any night,
so you take the same letters into whatever comes next, and they only ever change
in the boiler room.

Progress lives in `localStorage` under `clockwords.progress.v1`.

### Sound

Everything is synthesised at runtime: a typewriter clack per keystroke, a small
pop per shell out of the barrel, a wet crunch when a bug comes apart, a soft ding
for a fresh word that actually spent the boiler, and a quiet buzzer for one you
have already used tonight. The speaker in the corner mutes it during play; the
title screen has a Sound toggle.

### Controls

<kbd>A</kbd>–<kbd>Z</kbd> type · <kbd>Enter</kbd> or <kbd>Space</kbd> fire ·
<kbd>Backspace</kbd> delete · <kbd>Delete</kbd> clears the rack · <kbd>Esc</kbd>
pauses, with the night's figures and Resume / Restart / Levels / Main menu.
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
