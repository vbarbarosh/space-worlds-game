// A stasis charge used (the name is old): the air drawn in, a blast played backwards, and falling still with a
// soft thud (recordings)
const sfx_new_dash = {
    limit: 0.08,
    room: 0.6,
    gain: 0.04,
    voices: function (k) {
        k.sample({name: 'swell', a: 0.5, rate: k.r(1.5, 1.7)});
        k.sample({name: 'hit_low', a: 0.2, rate: 1.2, at: 0.42});
    },
};
