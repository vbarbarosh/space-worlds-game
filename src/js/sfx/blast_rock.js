// A rock breaking: the author's pick for stones (src/sounds/explosion_rock.mp3, a deep explosion, 2026-10-22 23:10),
// a little off in pitch each time
const sfx_blast_rock = {
    limit: 0.1,
    play: function (note, air, t, clip) {
        clip('explosion_rock', 0.4, 0.95 + Math.random()*0.12);
    },
};
