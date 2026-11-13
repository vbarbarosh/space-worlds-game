// Your own Beam: a clean bright line of power held, with a hum under it; the raiders' beams are the rougher ones
const sfx_new_gun_beam = {
    limit: 0.1,
    room: 0.3,
    gain: 0.59,
    classic: 'enemy_beam',
    voices: function (k) {
        const r = k.r(0.97, 1.03);
        k.tone({d: 0.22, a: 0.03, f: 520*r, f_end: 480*r, type: 'sawtooth', fm: {ratio: 2, index: 0.4, index_end: 0.25}, cutoff: 4200, hold: 0.09});
        k.tone({d: 0.22, a: 0.016, f: 1560*r, f_end: 1440*r, hold: 0.09});
        k.noise({d: 0.2, a: 0.02, cutoff: 6200, q: 1.5, hold: 0.07});
        k.tone({d: 0.22, a: 0.03, f: 104, hold: 0.1});
    },
};
