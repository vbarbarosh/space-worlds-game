// A heavy ship's blast (a bulwark, a tank, a carrier): its own muffled recording, lower, with the world's echo of a
// ship's
const sfx_blast_heavy = {
    limit: 0.12,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'ship', {name: 'body_heavy', gain: 0.152, at: 0.6, rate: 0.92});
    },
};
