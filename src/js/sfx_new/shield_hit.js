// A hit your shield took whole: the field flaring and buzzing where it was struck, a soft knock behind it; a hit
// on the hull is the heavy one
const sfx_new_shield_hit = {
    limit: 0.18,
    room: 0.5,
    gain: 1.04,
    classic: 'hit',
    voices: function (k) {
        const r = k.r(0.92, 1.08);
        k.tone({d: 0.16, a: 0.05, f: 760*r, f_end: 300*r, glide: 0.12, fm: {ratio: 1.5, index: 1.6, index_end: 0.1, d: 0.1}, cutoff: 3600});
        k.noise({d: 0.09, a: 0.045, cutoff: 2800*r, q: 2.2});
        k.tone({d: 0.14, a: 0.08, f: 96*r, f_end: 52, glide: 0.1});
        k.noise({d: 0.25, a: 0.012, cutoff: 5500, filter: 'highpass', attack: 0.02, extra: true});
    },
};
