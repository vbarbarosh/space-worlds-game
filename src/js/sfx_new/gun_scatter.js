// Your own Scatter gun: four cracks thrown out at once, a hard thump, and the barrel ringing for a moment
const sfx_new_gun_scatter = {
    limit: 0.1,
    room: 0.3,
    gain: 1.25,
    classic: 'enemy_scatter',
    voices: function (k) {
        const r = k.r(0.94, 1.06);
        for (let i = 0; i < 4; ++i) {
            k.noise({d: 0.035, a: 0.14 - i*0.02, cutoff: (3200 - i*520)*r, q: 1, at: i*0.011 + Math.random()*0.003, drive: 1.8, spread: (i - 1.5)*0.18});
        }
        k.tone({d: 0.14, a: 0.065, f: 170*r, f_end: 48, glide: 0.1});
        k.tone({d: 0.1, a: 0.02, f: 880*r, fm: {ratio: 2.76, index: 1.2, index_end: 0.05, d: 0.06}, at: 0.01, extra: true});
        k.noise({d: 0.13, a: 0.025, color: 'pink', cutoff: 2200*r, cutoff_end: 500, at: 0.03});
    },
};
