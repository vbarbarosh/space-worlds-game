// A cliff come down on a juggernaut: the blast of it under the rock, the low weight of the fall, stone and plate
// raining after (recordings)
const sfx_new_juggernaut_buried = {
    limit: 1,
    room: 1,
    gain: 0.6,
    classic: 'blast_big',
    voices: function (k) {
        k.sample({name: 'boom_crunch_2', a: 0.7, rate: k.r(0.78, 0.86)});
        k.sample({name: 'boom_low', a: 0.45, rate: 0.9, at: 0.04});
        k.sample({name: 'rock', a: 0.35, rate: k.r(0.8, 0.95), at: 0.12});
        k.sample({name: 'debris', a: 0.2, rate: 0.8, at: 0.3});
    },
};
