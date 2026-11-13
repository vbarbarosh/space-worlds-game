// A stasis charge used (the name is old): the air drawn in and falling still, a zip rising as time slows
const sfx_new_dash = {
    limit: 0.08,
    room: 0.6,
    gain: 1.66,
    voices: function (k) {
        k.noise({d: 0.28, a: 0.06, cutoff: 4200, cutoff_end: 500, q: 0.9});
        k.tone({d: 0.14, a: 0.07, f: 100, f_end: 44, glide: 0.1});
        k.tone({d: 0.26, a: 0.025, f: 260, f_end: 860, fm: {ratio: 2, index: 0.8, index_end: 0.1}, attack: 0.02});
    },
};
