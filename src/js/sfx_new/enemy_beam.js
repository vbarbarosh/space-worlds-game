// A beam, yours, the raiders', a flagship's, a pylon's: a sizzle that holds, buzzing as mains do, over a hum
const sfx_new_enemy_beam = {
    limit: 0.1,
    room: 0.25,
    gain: 0.56,
    voices: function (k) {
        const r = k.r(0.96, 1.04);
        k.tone({d: 0.22, a: 0.032, f: 340*r, f_end: 250*r, type: 'sawtooth', fm: {ratio: 0.5, index: 0.5, index_end: 0.3}, cutoff: 3200, hold: 0.08, drive: 1.8});
        k.noise({d: 0.2, a: 0.03, cutoff: 4600, q: 1.2, hold: 0.07});
        k.noise({d: 0.2, a: 0.014, cutoff: 9000, filter: 'highpass', hold: 0.05, extra: true});
        k.tone({d: 0.22, a: 0.018, f: 86, hold: 0.1});
    },
};
