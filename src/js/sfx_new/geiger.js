// Radiation building in the hull: the counter's tick, a recording; the faster they come, the more of it
const sfx_new_geiger = {
    limit: 0.03,
    room: 0.1,
    gain: 0.17,
    voices: function (k) {
        k.sample({name: 'tick', a: 0.3, rate: k.r(0.85, 1.15)});
    },
};
