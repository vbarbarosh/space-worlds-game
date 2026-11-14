// Verdant's nests hatching a raider: a wet pop, the shell giving, and a chitter as it comes out
const sfx_new_nest_hatch = {
    limit: 0.25,
    room: 0.6,
    gain: 2.2,
    voices: function (k) {
        const r = k.r(0.85, 1.2);
        k.tone({d: 0.09, a: 0.06, f: 210*r, f_end: 540*r, glide: 0.06});
        k.noise({d: 0.04, a: 0.05, color: 'pink', cutoff: 900*r, q: 2});
        for (let i = 0; i < 3; ++i) {
            k.noise({d: 0.012, a: 0.02, cutoff: 3000 + Math.random()*1500, q: 3, at: 0.06 + i*0.03 + Math.random()*0.01, extra: true});
        }
    },
};
