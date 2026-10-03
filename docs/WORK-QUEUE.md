# Work queue

Ordered. Take the top unchecked item, do it, tick it, commit. Each item says
what done looks like, so no judgement call has to be re-made.

Rules for whoever picks this up:

- One item per commit, message explaining *why*, not what.
- Verify in a real browser before committing (see `CLAUDE.md`), and run
  `node test/wordcraft.test.mjs`.
- Phases ship whole: the game must be playable and better at the end of every
  item, never mid-refactor.
- Nothing here breaks the campaign or an existing save. Runs are a second
  mode beside it.
- When an item turns out to be wrong once you are inside it, say so in the
  commit and fix the queue rather than forcing it.

## Phase 1 — Wordcraft · done

- [x] Frequency asset, rarity tiers I–V, discovery bonus
- [x] Six structure tricks read off the typed string
- [x] Live read-out on the rack: tier, multiplier, trick chips, validity
- [x] Vintage war-film pass and maximum-spectacle effects
- [x] Overkill carries to the next tank; multiplier stack soft-capped; hulls
      rebalanced around both (wave 1 clears in ~55s at 1 round/second)
- [x] `test/wordcraft.test.mjs` — 37 assertions over tiers, tricks, the curve

## Phase 1.5 — teach it, then feel it

- [ ] **Teach the tricks.** Nothing tells the player a palindrome pierces until
      they happen to type one. Add a one-screen field manual of the six tricks
      reachable from the title and from pause, and a first-time toast the first
      time each trick fires in a run.
      *Done when:* every trick is discoverable without reading the help page.
- [ ] **Make the firing range a vocabulary trainer.** Live fire already shows
      damage; show the tier badge and trick chips for anything typed, with no
      combat pressure, plus a running list of the best words found there.
      *Done when:* a player can learn what the game values in two minutes.
- [ ] **A distinct sound per trick.** Six short, recognisable hits built on the
      existing `report()` family in `audio.js`, so tricks become audible and
      the player stops reading the badge.
      *Done when:* tricks are identifiable with the screen ignored.
- [ ] **Balance pass on waves 5–20.** Only wave 1 has been measured. Drive each
      wave headless with a fixed word list, record clear time, dossiers lost
      and shells fired; tune `scale` and the procedural curve from the numbers.
      *Done when:* a table of clear times per wave lives in this repo and no
      wave is under 30s or over 4 minutes at a competent pace.

## Phase 2 — Runs

Each item is playable on its own. Do them in order; do not start the map
before the RNG exists, or the draft before the map does.

- [x] **`src/rng.js`** — seeded xorshift32 with `int`, `pick`, `weighted`,
      `some`, `shuffle` and `fork`, plus five-character shareable seed strings
      and `dailySeed()` from the UTC date. 24 assertions in
      `test/rng.test.mjs`, including a frozen sample so the generator cannot
      drift silently. `Math.random()` stays for cosmetics only.
- [ ] **`src/run.js`** — run state and nothing else: seed, route, current node,
      drafted mods, doctrines, the run's lexicon, intel. Serialises to
      `wordwar.run.v1`. The campaign never imports it.
      *Done when:* a run can be started, advanced node by node from the console,
      saved, reloaded and resumed.
- [ ] **Route generation** — three acts, four to five columns each, branching
      two or three ways. Node types: skirmish, elite, depot, signals post,
      minefield, command (boss). Weighted by act, guaranteeing at least one
      depot per act and a boss at the end of each.
      *Done when:* 100 generated routes all reachable end to end, no dead ends,
      asserted in a test.
- [ ] **The route map screen** — the one piece of real new art. Field map,
      nodes as map symbols, your path in chinagraph pencil, fog over what you
      have not scouted, the next two or three nodes selectable.
      *Done when:* you can see the whole run and choose your path with a click.
- [ ] **The draft screen** — pick 1 of 3 after each node (1 of 4 after an
      elite). Start with two pools only: gun mods and letter crates.
      *Done when:* a pick visibly changes the next fight.
- [ ] **Gun mods** — six to eight, as data in `content.js` with hooks read in
      `game.js`: autoloader, bore evacuator, proximity fuse, interrupter, wet
      stowage, spaced armour. Each one visible on the tank.
      *Done when:* a late run's gun is readably a wreck of field modifications.
- [ ] **Letter crates** — draft letters and materials straight into the
      magazine: a level-5 Q, three Incendiary Es, a wildcard, a bound pair.
      *Done when:* drafting changes what you can spell next fight.
- [ ] **One act, end to end** — landing to first boss, win and lose states,
      Runs as a second button on the title screen.
      *Done when:* a full act is playable in about ten minutes.
- [ ] **Three acts** — escalation, act bosses, the run summary screen
      (route taken, best word with its tier, words found that had never been
      fired before).
      *Done when:* a run is winnable in 20–30 minutes and the summary is worth
      screenshotting.

## Phase 3 — Doctrines and enemies

- [ ] **Declare the hook points first** — `onWordResolved`, `onWaveStart`,
      `onKill`, `damageMultiplier`. Any doctrine needing a new one is a
      deliberate decision, not a quiet `if` in the damage path.
      *Done when:* the hook list is documented here and doctrines only use it.
- [ ] **Six doctrines** — Economy of Force, Shock Doctrine, Lexical Discipline,
      Scorched Earth, Dead Languages, Signal Discipline (see `ROADMAP.md`).
      They stack.
      *Done when:* two runs under different doctrines demand different words.
- [ ] **Lock-and-key enemies** — Jammer, Censor, Veteran, Mirror, Dragon's
      Teeth, Zeppelin, Commissar. Each one a rule the player answers with a
      word, not with more damage.
      *Done when:* a wave reads as a puzzle rather than a damage check.
- [ ] **Three act bosses** — the Iron Colonel (hardens, so rising tiers are the
      answer), the Cipher (takes damage only from words matching a pattern),
      the Censor General (removes a letter from your alphabet every 30s).
      *Done when:* each boss is beaten by changing how you type.
- [ ] **Signals posts** — short typed puzzles between fights: decode an
      anagram, supply a word containing a sequence, beat a target rarity.
      *Done when:* the node type exists and can be funny.

## Phase 4 — The long war

- [ ] **The personal lexicon** — every word ever fired, with when and for how
      much. Cross-run repeat decay, and a record worth looking at: words found,
      longest, rarest, best ever. Cheap to build and the most personal thing in
      the game; pull it earlier if it keeps getting deferred.
- [ ] **War effort** — intel banked from runs (kept on a loss) buys permanent
      upgrades at a base screen: starting loadout, an extra draft option, a
      reroll per act, a higher magazine ceiling, a second mod slot. The answer
      to the flat economy.
- [ ] **Unlock pool** — materials, mods, doctrines, enemies and node types
      enter the draft as milestones are met, and the milestones are vocabulary
      goals: fire a tier-5 word, three tricks in one wave, clear an act under
      Lexical Discipline.
- [ ] **Daily front** — one seed a day from the date, same route and drafts for
      everyone, a shareable result string. No server: scores stay local.

## Debt, whenever there is a gap

- [ ] Internal names still say `bugs`, `drawBug`, `bugStep`, `boiler.js` for
      what are now tanks and a magazine. Rename in one mechanical commit, no
      behaviour change, saves untouched.
- [ ] `render.js` is past 1,300 lines. Split the battlefield, the HUD and the
      sprite library once Phase 2 adds the map screen to it.
- [ ] Pin the provenance of `assets/freq20k.txt` properly (source, licence,
      the filter script) if this is ever published anywhere public.
- [ ] A screenshot test: drive the game to five known states and keep the
      images, so a rendering regression is visible rather than discovered.
