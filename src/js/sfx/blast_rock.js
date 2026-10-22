// A rock breaking (an ore rock, drifting debris, a Dustfall cliff's fall): a recording of debris breaking, with a
// little of the world's echo of a small blast
const sfx_blast_rock = {
    limit: 0.1,
    recorded: true,
    play: function (note, air, t, clip) {
        explosion_play(clip, 'small', {name: 'body_rock', gain: 0.143, at: 0.9}, 0.7);
    },
};
