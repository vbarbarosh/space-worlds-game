// A ship's blast (a raider, a flagship's chain): its two layers, as the world combines them (explosion_play)
const sfx_blast_big = {
    limit: 0.12,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'ship');
    },
};
