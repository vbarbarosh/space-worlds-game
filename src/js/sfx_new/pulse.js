// Your pulse going off, an EMP charge, a fall into a black hole's core: a wave that swells as its ring grows and
// washes out, with the ground of it under your feet
const sfx_new_pulse = {
    limit: 0.08,
    room: 1,
    gain: 1.79,
    voices: function (k) {
        k.tone({d: 0.95, a: 0.15, f: 150, f_end: 32, glide: 0.7, attack: 0.03});
        k.noise({d: 1.25, a: 0.2, color: 'pink', cutoff: 300, cutoff_end: 3400, sweep: 0.5, filter: 'lowpass', attack: 0.28});
        k.noise({d: 0.9, a: 0.06, cutoff: 700, cutoff_end: 2600, sweep: 0.45, q: 0.8, attack: 0.25});
        k.tone({d: 0.8, a: 0.045, f: 310, f_end: 62, glide: 0.6, fm: {ratio: 1.5, index: 0.8, index_end: 0.05, d: 0.5}});
        k.noise({d: 0.9, a: 0.02, cutoff: 5000, filter: 'highpass', attack: 0.35, at: 0.05, extra: true});
    },
};
