// Your shield whole again after it was worn low: its field closing, rising and bright
const sfx_new_shield_up = {
    limit: 1,
    room: 0.8,
    gain: 0.74,
    voices: function (k) {
        k.tone({d: 0.4, a: 0.035, f: 392, f_end: 1175, glide: 0.3, attack: 0.14, fm: {ratio: 2, index: 0.5, index_end: 0.1}});
        k.tone({d: 0.4, a: 0.014, f: 784, f_end: 2350, glide: 0.3, attack: 0.16});
        k.noise({d: 0.3, a: 0.01, cutoff: 6000, filter: 'highpass', attack: 0.15, at: 0.08, extra: true});
    },
};
