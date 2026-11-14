// Your own Ion gun: a snap with a bright zing through it, cleaner and higher than the raiders'
const sfx_new_gun_ion = {
    limit: 0.08,
    room: 0.22,
    gain: 0.95,
    classic: 'enemy_ion',
    voices: function (k) {
        const r = k.r(0.95, 1.05);
        const top = [2700, 3100][k.turn(2)]*r;
        k.tone({d: 0.1, a: 0.045, f: top, f_end: 520*r, glide: 0.055, fm: {ratio: 3.01, index: 2, index_end: 0.08, d: 0.045}, cutoff: 8000});
        k.tone({d: 0.07, a: 0.02, f: 1300*r, f_end: 2100*r, glide: 0.03, at: 0.012});
        k.noise({d: 0.012, a: 0.04, cutoff: 6500, filter: 'highpass'});
        k.noise({d: 0.012, a: 0.022, cutoff: 6500, filter: 'highpass', at: 0.03 + Math.random()*0.01, extra: true});
        k.tone({d: 0.09, a: 0.042, f: 150*r, f_end: 74, glide: 0.07});
    },
};
