// A scatter gun, yours and the raiders': three cracks of grit packed into a moment over a short thump
const sfx_new_enemy_scatter = {
    limit: 0.1,
    room: 0.25,
    gain: 0.95,
    voices: function (k) {
        const r = k.r(0.92, 1.08);
        for (let i = 0; i < 3; ++i) {
            k.noise({d: 0.04, a: 0.14 - i*0.025, cutoff: (2600 - i*500)*r, q: 0.9, at: i*0.014 + Math.random()*0.004, drive: 1.6});
        }
        k.noise({d: 0.14, a: 0.03, color: 'pink', cutoff: 1700*r, cutoff_end: 420, at: 0.02});
        k.tone({d: 0.13, a: 0.05, f: 150*r, f_end: 46, glide: 0.1});
    },
};
