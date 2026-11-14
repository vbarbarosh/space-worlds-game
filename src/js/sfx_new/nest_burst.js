// One of Verdant's nests burnt: a blast, slowed, with a long wet squelch in it and bits of it raining down
// (recordings)
const sfx_new_nest_burst = {
    limit: 1,
    room: 1,
    gain: 0.24,
    voices: function (k) {
        k.sample({name: 'boom_crunch_2', a: 0.6, rate: k.r(0.8, 0.9)});
        k.sample({name: 'slime_long', a: 0.4, rate: k.r(0.75, 0.9), at: 0.05});
        k.sample({name: 'debris', a: 0.12, rate: k.r(0.9, 1.2), at: 0.25, extra: true});
    },
};
