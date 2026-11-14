// Your ship hit on the hull: metal struck, a recording, three of them in turn, with a low thud under each
const sfx_new_hit = {
    limit: 0.18,
    room: 0.4,
    gain: 0.65,
    voices: function (k) {
        k.sample({name: ['hit_1', 'hit_2', 'hit_3'][k.turn(3)], a: 0.6, rate: k.r(0.9, 1.08)});
        k.sample({name: 'hit_low', a: 0.22, rate: k.r(0.9, 1.05)});
    },
};
