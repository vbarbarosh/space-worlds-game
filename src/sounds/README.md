# Recordings

The recorded sounds the game plays, packed into the page as base64 by the
`<!-- sounds sounds as sound_files -->` line of `src/index.html` and decoded
when sound starts (`sound_samples_decode` in `src/js/audio.js`). An effect
plays one with `clip(name, volume, rate)` (`sfx` in `src/js/music.js`).

Each is cut from its first sound, faded out over its last 0.3 s, peaked at
-1 dB, stereo MP3 at 96 kbps. Chosen by the author on 2026-10-22 from four
recorded sets played in the game (`docs/designer/sound.md`, Explosions).
The explosions are softened as the author asked ("softer, like Warzone's";
the first cut "sounded like a shot"): a lowpass at 900 Hz (700 Hz for the
large ones) takes the crack off, and the first 50 to 80 ms are eased in; the
takes for a small blast and a ship's are the longer, swelling ones of the
author's examples (a missile's explosion, a sci-fi explosion), not the
sharp "medium explosion" of the first cut.

| File | Plays as | Source | Licence |
|---|---|---|---|
| `explosion_small.mp3` | a small blast (a missile's, a mine, a drone) | "Missile Explosion" by voicebosch, Pixabay sound 168600 (sent by the author as `voicebosch-missile-explosion-168600.mp3`), its first 2.2 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `explosion_ship.mp3` | a ship's blast | "Sci-Fi Explosion 09" by daviddumaisaudio, Pixabay sound 190268 (sent by the author as `daviddumaisaudio-sci-fi-explosion-09-190268.mp3`), its first 3 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `explosion_big.mp3` | a flagship's last blast | "Big Explosion" by rsf_studios, Pixabay sound 592670 (sent by the author as `rsf_studios-big-explosion-592670.mp3`), its first 5 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `explosion_deep_small.mp3` | a small blast in Obsidian and Eclipse | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), played ×1.2, its first 2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `explosion_deep.mp3` | a ship's blast in Obsidian and Eclipse | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), its first 2.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `explosion_deep_huge.mp3` | a flagship's last blast in Obsidian and Eclipse | "Self Destruct/Alpha-11 Warhead Explosion" by FusionWolf3740, [Freesound 568877](https://freesound.org/people/FusionWolf3740/sounds/568877/), its first 5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

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
