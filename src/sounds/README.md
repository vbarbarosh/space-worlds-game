# Recordings

The recorded sounds the game plays, packed into the page as base64 by the
`<!-- sounds sounds as sound_files -->` line of `src/index.html` and decoded
when sound starts (`sound_samples_decode` in `src/js/audio.js`). An effect
plays one with `clip(name, volume, rate)` (`sfx` in `src/js/music.js`).

Each is cut from its first sound, faded out over its last 0.3 s, peaked at
-1 dB, stereo MP3 at 96 kbps. Chosen by the author on 2026-10-22 from four
recorded sets played in the game (`docs/designer/sound.md`, Explosions).
Each explosion is two recordings: the **body**, one take of its own for each
thing that explodes (a small blast, a raider, a heavy ship, a flagship's
last, a rock), and the **echo**, which the world adds its own way
(`explosion_play` in `src/js/sfx/blast.js`, each world's `explosions`: the
echo's set, level and pitch). The echo sets: `a`, cut from the author's
examples (the take from 0.1 s before its cut, eased in); `deep`, from the
heavy, deep recordings. Since 2026-10-22 19:17 ("the explosion should be a
bit more muffled; it is sharp now; make several takes and put a different
one on each object") each body is a different recording, muffled alike: a
lowpass of 12 dB an octave from 1.6 kHz, the first 50 ms eased in, faded
over its last 0.3 s. Before that the bodies were cut from the echo sets'
takes, with a gentler lowpass (6 dB an octave from 3 kHz; a steeper one at
900 Hz was "under water").

| File | Plays as | Source | Licence |
|---|---|---|---|
| `body_small.mp3` | a small blast (`blast`): a missile's, a shard's, a drone dying; with the world's echo of a small one | "Explosion 4" by pumodi, [Freesound 150211](https://freesound.org/people/pumodi/sounds/150211/), its first 1.4 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `body_raider.mp3` | a light raider dying, a flagship's chain of blasts (`blast_big`); with the world's echo of a ship's | "Flashbang Explosion Designed 14m" by modusmogulus, [Freesound 734095](https://freesound.org/people/modusmogulus/sounds/734095/), its first 1.8 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `body_heavy.mp3` | a heavy raider dying (`blast_heavy`), played at ×0.92; with the world's echo of a ship's | "large explosion 1" by V-ktor, [Freesound 482993](https://freesound.org/people/V-ktor/sounds/482993/), its first 2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `body_flagship.mp3` | a flagship's last blast (`blast_huge`), swelling for 1.4 s; with the world's echo of a big one | "kl_ex5" by Klerrp, [Freesound 114049](https://freesound.org/people/Klerrp/sounds/114049/), its first 3 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `body_rock.mp3` | a rock breaking (`blast_rock`): an ore rock, drifting debris, a Dustfall cliff's fall; with the world's echo | "Two Debris Break 2" by lordsonny, Pixabay sound 457507 (sent by the author as `lordsonny_two-debris-break-2-457507.mp3`), its first 1.4 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `echo_a_small.mp3` | a small blast's echo (set a), from 0.5 s into its take | "Missile Explosion" by voicebosch, Pixabay sound 168600 (sent by the author as `voicebosch-missile-explosion-168600.mp3`), its first 2.2 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `echo_a_ship.mp3` | a ship's echo (set a), from 0.85 s | "Sci-Fi Explosion 09" by daviddumaisaudio, Pixabay sound 190268 (sent by the author as `daviddumaisaudio-sci-fi-explosion-09-190268.mp3`), its first 3 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `echo_a_big.mp3` | a flagship's last blast's echo (set a), from 1.1 s | "Big Explosion" by rsf_studios, Pixabay sound 592670 (sent by the author as `rsf_studios-big-explosion-592670.mp3`), its first 5 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `echo_deep_small.mp3` | a small blast's echo (set deep), from 0.45 s | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), played ×1.2, its first 2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `echo_deep_ship.mp3` | a ship's echo (set deep), from 0.6 s | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), its first 2.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `echo_deep_big.mp3` | a flagship's last blast's echo (set deep), from 1.3 s | "Self Destruct/Alpha-11 Warhead Explosion" by FusionWolf3740, [Freesound 568877](https://freesound.org/people/FusionWolf3740/sounds/568877/), its first 5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `pulse.mp3` | your pulse (Space), an EMP charge: a wave spreading out, a 0.6 s swell then a wash (a lowpass from 4 kHz, faded over its last 0.5 s) | "Cinematic Woosh SFX-016" by AudioPapkin, [Freesound 745443](https://freesound.org/people/AudioPapkin/sounds/745443/), 2.4 s from 0.5 s into its sound | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_scout.mp3` | the Wisp Scout's engine, looped | "Thrust Loop" by unfa, [Freesound 584181](https://freesound.org/people/unfa/sounds/584181/), 1.3 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_courier.mp3` | the Kestrel Courier's engine | "FX_PURPLE_ENGINE_LOOP" by JakeAMT, [Freesound 681976](https://freesound.org/people/JakeAMT/sounds/681976/), 1.2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_interceptor.mp3` | the Viper Interceptor's engine | "SpaceFighterEngine" by Starkadr, [Freesound 641194](https://freesound.org/people/Starkadr/sounds/641194/), 1.3 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_miner.mp3` | the Mule Prospector's engine | "Nuclear reactor" by Bachsambora, [Freesound 749979](https://freesound.org/people/Bachsambora/sounds/749979/), 6 s from 2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_gunship.mp3` | the Bastion Gunship's engine | "FX_BOSS_ENGINE_loop" by JakeAMT, [Freesound 681975](https://freesound.org/people/JakeAMT/sounds/681975/), 1.2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `engine_cruiser.mp3` | the Aurora Cruiser's engine | "plasma engine fx" by Insu, [Freesound 196266](https://freesound.org/people/Insu/sounds/196266/), 6 s from 5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

| `boss_haven.mp3` | The Crescent's own sound as it nears, looped | "battle mode space ship background hum loop" by qubodup, [Freesound 861428](https://freesound.org/people/qubodup/sounds/861428/), 5 s from 1 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `boss_verdant.mp3` | The Thorn Beetle's own sound as it nears, looped | "Space monster Drone" by XfiXy8, [Freesound 467288](https://freesound.org/people/XfiXy8/sounds/467288/), 8 s from 10 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `boss_dustfall.mp3` | The Sawtooth's own sound as it nears, looped | "Warbly Alien Spaceship Engine" by DeVern, [Freesound 609467](https://freesound.org/people/DeVern/sounds/609467/), 5 s from 1 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `boss_ion_reach.mp3` | The Storm Wheel's own sound as it nears, looped | "ELECArc_Electric arc hum and buzz" by pryanic, [Freesound 776446](https://freesound.org/people/pryanic/sounds/776446/), 8 s from 30 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `boss_obsidian.mp3` | The Iron Stair's own sound as it nears, looped | "Battle Mech walks" by Breviceps, [Freesound 557594](https://freesound.org/people/Breviceps/sounds/557594/), 5.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `boss_cryosphere.mp3` | The Frost Crystal's own sound as it nears, looped | "Ice 9 - Slow" by JarredGibb, [Freesound 263914](https://freesound.org/people/JarredGibb/sounds/263914/), 5.5 s from 0.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `boss_nova_forge.mp3` | The Furnace's own sound as it nears, looped | "burning air" by sergeeo, [Freesound 242721](https://freesound.org/people/sergeeo/sounds/242721/), 6 s from 1 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `boss_eclipse.mp3` | The Eclipse Eye's own sound as it nears, looped | "evil space ship warp core hum loop" by qubodup, [Freesound 861430](https://freesound.org/people/qubodup/sounds/861430/), 8 s from 2 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

An engine, and a flagship's sound, is one loop made seamless (its next 0.2 to 0.5 s blended into its
head, equal power, at -20 dB RMS), stored twice in a row, mono MP3 at 64 kbps;
the game loops it from a quarter to three quarters of the file
(`flight_engine_play`), clear of the silence MP3 adds at the ends. Its
loop's length is the ship's `engine_loop`; a ship with an `engine_rate`
plays its loop at that pitch and speed (the Interceptor higher, the
Prospector lower), so three smooth hums of one register tell apart.

The Pixabay licence allows them in a game with no credit; it forbids
selling or sharing a file on its own, as it was downloaded.
