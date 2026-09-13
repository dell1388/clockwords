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

- **Letter levels.** Grading letters 1–5 Scrabble-fashion, drawing the grade as
  dots under the glyph, and making the level (not the material) set the damage:
  8 / 24 / 60 / 140 / 320. The original's dots meant a flat 5 damage each; the
  steep curve here is a deliberate departure, so a rare letter feels rare.
- **Combining by level.** Two letters of the same level fuse into one of the
  level above, keeping the material, with the resulting letter chosen from that
  level's pool. The original transmuted by material value; this transmutes by
  letter rarity instead.
- **Materials are level-5 only**, are read by colour with no written label, and
  are applied as a *multiplier* on the letter's level damage rather than as a
  flat damage of their own. Aetherium is invented outright to cap the ladder.
- **Chambers unseal one at a time**, starting from one, each time the open
  chambers have been spent through. The original ran all eight from the start.
- **Bug pathing.** The serpentine sweep — across, down a lane, back across, and
  the same route in reverse on the way out — and all the speeds that go with it.
- **Loot tables** weighted by night number and by how tough the bug was.
- **Exact numbers** for the long-word bonus (+15% per letter past four, ×4 cap),
  the repeat penalty (halving, floor 20%), Jade's scaling, Brass's radius, and
  Aetherium's chain.
- **Boiler overload** — the bonus for spending every loaded chamber in one word.
  The Jay Is Games review mentions that using all your special letters unlocks
  extra high-power ammunition; the shape of the bonus is ours.
- **Bug roster.** Spiders and roaches are documented; ticks, the Ironclad Beetle,
  the Cinder Moth, the Copper Centipede, the Steam Weaver and the Diabolical Box
  boss, along with all HP, speeds and armour, are ours.
- **Five pages**, and pages returning when you kill the carrier.
- **The campaign.** Ten handmade levels, then a procedural curve that keeps going,
  with a boss every ten. The original Prelude was roughly this length; Act 1 was
  much longer.
- **The room.** Three arched service doors on the back wall, the perspective, the
  depth scaling, the machine design, and the whole visual and audio treatment.
  Nothing here is traced from the original art.
