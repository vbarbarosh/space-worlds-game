// A small blast (a missile's, a mine, a drone): a snap, a short thick boom rolling down, grit after it
const sfx_new_blast = {
    limit: 0.07,
    room: 0.8,
    gain: 1.0,
    queue: 4,
    voices: function (k) {
        const r = k.r(0.88, 1.12);
        k.noise({d: 0.022, a: 0.12, cutoff: 2400, filter: 'highpass'});
        k.noise({d: 0.4, a: 0.2, color: 'pink', cutoff: 2400*r, cutoff_end: 220, filter: 'lowpass', drive: 2});
        k.tone({d: 0.34, a: 0.17, f: 96*r, f_end: 34, glide: 0.26});
        k.noise({d: 0.2, a: 0.02, cutoff: 4800, q: 0.8, at: 0.06 + Math.random()*0.05, extra: true});
    },
};
