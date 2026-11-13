// Flying into a gravity well, a flagship's gravity moves: two low calls, the second lower, bending down as the
// pull does
const sfx_new_gravity = {
    limit: 1.2,
    room: 0.8,
    gain: 0.63,
    voices: function (k) {
        k.tone({d: 0.34, a: 0.05, f: 196, f_end: 180, fm: {ratio: 0.5, index: 0.7, index_end: 0.3}, attack: 0.02, hold: 0.1, cutoff: 1400});
        k.tone({d: 0.5, a: 0.055, f: 146.83, f_end: 120, fm: {ratio: 0.5, index: 0.9, index_end: 0.3}, attack: 0.02, hold: 0.12, at: 0.31, cutoff: 1200});
        k.tone({d: 0.8, a: 0.05, f: 55, f_end: 36, attack: 0.1, at: 0.05});
    },
};
