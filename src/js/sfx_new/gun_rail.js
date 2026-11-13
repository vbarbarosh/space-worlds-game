// Your own Rail gun: the crack of the slug leaving, its whip down through the air, a heavy knock and a long thin
// ring as the rails cool
const sfx_new_gun_rail = {
    limit: 0.12,
    room: 0.6,
    gain: 0.89,
    classic: 'enemy_railgun',
    voices: function (k) {
        const r = k.r(0.96, 1.04);
        k.noise({d: 0.014, a: 0.07, cutoff: 3800, filter: 'highpass'});
        k.tone({d: 0.1, a: 0.05, f: 6200*r, f_end: 320, glide: 0.06, cutoff: 9000});
        k.tone({d: 0.16, a: 0.11, f: 120, f_end: 40, glide: 0.11});
        k.tone({d: 0.34, a: 0.022, f: 1975*r, f_end: 1760*r, fm: {ratio: 2.76, index: 0.8, index_end: 0.04, d: 0.2}});
        k.noise({d: 0.3, a: 0.022, color: 'pink', cutoff: 3000, cutoff_end: 600, at: 0.03});
    },
};
