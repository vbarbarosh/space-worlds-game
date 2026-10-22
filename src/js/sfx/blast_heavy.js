// A heavy ship's blast (a bulwark, a tank, a carrier): the deep set's blast, lower, with the world's echo of a ship's
const sfx_blast_heavy = {
    limit: 0.12,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'ship', {name: 'body_deep_ship', gain: 0.235, at: 0.5, rate: 0.92});
    },
};
