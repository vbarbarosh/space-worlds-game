# Sound: what the game plays, and what each world asks of it

Every sound World Explorer plays, as the code stands (2026-10-22, the
explosions recorded): the mix, each sound effect, the steady sounds of flight, the
music, and each world's character, so new sounds can be made for it by a
sound designer, by hand or by a tool, and checked against what it replaces.

Two kinds of sound go through one mix. The three explosions and your
ship's engine play recordings (`src/sounds/`, MP3 packed into the page, their sources and
licences in its README); everything else is made in code as it plays, with
the browser's Web Audio. No sound file ships beside the page. The code is in `src/js/audio.js` (the mix, `tone()`,
`noise()`, the flight's steady sounds), `src/js/music.js` (`sfx()`, the calm
themes), `src/js/music_drive.js` (the arcade's and the flagship's music) and
`src/js/sfx/`, one file per effect. `bin/sound-render` records the game's own
output as it plays, and the dev page's Sounds tab (`build/dev.html`) plays any
effect on demand.

`bin/sound-pack --label=my-pack` generates separate stereo 48 kHz WAV masters
with MP3 and Ogg Vorbis copies in `data/sound/my-pack/`. It needs ffmpeg and Playwright's
Chromium (`npx playwright install chromium`). A label must be new; existing
packs are never overwritten. Open `playlist.m3u` to listen or `README.md` to
choose an asset. `manifest.json` records durations, levels, tempos, loop frame
counts, aliases and checksums. The generator rejects silent, non-finite or
clipped PCM and verifies that every MP3 and Ogg decodes. WAV preserves the
exact loop frame count; MP3 copies are for listening and sharing.

The pack has 96 assets (the effects that play recordings are left out; the
three blasts it makes its own way): the named effects below but the recorded ones, six alternate explosion
takes, 32 full music loops (calm, campaign combat, arcade and boss for each
world), eight boss-arrival stingers, 19 flight stems (the engines are recordings, not in it) and four listening demos.
It uses the existing scores and effect recipes with full-band noise, and new
non-resonant explosion bodies. It is locally synthesized, not recordings or
newly composed music. The six reference recordings mentioned below are not
included in the repository and were not used for the synthesis.

Music loops last one complete 256-eighth cycle; two preceding chords supply
their reverb tails. Loops run seamlessly from end to start (a music loop begins
with its own ending's tails; a flight stem's end is blended into its start), and
`manifest.json`'s `seam` measures the join. Flight stems preserve their
relative levels with a shared gain; other assets are peak normalized, so
integration must balance them against the game's buses. `air-idle` is turning
without thrust; straight idle air is silent. Shelter and ducking remain mixer
gain changes. The demos cover chained explosions, kill plus a ship blast,
rapid shots with impacts, and the settings test mix.

Generation does not change the game. In particular, the chain demo plays
every blast, while the game's current cooldowns still drop closely spaced
calls. Events described as silent below do not acquire sounds in this pack.

## What the author has said so far

The sound was reworked on 2026-10-21; this is what the author heard and said,
so a new sound does not walk back into it:

- **The music:** all the themes "sound alike, sad, quiet, calm; for the arcade
  they don't fit at all". The arcade now plays a driving version of each
  world's theme.
- **The boss:** it should bring "more movement and energy at once". A flagship
  in reach now turns the music into a piece of its own at once. Its first
  version stacked the boss's layers over the world's tune, and the author
  heard "two musics playing together".
- **Shots and boosts:** "sound like a cheap Tetris" (square and triangle beeps,
  a major chord on the turbo). They were remade with noise and falling zaps;
  the turbo once more after "the turbo's sound is not great".
- **Explosions:** "not heard at all" (no explosion made a sound). Then, in
  turn: "as if someone hit a tin can" (ringing high bands, buzzing tones);
  several at once "op, nothing at all" where they should go "pa-pa-pa-pam,
  fuller"; then six recorded explosions sent as examples ("everything so far
  was bad"). The explosions fitted to them by measurement were "terrible,
  just terrible", and the two last explosion changes were reverted
  (`cde0869`). The ones left were "a barrel struck, not an explosion"
  (2026-10-22). Four sets of real recordings were then played in the game
  side by side: the author's own examples were "good", the heavy, deep set
  had "something cool" for a world, Kenney's Sci-Fi Sounds were "not liked
  at all". **The explosions are recordings since:** the author's examples
  in every world, the heavy, deep set in Obsidian and Eclipse. Once in,
  they were "too loud" and the blast "more like a shot"; the author asked
  for softer ones, "like Warzone's" (2026-10-22 12:43). Every sound was then
  put on one loudness ladder (below, The ladder): the explosions 4 to 7 dB
  down and softened (the crack's edge filtered off, the start eased), the
  small and the ship's blast from the longer, swelling takes of the author's
  examples. A steep filter at 900 Hz made them sound "under water" (13:03);
  it is a gentle one from 3 kHz now. The same message: the ship's engine
  "a little lower"; it is 4 dB down.
- **16:42, the author:** flying the Bastion Gunship: "this ship differs in
  sound from all the others, and all the others sound as they did before,
  alike". Measured in the game: the Gunship's recording alone had a whistle
  at 4 kHz, 30 dB over the rest, and hiss above 2 kHz; the five others are
  smooth hums, and three of them (Courier, Interceptor, Prospector) sat
  within 70 Hz of one another, so they told apart poorly. Now: the Gunship a
  heavy, deep engine loop of the Courier's family (`engine_gunship.mp3`,
  Freesound 681975), the whistle gone; and each ship its own pitch
  (`engine_rate`): the Interceptor's loop played ×1.3, a fighter, higher and
  faster; the Prospector's ×0.85, heavier and slower. Six engines, six
  centres from 100 Hz to 700 Hz (The steady sounds of flight).
- **15:56, the author:** the Viper Interceptor's engine "not a spaceship's;
  something else": a hover engine recording with a tone at 1.3 kHz, 41 dB
  over the rest (a fan). It is a space fighter's engine now
  (`engine_interceptor.mp3`, Freesound 641194): low, no tone standing out,
  the same level. The Mule Prospector, the Bastion Gunship and the Aurora
  Cruiser keep theirs until the author says otherwise: a reactor, a
  spacecraft engine and a plasma engine hum low, with no such whine.
- **15:48, the author:** the Kestrel Courier's engine "works just like a
  vacuum cleaner": its recording had a whine at 1 kHz (its loudest tone
  31 dB over the rest). It is a smooth engine loop now (`engine_courier.mp3`,
  Freesound 681976), its sound centred at 250 Hz, no tone over the rest by
  more than 14 dB; the five other engines were measured the same way and
  have no such whine (The steady sounds of flight).
- **20:07, the author:** the sound track of a Freelancer gameplay video
  (YouTube xo4lt_-oUgk, 33 min, in the message's files): "at about 20:48
  the shots are heard; make ours roughly like those. Look through the file,
  no hurry: how the effects are made there, the shots, the explosions,
  maybe more, how a missile flies; in that style ours should be." Measured
  (`scratchpad/tools/streaks.py`: a 5 ms spectrogram with the bed
  subtracted, the bursts over it): at 20:44–20:52 a gun fires 8 shots a
  second, each a 30 ms streak of air whose centre falls from 6.3 kHz to
  4.9 kHz, only 5 to 8 dB over the engine bed; at 21:29–21:39 a second gun,
  6 a second, 45 ms, round 2.5 kHz, barely falling. The explosions heard in
  the fight (21:31, 21:36) are low: half to two thirds of their energy
  under 125 Hz, over a second to fade. No missile's flight found yet in the
  minutes measured. So `shot` and `enemy_plasma` are streaks of air now
  (Your weapons, Raiders), no thump, no zap; the explosions wait on the
  author's word on the five takes.
- **19:17, the author:** "the explosions need work too: the explosion
  should be a bit more muffled; now it is somehow sharp. Make several takes
  and put a different one on each object; I will say which were good and
  which not." And: "with the sounds the game became more interesting, more
  exciting, more movement, more life; though they are strange still, as if
  from another game." So each thing that explodes has a take of its own
  now, all muffled alike (Explosions): a small blast, a light raider, a
  heavy raider, a flagship's last, a rock; the mine keeps the one the
  author chose for barrels. Each on its rung of the ladder.
- **19:12, the author:** the pulse (Space) "is very strange. A pulse is
  something spreading out: as after an explosion a wave spreads, here too
  a wave should spread. Try another take." Its sound was an impact: loud
  at once, then a decay. It is a wave now (`pulse.mp3`, Freesound 745443,
  a cinematic whoosh): it swells for 0.6 s, the time the ring takes to
  reach its 480 m, brightens at its peak and washes away over 1.5 s; the
  music dips for 1.6 s. At −19 dBFS, as before.
- **15:45, the author:** the pulse (Space) "cuts the ear; the earlier one
  was softer". The electromagnetic pulse recording was a buzz centred in
  125 to 500 Hz at −16 dBFS, the loudest rung. It is a low, swelling impact
  now (`pulse.mp3`, Freesound 812744), softened like the explosions, at
  −19 dBFS, 3 dB down.
- **13:53, the author:** the sounds "already better"; "I don't know what the
  questions were or what to answer: better that you decide, and I'll comment
  from the game; on the page they sound different from in the game". So the
  flagships' sounds were chosen without asking (The steady sounds of
  flight), and no reply asks a question that a decision can take.
- **13:38, the author:** "already better". The pulse's sound (Space) "I
  don't like; try another": it is a recording now. Rocks and ships "explode
  with one sound; better different ones: different ships different sounds,
  rocks their own"; the explosion of the time "suits rocks or barrels", and
  the mines ("flying barrels") could have the old barrel-like blast: so a
  rock breaking, a mine, a light ship, a heavy ship and a flagship each
  have a sound of their own now (Explosions below).
- **Next, from the author (2026-10-22):** each ship and each flagship sounds
  of its own, and a direction that makes all the sounds fit together. Of
  two recorded engines for each ship the first ones (small motors) were
  "strange"; the second ones are each ship's engine since.
- The author's six examples are in their message of 2026-10-21 22:00
  (`agentdir/messages/20261021_215000-me/files/`): a sci-fi explosion, a
  medium one, debris breaking, a big one, a cartoon one, a missile's. Measured
  (the share of energy by octave in the first 0.25 s, and how fast they fade):
  about half their energy at 63 Hz, a few % over 2 kHz, swelling for 0.06 to
  0.5 s, 20 dB down in 0.5 to 1.6 s and 40 dB in 0.9 to 2.5 s.

## The direction: how every sound fits together

The author's call, 2026-10-22: every sound should belong to one game, and
each ship and each flagship should sound like itself. What each new sound
follows:

- **Recorded, not made in code,** for every sound heard as an event: a
  blast, a shot, a hit, an engine. Two rounds of explosions made in code
  were rejected ("a tin can", "a barrel struck"), and fitting them to the
  author's examples by numbers was "terrible". Code stays for what follows
  the game live: the music and the steady hums of flight.
- **The author's examples set the weight:** low and full (most of the
  energy under 125 Hz), a hard start, a tail of half a second to two; no
  pitched ring (the barrel, the tin can), no beeps (the "cheap Tetris").
- **Size is heard:** the bigger, the lower, longer and louder. A small one
  may be a big one's recording played faster (a small blast is a ship's
  at ×1.35).
- **Each world a family of its own,** chosen from its look (below, The
  worlds): Haven clean and light, Verdant wet and organic, Dustfall grit
  and sand, Ion Reach crackle and thunder, Obsidian heavy iron, Cryosphere
  ice and glass, Nova Forge fire, Eclipse the deep void. Explosions so far:
  the author's examples in every world, the heavy, deep set in Obsidian and
  Eclipse.
- **Each ship its own voice:** your six ships (Wisp Scout, Kestrel Courier,
  Viper Interceptor, Mule Prospector, Bastion Gunship, Aurora Cruiser) an
  engine and a gun each; each kind of raider its engine and its death by
  its size; each flagship its presence as it nears, its attacks, its turn
  to a second phase and its end.
- **One mix for all:** a recording goes through the same buses, panning,
  distance and limiter as a sound made in code (`sample()` in
  `src/js/audio.js`). Shots sit under hits, hits under explosions.
- **How one gets in:** recordings found with a licence that allows a game
  (CC0, or Pixabay's), played in the game itself beside what they replace,
  all levelled alike, on one listening page; the author picks by ear; only
  then into the game, with its source in `src/sounds/README.md`.

## The ladder: how loud each sound is against the others

Measured as the game plays it, at full volume, in the middle, through the
mix: the loudest 300 ms of the sound (RMS, dBFS), as `bin/sound-render
effects` records it (measured 2026-10-22). A new sound is set on its rung,
not louder; to make one louder, change its rung here first.

| Rung | dBFS | Sounds |
|---|---|---|
| 1, under everything | −38 to −34 | your shot (−39 since it is a 35 ms streak: a sound that short reads low in 300 ms, so it is set by its peak, −18.6 dB, as the zap it replaced), its hit on a raider (`impact`, −37.5) |
| 2, the raiders' guns | −33 to −29 | plasma, ion, scatter, rail, beam, missiles; your missile; a countdown beep, a gravity warning, a pickup (−31) |
| 3, things that happen to you | −30 to −26 | a flagship's own sound at 300 m (about −30, rising as it closes), a hit on you (−26.8), a rock broken (`mine`, −29), a race ring, an upgrade, a storm, a flare, the win chime |
| 4, a small blast and its kin | −24 to −21 | a small blast (−23.8), a rock breaking (−21.6), a mine going off (−22), a raider's `kill` (−22.6 alone, played at 0.55 under its blast), the turbo (−23.6) |
| 5, a ship's blast | −18, a heavy one −16 | a raider dying (−17.7); a bulwark, a tank or a carrier (−16.3) |
| 6, the loudest | −19 to −13 | a portal (−18.7), your pulse (−19), a flagship's last blast (−12.8) |

Before the ladder (2026-10-22 12:38) a ship's blast was at −10.7 and a
flagship's last at −9.6, 23 dB over a shot, and the author found them too
loud. A fight's average level came down 2 dB with the ladder.

## The mix

| Stage | What | Numbers |
|---|---|---|
| Master | the player's master volume | 0.85 by default |
| Compressor | evens out the whole | −16 dB, ratio 3, knee 18, attack 15 ms, release 280 ms |
| Limiter | keeps it from clipping | −3 dB, ratio 20, attack 2 ms, release 120 ms |
| Effects bus | every sound effect, the engine and the flight's air | 0.85 by default |
| Music bus | the music, and a room (a 2.6 s reverb, 30% wet) | 0.65 by default |
| Ambience bus | the world's space hum and the reactor's tone | 0.7 by default |

The settings panel sets the four volumes and mutes all (M); Test plays a
chord, a pickup and a thump. The music dips to 0.38 of its level while a hit
(0.55 s), a pulse (1.6 s) or a portal (1.5 s) sounds.

**Where an effect plays from:** one played at a place (a raider, a blast) is
panned by how far left or right of you it is (750 m to one side is ±0.85, the
most) and quieter with distance (×(1 − d/1500), at least ×0.12). Raiders'
shots play at ×0.65, only within 900 m, and one every 0.16 s at most for all
the raiders together.

**How often:** each effect has a cooldown; a call within it is dropped, not
delayed (so a chain of explosions plays as its first one). In a 20 s arcade
fight in Ion Reach the game played: your shot 101 times, its hit on a raider
96, raider ion shots 44 to 65, small blasts 12 to 17, raider missiles 5 to
8, a ship's blast 1 to 3, a portal 2 to 4, a kill 1 to 3. At most 35 to 50
sounds at once.

## The sound effects

Levels are the effect's peak alone, at full volume and in the middle (as
`bin/sound-render effects` records them, through the mix); length is how long
until it falls under −50 dB. Every effect is a few tones (`note`: a waveform,
a pitch that may slide, a lowpass) and a few noises (`air`: the game's own
noise in a band, which holds next to nothing over 1 kHz) at given volumes and
delays, some a little off in pitch each time.

### Your weapons

| Effect | When | Cooldown | How it is made now | Peak, length |
|---|---|---|---|---|
| `shot` | your Pulse cannon (plasma) fires; also its shots in the hangar's preview | 0.065 s | a streak of air, 35 ms, falling 7 → 3.8 kHz (a narrow band, Q 1.5), a fainter tick 2.4 → 1.9 kHz under it; no thump; pitch ±6% each time (Freelancer's gun, the author's track at 20:48) | −18.6 dB peak, as before; −39 dBFS loud; 0.045 s |
| `missile` | your Seeker launcher fires | 0.12 s | a thump 72 → 40 Hz, a puff of noise, then the motor: a hiss at 2.4 kHz and a sawtooth rising 160 → 480 Hz | −20.4 dB, 0.38 s |
| `enemy_scatter` | your Scatter gun fires, and raiders' scatter guns | 0.1 s | a crack, grit falling 1.8 kHz → 500 Hz, a sawtooth 150 → 45 Hz, a thump 70 Hz | −17.2 dB, 0.19 s |
| `enemy_ion` | your Ion gun, and raiders' ion guns | 0.08 s | an electric snap: a square 880 → 220 Hz, a sawtooth 1.3 kHz → 420 Hz, crackle at 5.2 kHz, a thump 110 Hz | −22 dB, 0.14 s |
| `enemy_railgun` | your Rail gun, and raiders' | 0.12 s | a crack at 5 kHz, a sawtooth 2.4 kHz → 300 Hz, a ringing sine at 1.76 kHz, a thump 80 Hz, the air closing | −19.6 dB, 0.26 s |
| `enemy_beam` | your Beam, raiders' beams, a flagship's beams, Ion Reach's arc pylons | 0.1 s | a sizzle: a sawtooth 340 → 240 Hz, a square 680 → 480 Hz, noise at 4.2 kHz, a hum at 85 Hz | −23.6 dB, 0.2 s |
| `impact` | your shot landing on a raider's hull or shield | 0.05 s | a square knock 190 → 90 Hz and a tick at 6 kHz | −25.9 dB, 0.12 s |

The game's names come from the raiders' guns: your own scatter, ion, rail and
beam guns play the raiders' sounds at full volume.

### Raiders

| Effect | When | Cooldown | How it is made now | Peak, length |
|---|---|---|---|---|
| `enemy_plasma` | a raider's plasma shot (Haven's and others') | 0.08 s | your shot's darker cousin: a streak of air, 45 ms, round 2.6 → 2.3 kHz (Q 2), a tick 1.2 → 1 kHz under it (Freelancer's second gun, the track at 21:30) | −19 dB peak, as before; −41 dBFS loud; 0.075 s |
| `enemy_missile` | a raider or a flagship launches a missile (dart, seeker, torpedo) | 0.18 s | a rush of noise at 650 Hz, a triangle rising 82 → 145 Hz | −18.8 dB, 0.28 s |
| `kill` | a raider destroyed; a Dustfall cliff falling; a flagship's part destroyed or rammed | 0.09 s | noise at 480 Hz, a thump 72 → 29 Hz, a triangle 142 → 44 Hz | −13.4 dB, 0.34 s |

### Explosions (recordings)

Every explosion the game draws (`explode()`, `src/js/explosions.js`) plays
one of six: by what it is (a rock breaking, a mine, both `explode()`'s kind),
else by its size (a small one, a ship's, a heavy ship's from 60, a
flagship's last from 180); a smaller one than 12 (a spark, a shot's flash)
plays none. Each is **two recordings of `src/sounds/`** (`explosion_play`):
the **body**, a take of its own for each thing that explodes, and the
**echo**, which the world adds (its `explosions`): the echo of one set, at
the world's level and pitch, begun where the body's own echo would. The echo
sets: `a`, cut from the author's examples; `deep`, from the heavy, deep
recordings. Each plays ±7% in pitch so two in a row differ. The author's
idea (2026-10-22 13:07): "the sound is made of parts, the blast, the echo;
combine them, and each world can leave its own imprint on its sounds".
Since 19:17 the bodies are five different recordings, one per thing, all
muffled alike (a lowpass of 12 dB an octave from 1.6 kHz, the first 50 ms
eased in), for the author to say from play which were good; before, the
body came from the world's set too (`a` in six worlds, `deep` in Obsidian
and Eclipse).

| World | Echo | Echo's level, pitch | Meant as |
|---|---|---|---|
| Haven | a | 0.8, ×1 | open space, a light echo |
| Verdant | a | 1.1, ×0.9 | wet and close: fuller, lower |
| Dustfall | a | 0.5, ×1.1 | dry dust: short, higher |
| Ion Reach | a | 0.9, ×1.2 | charged air: bright, higher |
| Obsidian | deep | 1, ×0.9 | iron: heavy, lower |
| Cryosphere | a | 1, ×1.3 | ice and glass: high, ringing |
| Nova Forge | deep | 1, ×1 | fire: the deep roar under the blast |
| Eclipse | deep | 1.3, ×0.8 | the void: the longest, lowest echo |

| Effect | What explodes (size) | Cooldown | The recording (its volume) | Peak, length |
|---|---|---|---|---|
| `blast` | a missile's blast, a shard or a drone dying (12 to 35) | 0.07 s | `body_small`, an explosion (0.108, the echo from 0.4 s) + the world's echo of a small one | −22.8 dBFS loud, 1.4 s |
| `blast_big` | a light raider dying (a chaser 40, a shooter 46, a lancer or splitter 48); a flagship's chain of blasts (36 to 59) | 0.12 s | `body_raider`, a designed explosion swelling for 0.4 s (0.48, the echo from 0.6 s) + the world's echo of a ship's | −17.8 dBFS loud, 1.8 s |
| `blast_huge` | a flagship's last blast (180 and over) | 0.8 s | `body_flagship`, a large explosion swelling for 1.4 s (0.52, the echo from 1.5 s) + the world's echo of a big one | −12.5 dBFS loud, 3 s |
| `blast_heavy` | a heavy raider dying: a bulwark (70), a tank (72), a carrier (74); a structure lost (70), a transport lost (90) | 0.12 s | `body_heavy`, a large explosion at ×0.92 (0.152, the echo from 0.6 s) + the world's echo of a ship's | −16.3 dBFS loud, 2 s |
| `blast_rock` | a rock breaking: an ore rock, a drifting asteroid, a Dustfall cliff's fall, a duel's rock | 0.1 s | `body_rock`, debris breaking (0.143, the echo from 0.9 s) + the world's echo of a small blast at 0.7 | −21.6 dBFS loud |
| `blast_barrel` | a mine going off: a raider's, a flagship's | 0.12 s | made in code, the game's old ship blast ("a barrel struck"): a crack, a boom 1.9 kHz → 160 Hz, a thump 58 → 26 Hz, a sawtooth growl, debris | −22 dBFS loud |

What they should be, from the author: heavy, not a tin can or a struck
barrel; several at once heard one after another and swelling together
("pa-pa-pa-pam"), not one pop; like the six examples above. A raider dies
with `kill` (still made in code, at 0.55 so its crack stays under the
blast) and `blast_big` together. The levels follow the ladder above, 4 to
7 dB under the ones the author chose from on the page and found too loud.

### You

| Effect | When | Cooldown | How it is made now | Peak, length |
|---|---|---|---|---|
| `hit` | your ship hit (shield or hull alike); the radiation alert; a bump in a race | 0.18 s | noise at 950 Hz, a thump 105 → 38 Hz, a triangle 210 → 82 Hz; the music dips | −13.6 dB, 0.2 s |
| `boost` | your dash (Shift: a burst of turbo); a flagship charging; a rival's turbo in a race | 0.08 s | a thump 56 → 34 Hz, a roar opening from 280 Hz to 2.4 kHz, a whoosh 900 Hz → 3.8 kHz, a whine 320 → 980 Hz, a sawtooth rumble | −12.8 dB, 0.64 s |
| `pulse` | your pulse (Space) going off; an EMP charge; falling into a black hole's core | 0.08 s | a recording of a wave spreading out (`pulse.mp3`, 0.35, ±4% in pitch): a 0.6 s swell as the ring grows, then a wash; the music dips | −19 dBFS loud, 2.4 s |
| `dash` | a stasis charge used (the name is old) | 0.08 s | a whoosh falling 3.6 kHz → 600 Hz, a thump 95 → 45 Hz, a sawtooth zip 260 → 820 Hz | −20.5 dB, 0.26 s |
| `portal` | your jump through a portal or gate; a flagship escaping (Haven's Crescent) or jumping | 0.6 s | noise at 850 Hz for 1.4 s, three sines rising an octave each (D3, A3, D4, staggered), a sub 44 → 75 Hz; the music dips | −13.1 dB, 1.14 s |
| `mine` | an ore rock broken; drifting debris hit; a Dustfall cliff struck; a flagship's mine | 0.12 s | noise at 1.8 kHz, a triangle 480 → 230 Hz, a thump 135 → 60 Hz | −20.7 dB, 0.17 s |

### Rewards, the shop, the race

| Effect | When | Cooldown | How it is made now | Peak, length |
|---|---|---|---|---|
| `pickup` | salvage or a supply picked up; buying in a shop; cargo traded; the depot opened; a card chosen; a medkit used | 0.16 s | triangles E5 then B5, a sine E6 over them | −23.3 dB, 0.35 s |
| `upgrade` | a module, gun, ship or drone bought or fitted; a contract claimed; on from the break | 0.25 s | sines C4, G4, C5, 0.14 s apart | −22.7 dB, 0.74 s |
| `win` | a flagship destroyed; a goal reached; a mission's step done | 0.5 s | sines C4, G4, C5, E5, 0.14 s apart | −22.7 dB, 0.88 s |
| `countdown` | a race's start count, each second | 0.5 s | a square beep D5 | −23.4 dB, 0.19 s |
| `go` | a race's green light | 0.5 s | a square D6, a sine D5, a rush of air | −19.1 dB, 0.41 s |
| `ring` | through a race's ring; a race finished | 0.2 s | triangles G5 then D6 | −22.3 dB, 0.27 s |

### The worlds' hazards

| Effect | When | Cooldown | How it is made now | Peak, length |
|---|---|---|---|---|
| `gravity` | flying into a gravity well (the warning); a flagship's gravity moves | 1.2 s | triangles G3, then D3 0.31 s later | −23 dB, 0.23 s and again |
| `storm` | inside an Ion Reach storm (every 2.5 s); an arc pylon's strike; a flagship's storm | 1.5 s | noise at 1.8 kHz, a thump 82 → 36 Hz | −19.2 dB, 0.42 s |
| `flare` | inside a Nova Forge flare (every 2.5 s); a flagship's heat; a flagship's second phase | 1.5 s | noise at 480 Hz, a thump 61 → 32 Hz | −17.7 dB, 0.56 s |

### Moments with no sound

Nothing plays when: you dock or undock; a button is pressed (no click
anywhere); a wave starts or is cleared; a world is cleared (only its
flagship's `win` as it dies); a life is lost and the world starts again; your shield
breaks (a hit on the shield sounds as one on the hull).

## The steady sounds of flight

Played all through flight, faded in and out with it (`create_flight_audio`
and `update_audio_scene` in `src/js/audio.js`):

| Sound | Bus | Made of | Follows |
|---|---|---|---|
| Engine | effects | your ship's own recording, looped (`src/sounds/engine_<ship>.mp3`, `flight_engine_play`): Wisp Scout a thrust loop, Kestrel Courier a smooth engine loop (the sci-fi engine chosen first "worked like a vacuum cleaner", 15:48), Viper Interceptor a space fighter's engine (the hover engine chosen first was "not a spaceship's", 15:56), Mule Prospector a nuclear reactor, Bastion Gunship a heavy engine loop (the spacecraft engine chosen first whistled at 4 kHz and "differed from all the others", 16:42), Aurora Cruiser a plasma engine (the author's picks, 2026-10-22) | thrust: level 0.115 × (0.3 + 0.7 × thrust, +0.5 in turbo), its speed and pitch ×0.92 + 0.12 × thrust (+0.1 in turbo), times the ship's own `engine_rate` (the Interceptor ×1.3, the Prospector ×0.85, the rest 1) |
| Air | effects | the game's noise in a band at 1.2 kHz | thrust ×0.014, turning ×0.006; in turbo +0.04 and the band down to 700 Hz (a deep roar) |
| Space | ambience | the game's noise played slow (×0.42) under a lowpass, by world (below) | its level by world, ×0.35 near the station |
| Reactor | ambience | a sine by world (below) at 0.008 | |
| A flagship near | effects | the world's flagship's own recording, looped (`src/sounds/boss_<world>.mp3`, `flight_presence_play`; its music's `presence`): the Crescent a battle-mode hum, the Thorn Beetle a space monster's drone, the Sawtooth a warbly alien engine, the Storm Wheel an electric arc, the Iron Stair a battle mech walking, the Frost Crystal ice ringing, the Furnace burning air, the Eclipse Eye an evil warp core (chosen by the agent, 2026-10-22 13:53, the author having asked for decisions, not questions) | how near the flagship is: level 0.35 × near², near 1 at 0 m to 0 at 2.5 km; panned to its side (±0.85 at 750 m) |

## The music

Each world has a theme (its file's `music`: tempo, root note, four chords, a
scale, a short tune, a rhythm and a filter); the game plays it three ways.

**The calm theme** (`music_step` in `src/js/music.js`): the menu, the
campaign, the station, the shop. A cycle of 256 eighths: each chord 16
eighths (two bars), the four chords four times, a section of 64 eighths
apart. Over it: a pad of the chord's notes an octave up (sines and a softer
triangle, 8 beats, slow in, slow out), a bass on the root every 8 eighths, the
tune on every fourth eighth (its register changing by section), and the
world's percussion (its `rhythm`, 0 to 7). In a fight in the campaign
(raiders within 850 m) a kick, a snare and hats join, and the music drops to
0.65 of its level.

**The drive** (`src/js/music_drive.js`): the arcade. The same chords, scale and
tune, faster (`drive.bpm`), over a drum kit (`kit`: four on the floor, broken,
or half time), a running bass (`bass`: eighths, offbeat or gallop), an
arpeggio of the chord in sixteenths (`arp`, the lead's sound) from the start,
the tune doubled a little out of tune from the second section (about 15 s
in), a quiet sawtooth pad, a crash every 64 eighths.

**The boss** (`music_drive.js`): a flagship within 1.8 km, until it is down.
It starts with a hit (a boom 120 → 32 Hz, a crash, the chord stabbed) and is a
piece of its own: 8% faster, a kick on every beat and an extra one before each
bar, a snare on 2 and 4 and a roll into every fourth bar, hats in sixteenths,
the bass in sixteenths jumping an octave, a dark riff in eighths (semitones
over the chord's root: 0 0 1 0 3 0 1 6) in a sawtooth with a square under it,
the chord stabbed on its change and on the and of three. The world's tune,
arpeggio and pad stop. A change of music starts on a fresh bus and the old
one fades out in about 0.1 s.

**Its level by the game's state:** the menu 0.42, flight 0.8 (0.65 in a
campaign fight), docked at the station or choosing an upgrade 0.54, a jump 0.42, under a hit or a
pulse 0.38; none while the tab is hidden, sound is off, or the music or the
master volume is at zero.

## The worlds

Each world, Haven to Eclipse (`src/js/worlds/`, `campaign.world` 0 to 7): what
the player sees and flies through, what fights them, what it sounds like now,
and what its sounds can carry. Every world has gate jumps (`portal`); in the
campaign every world has a black hole (the `gravity` warning repeats every
1.4 s inside it, 3.5 s in its outer field), in the arcade only Eclipse. The
raiders' shots are their world's gun. Arcade events (none has a sound of its
own): a convoy (a freighter of salvage), an ace (an elite that jumps away in
20 s), a jammer (blinds the minimap and radar), a heat surge (eight vents
along a line, 1.4 s warning).

Notes are the theme's root (MIDI number and note); its chords are semitones
over the root.

| World | Calm theme | Tempo | Root | Rhythm | Drive: tempo, lead, bass, kit | Space level, lowpass | Reactor |
|---|---|---|---|---|---|---|---|
| Haven | Home among the stars | 72 | 48, C3 | 0 | 124, square, eighths, four | 0.014, 420 Hz | 62 Hz |
| Verdant | The breathing nebula | 78 | 50, D3 | 1 | 118, triangle, offbeat, broken | 0.034, 950 Hz | 73 Hz |
| Dustfall | Caravan of dust | 84 | 43, G2 | 2 | 132, sawtooth, gallop, four | 0.025, 380 Hz | 55 Hz |
| Ion Reach | Signals in the rain | 94 | 45, A2 | 3 | 140, square, eighths, broken | 0.042, 1500 Hz | 82 Hz |
| Obsidian | Silent machinery | 64 | 36, C2 | 4 | 112, sawtooth, offbeat, half time | 0.035, 260 Hz | 46 Hz |
| Cryosphere | A sky made of glass | 60 | 50, D3 | 5 | 126, triangle, offbeat, four | 0.018, 1100 Hz | 88 Hz |
| Nova Forge | The sun below | 96 | 45, A2 | 6 | 136, sawtooth, gallop, broken | 0.05, 650 Hz | 65 Hz |
| Eclipse | Between distant tides | 56 | 38, D2 | 7 | 120, square, eighths, half time | 0.028, 190 Hz | 38 Hz |

### Haven: blue shores

- **Look:** an ocean planet, soft blue nebulae and orbital traffic (navy, teal,
  pale cyan stars). The first world and the calmest.
- **Flight:** "stable orbit": strong stabilisers stop the ship when you let
  go; no radiation, no zones.
- **Raiders:** the Rim Corsairs, light unarmoured scouts with plasma
  (`enemy_plasma`); no marksmen. Elites fire a fan of three plasma shots.
  Events: convoy, ace.
- **Flagship, the Crescent** (its own sound as it nears: a battle-mode hum)**:** circles you at 380 m fanning plasma from its
  wingtips, strafes in a charge (`boost`); in its second phase a ring with one
  gap and two chasers. In the arcade it runs for a gate: each third of its
  hull lost stalls its engine (`kill`), and at the gate it escapes (`portal`)
  with its bounty.
- **Music:** C major, warm and open (chords I, IV, vi, V with added ninths; a
  pentatonic tune).
- **Its sounds can carry:** home, light and clean; the arcade's first steps.

### Verdant: the living veil

- **Look:** an emerald gas giant with a ringed eye-storm, luminous spores
  drifting, organic structures (deep greens, pale green light).
- **Flight:** "living currents": the nebula's current pushes ships, shots,
  ore and pickups (up to about 60 m/s, its direction changing slowly; the HUD
  shows it); the hull mends itself 0.4 a second after 5 s unhit.
- **Raiders:** the Thorn Swarm, with scatter guns (`enemy_scatter`); a fifth
  are marksmen. Elites sow two spore mines. Events: convoy, jammer.
- **Flagship, the Thorn Beetle** (its own sound as it nears: a space monster's drone)**:** drifts with the current; spine spirals,
  drifting spore mines (`mine`), a thorn ring; its brood hatches in its second
  phase (`portal`). In the arcade, nests hold a green shield over it that no
  hit gets through, and it sows new ones at half hull.
- **Music:** D minor (Dorian), breathing.
- **Its sounds can carry:** something alive: wet, organic, spores and
  currents. The current has no sound now.

### Dustfall: the dune belt

- **Look:** a cratered desert moon, amber dust and a dense asteroid belt;
  grit blows across the screen.
- **Flight:** "low-gravity drift": you coast, slow to turn and stop; shots
  fly farther; rocks are solid cover that enemy fire wears down.
- **Cliffs (arcade):** six rock faces; struck, a cliff rumbles for 0.6 s
  ("ROCKFALL", `mine`) and falls (`kill`), crushing raiders and you and
  leaving rubble. Half the squadrons warp in under a cliff.
- **Raiders:** the Dune Marauders, with missiles (`enemy_missile`, reloading
  twice as slowly in the arcade); a third are marksmen. Elites charge.
  Events: jammer, convoy.
- **Flagship, the Sawtooth** (its own sound as it nears: a warbly alien engine)**:** coasts; missiles from its hatches, flak from its
  pods, a spinning saw charge (`boost`) that leaves bursts of dust. In the
  arcade it jousts: its blade lets half a shot through, and a charge that ends
  on a rock stuns it with its hull open (`kill` as it rams).
- **Music:** G minor pentatonic, a caravan's trot.
- **Its sounds can carry:** dry and gritty: sand, stone, rockfalls, the saw.

### Ion Reach: the electric storm

- **Look:** an indigo storm planet with lightning veins, flashes across the
  sky, suspended prisms.
- **Flight:** "conductive storms": shots fly farther; the shield recharges
  twice as fast; radiation.
- **Storms:** four ion fields round the station on a 16 s cycle (3 s of
  warning, then 4 s active; `storm` every 2.5 s inside): they charge the
  pulse and drain the shield.
- **Arc pylons:** eight (six in the arcade); come within 230 m and one charges
  for 1.1 s (`enemy_beam`) and strikes for 18 (`storm`, quieter if you got
  clear), then rests 2.4 s. Violet fields round them charge the pulse.
- **Raiders:** the Volt Collective, with ion guns (`enemy_ion`) that drain
  the pulse; a third are marksmen. Elites blink 300 m. Events: ace, convoy.
- **Flagship, the Storm Wheel** (its own sound as it nears: an electric arc humming)**:** spins at range; four-way ion volleys,
  lightning spokes sweeping a quarter turn, blink jumps; pods shield its hub
  in its second phase. In the arcade a turning shell with two gaps; its arcs
  light every plate but the gaps (`enemy_beam`, then `storm`).
- **Music:** A minor, a brisk rain of notes.
- **Its sounds can carry:** electricity: crackle, hum, thunder.

### Obsidian: the iron expanse

- **Look:** a fortified industrial planet, steel wreckage and armoured
  outposts (graphite, rose-pink lights, a dark ring).
- **Flight:** "heavy gravity": slow and heavy; shots fly shorter; the black
  hole pulls 65% harder and the planet pulls gently; rocks are solid;
  radiation.
- **Magnetic spires:** seven (six in the arcade), each a 40 m body in a 280 m
  field that draws ships in at up to 30 m/s and bends passing shots into it;
  a crash costs hull. They make no sound.
- **Raiders:** the Iron Dominion, with rail guns (`enemy_railgun`), armour
  and shields. Elites lock a tracking rail lance before they fire. Events:
  jammer, ace.
- **Flagship, the Iron Stair** (its own sound as it nears: a battle mech walking)**:** slow, stepping forward every 2.4 s; rail
  sights lock 0.35 s before they fire, gravity wells (`gravity`), a six-lane
  broadside. In the arcade a siege: armour stops every shot but at one glowing
  weak point, stern, flanks, bow, each a quarter of its hull (`kill` as it
  breaks).
- **Music:** C minor pentatonic, the lowest root, slow.
- **Its sounds can carry:** weight and metal: magnetic hum, steel, machinery.

### Cryosphere: the frozen aurora

- **Look:** a fractured ice moon, aurora ribbons (aqua and blue) across the
  screen, glinting crystal fields, falling ice motes.
- **Flight:** "frozen inertia": the longest drift of all, a slow shield
  recharge, guns firing faster. No zones, no cold damage.
- **Raiders:** the Frost Sentinels, with cryo scatter guns
  (`enemy_scatter`), heavy shields. Elites cast a frost ring. Events: convoy,
  ace.
- **Flagship, the Frost Crystal** (its own sound as it nears: ice, slowed, ringing)**:** glides; ice plates orbit it and stop your
  shots; shard spirals, icicles dropping where you are (`mine`), a frost nova
  that pulls the plates in (`enemy_beam`, then `pulse`). In the arcade it can
  be hurt only while it glows.
- **Music:** D minor, the slowest but one, the brightest filter.
- **Its sounds can carry:** ice and glass: chimes, crystal, cracking, a cold
  shimmer. Nothing of it sounds now.

### Nova Forge: the solar foundry

- **Look:** a molten planet with gold fissures, a blazing corona, embers rising
  with tails, volcanic debris.
- **Flight:** "reactor heat": every shot and the turbo add heat; at 100 the
  guns lock until it falls under 55. Heavy radiation.
- **Flares:** four solar fields round the station on a 20 s cycle (3 s of
  warning, then 4 s active; `flare` every 2.5 s inside): heat +15 a second and
  10 damage a second. Storms and flares also line its arcade Scroll lane.
- **Raiders:** the Ember Legion, with seeker volleys (`enemy_missile`).
  Elites drop three embers where you are. Events: heat surge, ace.
- **Flagship, the Furnace** (its own sound as it nears: burning air)**:** lumbers in close; a sweeping flame beam that
  heats your guns, mortar embers leaving slag (`mine`), missile salvos, a
  flare wave that opens its core (`flare`). In the arcade a ring of fire
  closes on you as it heats (`flare` each step); outside it you burn.
- **Music:** A minor, the fastest calm theme.
- **Its sounds can carry:** fire and furnace: roar, sizzle, molten metal,
  overheating. Overheated guns have no sound now.

### Eclipse: the black crown

- **Look:** an eclipsed world, a dark disc with violet rings and a pink and
  gold crescent rim, a corona, broken void monuments; the stars dimmed.
- **Flight:** "tidal void": the black hole pulls 210% harder and its core
  kills even through a shield or a dash; the pulse leaks; each dash costs
  energy; the heaviest radiation. The arcade's only black hole.
- **Raiders:** the Void Armada, with void rail guns (`enemy_railgun`),
  heavy armour and shields. Elites blink 320 m. Events: heat surge, ace.
- **Flagship, the Eclipse Eye** (its own sound as it nears: an evil warp core)**:** hovers and blinks (`portal`); an eye beam
  that turns after you and drains energy, fans of rail lanes, a singularity
  well (`gravity`) while its dome is open. In the arcade it keeps to the
  hole's edge, and its surge makes the hole pull harder ("THE HOLE SURGES",
  `gravity`).
- **Music:** D minor, the slowest theme, the darkest space hum (190 Hz) and
  the lowest reactor (38 Hz).
- **Its sounds can carry:** the end of the world: void, vast and dark,
  gravity you can hear.

## What has no sound of its own

Beyond the moments above: Verdant's current, Obsidian's spires, anything of
Cryosphere's cold, the heat surge's vents, Nova Forge's overheated guns,
radiation (its alerts play `hit`), the arcade's events (convoy, ace, jammer).
