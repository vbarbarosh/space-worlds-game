// Your shot landing on a raider: a tick of sparks and a small knock on its hull, each a little off the last
const sfx_new_impact = {
    limit: 0.05,
    room: 0.15,
    gain: 1.74,
    voices: function (k) {
        const r = k.r(0.85, 1.15);
        k.noise({d: 0.022, a: 0.03, cutoff: 3600*r, filter: 'highpass'});
        k.tone({d: 0.06, a: 0.04, f: 330*r, f_end: 130*r, glide: 0.04, fm: {ratio: 2.4, index: 1, index_end: 0.05, d: 0.03}, cutoff: 2600});
    },
};
