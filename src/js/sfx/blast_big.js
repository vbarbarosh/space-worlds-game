// A ship's blast (a raider, a flagship's chain): its own muffled recording, with the world's echo of a ship's
const sfx_blast_big = {
    limit: 0.12,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'ship', {name: 'body_raider', gain: 0.48, at: 0.6});
    },
};
