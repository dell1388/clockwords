# What is canon, and what is reconstruction

The original *Clockwords* was Flash. There is no playable build and no asset
source to work from, so this remake is rebuilt from contemporary reviews and
walkthroughs. This file records which side of the line each mechanic sits on, so
anyone tuning the game knows what is safe to change.

## Documented in period sources

- Type a word, press Enter, and the cannon fires the letters one at a time.
- Damage follows the letters you use; a plain letter does **1 point**. ¹
- The boiler dispenses letters into **eight chambers**; letters you type that are
  not in a chamber count as **blanks worth 1 damage each**. ²
- Longer words carry a bonus, shown on the rack. ²
- Reusing a word you have already used reduces its effect. ³
- Materials and their effects:
  - **Iron** — 25 damage, no special effect, 1 secret. ²
  - **Thermite** — sets bugs on fire, 20 damage over 4 seconds, 3 secrets. ²
  - **Amethyst** — 15 damage, passes through up to 2 targets, 4 secrets. ²
  - **Lazurite** — freezes bugs, stopping movement for 4 seconds, 5 secrets. ²
  - **Brass** — splash damage; makes the Iron letters in the same word explode. ¹ ³
  - **Jade** — makes all your letters do more damage, scaling with word length. ¹ ²
- **Transmute**: put two letters of the same value into the machine to get a
  stronger one. ⁴
- **Secrets** are the currency, spent between levels in the **boiler room**, where
  you add letters the bugs dropped or transmute what you have. ³ ⁴
- The chambers recycle their letters cyclically, like reshuffling a deck. ²
- Enemies are mechanical **spiders** and **cockroaches** that cross the room to
  **steal your secrets / the pages of your formula**; let them and you lose. ¹ ³
- **Word of the day**: doubled power per letter, with area damage. ⁴
- You can aim the cannon by hand, and queue the next word while one is firing. ³
- Kongregate badge names: *Words Will Never Hurt Me* (5), *Sesquipedalian* (15),
  *Professor Dillingham and the Diabolical Box* (30). ⁵
- Words are ordinary English, no proper nouns — Scrabble-ish. ⁵

Sources: ¹ [WonderHowTo, "Turning Letters into Pesticide"](https://scrabble.wonderhowto.com/news/turning-letters-into-pesticide-killing-mechanical-bugs-clockwords-act-1-0127199/) ·
² the same article's letter table ·
³ [Jay Is Games review](https://jayisgames.com/review/clockwords-prelude.php) ·
⁴ [Kongregate Helper walkthrough](http://kongregatehelper.blogspot.com/2009/10/clockwords-prelude-walkthrough.html) ·
⁵ [Kongregate game page](https://www.kongregate.com/en/games/gabob/clockwords-prelude)

## Reconstructed

Everything below is a judgement call made to sit consistently around the facts
above. Change it freely.

- **Letter levels.** Grading letters 1–5 (R A I S E / N O G T D L / C B U P M H /
  F K V Y W / Z J X Q), drawing the grade as dots under the glyph, and making the
  level (not the material) set the damage: 12 / 36 / 90 / 210 / 500.
  The original's dots meant a flat 5 damage each; the steep curve here is a
  deliberate departure, so a rare letter feels rare.
- **The crucible.** Any even number of letters of one level goes in at once and is
  worked through in pairs: each pair fuses into one of the level above, taking the
  material of whichever went in first, with the letter chosen at random from that
  level's pool. A material paired with plain Iron instead moves across at the same
  level. **The proving floor** — a sandbox of standing dummies with a live damage
  read-out — is ours too. Two level 5s instead yield a material on a fresh level 1
  letter — the only source of materials in the game. The original transmuted by
  material value and let you buy materials with secrets.
- **Materials** are read by colour with no written label, are applied as a
  *multiplier* on the letter's level damage rather than as a flat damage of their
  own, and lend their effect to every letter in the word, stacking with each
  other and scaling with the level of the letter carrying them. Jade's canon
  "makes all your letters do more damage" became an echo volley once every
  material spread word-wide. Aetherium is invented outright.
- **Blanks are flat.** 5 damage, untouched by word length, repeats, Jade or the
  word of the day. The original's 1-damage blank scaled with nothing either, but
  the exact figure is ours.
- **Chambers unseal on a full house**: only a single word that spends every loaded
  chamber opens the next one, and they reseal to one at the top of every level. A
  tank can be clicked to swap its letter. The boiler also refuses to load duplicate
  letters while it has distinct ones left. The original ran all eight from the start.
- **Boiler and storage.** A 15–50 letter working boiler with everything else parked
  in storage is entirely ours, as are the per-letter quotas, the bulk fuse and the
  rack filters; the original had no cap and no such tools.
- **The cannon** sits in a corner, fires one shell per letter at 300 rpm, holds
  its fire when the room is empty, computes a lead on its target with only a gentle
  in-flight trim, and counts damage already in the air so it never wastes a shell
  on a bug that is as good as dead. The original fired faster.
- **Bug pathing.** One open door, and a single painted route: four sweeps across
  the floor, each a lane lower, and the same route in reverse on the way out. The
  lowest lanes stop short of the cannon's corner so nothing is ever overhead.
- **Loot tables** weighted by night number and by how tough the bug was, with the
  dropped letter rising out of the wreck and kept whether the night is won or lost.
- **Score** as a pure tally: half a word's damage plus the square of its length,
  a bounty per bug, and a clear bonus scaled by surviving pages.
- **Exact numbers** for the long-word curve (`(length/3) ^ 1.61`, so double length
  is triple damage), the double for a word with no blanks in it,
  the repeat penalty (halving to a floor of 20%, and reckoned per level rather
  than across the run), Jade's scaling, Brass's radius, and
  Aetherium's chain.
- **Boiler overload** — the bonus for spending every loaded chamber in one word.
  The Jay Is Games review mentions that using all your special letters unlocks
  extra high-power ammunition; the shape of the bonus is ours.
- **Bug roster.** Spiders and roaches are documented; ticks, the Ironclad Beetle,
  the Cinder Moth, the Copper Centipede, the Steam Weaver and the Diabolical Box
  boss, along with all HP, speeds and armour, are ours.
- **Five pages** in a safe in the corner opposite the cannon, returning to it when
  you kill the carrier. The original kept them on the machine itself.
- **The night's work** — the ranked per-word damage ledger in the boiler room.
- **The campaign.** Ten handmade nights, then a procedural curve that keeps going
  indefinitely with a boss on every tenth. One boiler carries the whole run and
  only ever changes in the boiler room; failing a night costs that night only, and
  the letters found during it are kept either way. The original was a fixed set of
  levels with no persistence between attempts.
- **The room.** The bricked-up arches, the perspective, the depth scaling, the
  machine design, and the whole visual and audio treatment. Nothing here is
  traced from the original art.
