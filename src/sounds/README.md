# Recordings

The recorded sounds the game plays, packed into the page as base64 by the
`<!-- sounds sounds as sound_files -->` line of `src/index.html` and decoded
when sound starts (`sound_samples_decode` in `src/js/audio.js`). An effect
plays one with `clip(name, volume, rate)` (`sfx` in `src/js/music.js`).

Each is cut from its first sound, faded out over its last 0.3 s, peaked at
-1 dB, stereo MP3 at 96 kbps. Chosen by the author on 2026-10-22 from four
recorded sets played in the game (`docs/designer/sound.md`, Explosions).

| File | Plays as | Source | Licence |
|---|---|---|---|
| `explosion_medium.mp3` | a ship's blast; a small one, played ×1.35 | "Medium Explosion" by freesound_community, Pixabay sound 40472 (sent by the author as `freesound_community-medium-explosion-40472.mp3`) | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `explosion_big.mp3` | a flagship's last blast | "Big Explosion" by rsf_studios, Pixabay sound 592670 (sent by the author as `rsf_studios-big-explosion-592670.mp3`), its first 5 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `explosion_deep_small.mp3` | a small blast in Obsidian and Eclipse | "Explosion longer" by wubitog, [Freesound 200465](https://freesound.org/people/wubitog/sounds/200465/) | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `explosion_deep.mp3` | a ship's blast in Obsidian and Eclipse | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), its first 2.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `explosion_deep_huge.mp3` | a flagship's last blast in Obsidian and Eclipse | "Self Destruct/Alpha-11 Warhead Explosion" by FusionWolf3740, [Freesound 568877](https://freesound.org/people/FusionWolf3740/sounds/568877/), its first 5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |

The Pixabay licence allows them in a game with no credit; it forbids
selling or sharing a file on its own, as it was downloaded.
