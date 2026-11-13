// Your ship hit: a thud through the hull, plating crunching, and the hull ringing for a moment after
const sfx_new_hit = {
    limit: 0.18,
    room: 0.4,
    gain: 1.38,
    voices: function (k) {
        const r = k.r(0.92, 1.08);
        k.tone({d: 0.22, a: 0.15, f: 122*r, f_end: 40, glide: 0.16});
        k.noise({d: 0.13, a: 0.1, cutoff: 1100*r, q: 0.7, drive: 2.2});
        k.noise({d: 0.02, a: 0.06, cutoff: 3000, filter: 'highpass'});
        k.tone({d: 0.2, a: 0.03, f: 392*r, fm: {ratio: 2.76, index: 1.8, index_end: 0.1, d: 0.12}, at: 0.005});
    },
};
