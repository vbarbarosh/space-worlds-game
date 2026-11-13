// A rail gun, yours and the raiders': a crack, the slug's whip falling through the air, a hard knock and the air
// closing behind it
const sfx_new_enemy_railgun = {
    limit: 0.12,
    room: 0.45,
    gain: 0.92,
    voices: function (k) {
        const r = k.r(0.95, 1.05);
        k.noise({d: 0.012, a: 0.06, cutoff: 4200, filter: 'highpass'});
        k.tone({d: 0.09, a: 0.045, f: 5200*r, f_end: 380, glide: 0.055, cutoff: 8000});
        k.tone({d: 0.2, a: 0.03, f: 1760*r, f_end: 1500*r, fm: {ratio: 2.76, index: 0.9, index_end: 0.05, d: 0.12}});
        k.tone({d: 0.14, a: 0.085, f: 105, f_end: 44, glide: 0.1});
        k.noise({d: 0.26, a: 0.02, color: 'pink', cutoff: 2600, cutoff_end: 700, at: 0.03});
    },
};
