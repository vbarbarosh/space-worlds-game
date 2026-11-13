// A raider's or a flagship's missile launching: a dull rush with a low growl rising in it
const sfx_new_enemy_missile = {
    limit: 0.18,
    room: 0.4,
    gain: 1.9,
    voices: function (k) {
        const r = k.r(0.92, 1.08);
        k.noise({d: 0.03, a: 0.03, cutoff: 1800, q: 0.7});
        k.tone({d: 0.1, a: 0.04, f: 70, f_end: 38, glide: 0.08});
        k.noise({d: 0.34, a: 0.1, color: 'pink', cutoff: 900*r, cutoff_end: 3200*r, attack: 0.05});
        k.tone({d: 0.3, a: 0.03, f: 110*r, f_end: 210*r, type: 'sawtooth', attack: 0.04, drive: 1.6, cutoff: 1500});
    },
};
