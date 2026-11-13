// An ion gun, yours and the raiders': an electric snap, hard-edged and crackling, with a small thump under it
const sfx_new_enemy_ion = {
    limit: 0.08,
    room: 0.2,
    gain: 1.11,
    voices: function (k) {
        const r = k.r(0.93, 1.07);
        k.tone({d: 0.1, a: 0.04, f: 1900*r, f_end: 420*r, glide: 0.06, fm: {ratio: 3.37, index: 2.4, index_end: 0.1, d: 0.05}, cutoff: 7000});
        for (let i = 0; i < 3; ++i) {
            k.noise({d: 0.012, a: 0.035, cutoff: 6000, filter: 'highpass', at: 0.008 + i*0.022 + Math.random()*0.008, extra: i > 0});
        }
        k.tone({d: 0.09, a: 0.05, f: 130*r, f_end: 70, glide: 0.07});
    },
};
