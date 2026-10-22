// A small blast (a missile's, a mine's, a raider's death): the author's explosion recording (src/sounds/explosion.mp3,
// their pick from ten played by the game, 2026-10-22 23:09), a little off in pitch each time so two in a row differ
const sfx_blast = {
    limit: 0.07,
    play: function (note, air, t, clip) {
        clip('explosion', 0.24, 1.02 + Math.random()*0.12);
    },
};
