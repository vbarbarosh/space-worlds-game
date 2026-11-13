// Radiation building in the hull: the counter's tick; the faster they come, the more of it
const sfx_new_geiger = {
    limit: 0.03,
    room: 0.1,
    gain: 0.78,
    voices: function (k) {
        k.noise({d: 0.007, a: 0.05, cutoff: 3200, filter: 'highpass', spread: Math.random()*0.6 - 0.3});
        k.tone({d: 0.006, a: 0.02, f: 2600});
    },
};
