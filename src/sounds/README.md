# Recordings

The recorded sounds the game plays, packed into the page as base64 by the
`<!-- sounds sounds as sound_files -->` line of `src/index.html` and decoded
when sound starts (`sound_samples_decode` in `src/js/audio.js`). An effect
plays one with `clip(name, volume, rate)` (`sfx` in `src/js/music.js`).

Each is cut from its first sound, faded out over its last 0.3 s, peaked at
-1 dB, stereo MP3 at 96 kbps. Chosen by the author on 2026-10-22 from four
recorded sets played in the game (`docs/designer/sound.md`, Explosions).
Each explosion is two recordings, cut from one take: its **blast** (the
take to the cut, faded over its last 0.15 s) and its **echo** (the take from
0.1 s before the cut, eased in), so a world can combine them its own way
(`explosion_play` in `src/js/sfx/blast.js`, each world's `explosions`: the
blast of one set, the echo of one, the echo's level and pitch). The sets:
`a`, the author's examples; `deep`, the heavy, deep recordings.
The explosions are softened as the author asked ("softer, like Warzone's";
the first cut "sounded like a shot"): a gentle lowpass (6 dB an octave from
3 kHz; 2.5 kHz for the large ones) takes the edge off the crack, and the
first 30 to 50 ms are eased in; a steeper one at 900 Hz was "under water"; the
takes for a small blast and a ship's are the longer, swelling ones of the
author's examples (a missile's explosion, a sci-fi explosion), not the
sharp "medium explosion" of the first cut.

| File | Plays as | Source | Licence |
|---|---|---|---|
| `body_a_small.mp3` and `echo_a_small.mp3` | a small blast and its echo (set a), the echo from 0.5 s | "Missile Explosion" by voicebosch, Pixabay sound 168600 (sent by the author as `voicebosch-missile-explosion-168600.mp3`), its first 2.2 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `body_a_ship.mp3` and `echo_a_ship.mp3` | a ship's blast and its echo (set a), the echo from 0.85 s | "Sci-Fi Explosion 09" by daviddumaisaudio, Pixabay sound 190268 (sent by the author as `daviddumaisaudio-sci-fi-explosion-09-190268.mp3`), its first 3 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `body_a_big.mp3` and `echo_a_big.mp3` | a flagship's last blast and its echo (set a), the echo from 1.1 s | "Big Explosion" by rsf_studios, Pixabay sound 592670 (sent by the author as `rsf_studios-big-explosion-592670.mp3`), its first 5 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `body_deep_small.mp3` and `echo_deep_small.mp3` | a small blast and its echo (set deep), the echo from 0.45 s | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), played ×1.2, its first 2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `body_deep_ship.mp3` and `echo_deep_ship.mp3` | a ship's blast and its echo (set deep), the echo from 0.6 s | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), its first 2.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `body_deep_big.mp3` and `echo_deep_big.mp3` | a flagship's last blast and its echo (set deep), the echo from 1.3 s | "Self Destruct/Alpha-11 Warhead Explosion" by FusionWolf3740, [Freesound 568877](https://freesound.org/people/FusionWolf3740/sounds/568877/), its first 5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

| `body_rock.mp3` | a rock breaking (`blast_rock`): an ore rock, drifting debris, a Dustfall cliff's fall; with the world's echo | "Two Debris Break 2" by lordsonny, Pixabay sound 457507 (sent by the author as `lordsonny_two-debris-break-2-457507.mp3`), its first 1.4 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `pulse.mp3` | your pulse (Space), an EMP charge | "Electromagnetic pulse sound" by User391915396, [Freesound 683828](https://freesound.org/people/User391915396/sounds/683828/), its first 1.6 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_scout.mp3` | the Wisp Scout's engine, looped | "Thrust Loop" by unfa, [Freesound 584181](https://freesound.org/people/unfa/sounds/584181/), 1.3 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_courier.mp3` | the Kestrel Courier's engine | "Sci-Fi Engine Loop" by Sojan, [Freesound 407540](https://freesound.org/people/Sojan/sounds/407540/), 1.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_interceptor.mp3` | the Viper Interceptor's engine | "Hover engine 2" by peridactyloptrix, [Freesound 213528](https://freesound.org/people/peridactyloptrix/sounds/213528/), 5 s from 4 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_miner.mp3` | the Mule Prospector's engine | "Nuclear reactor" by Bachsambora, [Freesound 749979](https://freesound.org/people/Bachsambora/sounds/749979/), 6 s from 2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_gunship.mp3` | the Bastion Gunship's engine | "Spacecraft Engine Loop 01" by Tim_Verberne, [Freesound 488959](https://freesound.org/people/Tim_Verberne/sounds/488959/), 6 s from 10 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_cruiser.mp3` | the Aurora Cruiser's engine | "plasma engine fx" by Insu, [Freesound 196266](https://freesound.org/people/Insu/sounds/196266/), 6 s from 5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

An engine is one loop made seamless (its next 0.2 to 0.5 s blended into its
head, equal power, at -20 dB RMS), stored twice in a row, mono MP3 at 64 kbps;
the game loops it from a quarter to three quarters of the file
(`flight_engine_play`), clear of the silence MP3 adds at the ends. Its
loop's length is the ship's `engine_loop`.

The Pixabay licence allows them in a game with no credit; it forbids
selling or sharing a file on its own, as it was downloaded.
