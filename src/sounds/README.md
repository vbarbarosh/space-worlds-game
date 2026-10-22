# Recordings

The recorded sounds the game plays, packed into the page as base64 by the
`<!-- sounds sounds as sound_files -->` line of `src/index.html` and decoded
when sound starts (`sound_samples_decode` in `src/js/audio.js`). An effect
plays one with `clip(name, volume, rate)` (`sfx` in `src/js/music.js`).

Each is cut from its first sound, a lowpass of 12 dB an octave from 2 kHz,
the first 30 ms eased in, faded over its last 0.4 s, peaked at -1 dB,
stereo MP3 at 160 kbps. Both were the author's picks, blind, from ten
played by the game (2026-10-22 23:09 and 23:10).

| File | Plays as | Source | Licence |
|---|---|---|---|
| `explosion.mp3` | every blast (`blast`, `blast_big`, `blast_huge`): a missile's, a raider's, a ship's, a flagship's, each at its own volume and pitch | "Medium Explosion" by freesound_community, Pixabay sound 40472 (sent by the author as `freesound_community-medium-explosion-40472.mp3`), its first 2.05 s | [Pixabay Content License](https://pixabay.com/service/license-summary/) |
| `explosion_rock.mp3` | a rock breaking (`blast_rock`): an ore rock, drifting debris, a duel's rock | "Explosion" by tgerginov, [Freesound 665092](https://freesound.org/people/tgerginov/sounds/665092/), its first 2.5 s | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) |
