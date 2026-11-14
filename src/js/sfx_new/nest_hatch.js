// Verdant's nests hatching a raider: a wet squelch as the shell gives, and clicks as it comes out (recordings)
const sfx_new_nest_hatch = {
    limit: 0.25,
    room: 0.6,
    gain: 0.14,
    voices: function (k) {
        k.sample({name: 'slime', a: 0.5, rate: k.r(1.1, 1.4)});
        for (let i = 0; i < 3; ++i) {
            k.sample({name: 'click', a: 0.08, rate: k.r(1.4, 2), at: 0.3 + i*0.04 + Math.random()*0.02, extra: true});
        }
    },
};
