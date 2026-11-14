// A raider's plasma shot: your bolt's darker cousin, lower and duller, so the two guns are told apart in a fight
const sfx_new_enemy_plasma = {
    limit: 0.08,
    room: 0.18,
    gain: 0.5,
    voices: function (k) {
        const r = k.r(0.9, 1.1);
        k.noise({d: 0.014, a: 0.03, cutoff: 3200, filter: 'highpass'});
        k.tone({d: 0.13, a: 0.045, f: 1150*r, f_end: 150*r, glide: 0.09, fm: {ratio: 1.5, index: 1.2, index_end: 0.05, d: 0.07}, cutoff: 2600});
        k.tone({d: 0.11, a: 0.04, f: 118*r, f_end: 46, glide: 0.09});
    },
};
