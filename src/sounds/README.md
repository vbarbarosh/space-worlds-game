# The recordings the new sound set plays

Each `.mp3` here is packed into the page by `bin/build` (the `<!-- sounds sounds as sound_files -->` line of
`src/index.html`) and played by `voice_sample` (`src/js/sound_voices.js`); which sound plays which file is in
`src/js/sound_takes.js`. All are mono, cut and faded to the length the game needs and brought to one loudness, so a
file's own level says nothing: the level each plays at is set in `sound_takes.js`.

| File | From | Licence |
|---|---|---|
| `shot_a`, `shot_b`, `shot_c`, `shot_f` | Kenney, Sci-Fi Sounds: `laserSmall_002`, `laserSmall_000`, `laserSmall_003`, `laserLarge_001` (kenney.nl) | CC0 |
| `shot_d`, `shot_e` | Freesound 819682 and 466834 | CC0 |
| `boom_crunch_1`, `boom_crunch_2`, `boom_crunch_3`, `boom_deep`, `boom_low` | Kenney, Sci-Fi Sounds: `explosionCrunch_000`, `_001`, `_003`, `_004`, `lowFrequency_explosion_000` | CC0 |
| `boom_sub` | Pixabay 592670, a big explosion (rsf_studios) | Pixabay Content License |
| `boom_cinema` | Pixabay 190268, a sci-fi explosion (daviddumaisaudio) | Pixabay Content License |
| `boom_medium` | Pixabay 40472, a medium explosion (freesound_community) | Pixabay Content License |
| `debris` | Pixabay 457507, debris breaking (lordsonny_two) | Pixabay Content License |
| `pickup_a`, `pickup_b`, `pickup_c`, `pickup_f` | Kenney, Interface Sounds: `glass_001`, `confirmation_002`, `pluck_002`, `confirmation_004` | CC0 |
| `pickup_d` | Kenney, RPG Audio: `handleCoins2` | CC0 |
| `pickup_e` | Kenney, Digital Audio: `powerUp2` | CC0 |
