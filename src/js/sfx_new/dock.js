// Docked at the station: the clamps taking the hull, a latch ringing shut, the lock's air hissing in
const sfx_new_dock = {
    limit: 0.5,
    room: 0.8,
    gain: 2.77,
    voices: function (k) {
        k.tone({d: 0.2, a: 0.11, f: 92, f_end: 46, glide: 0.15});
        k.noise({d: 0.03, a: 0.04, cutoff: 1800, q: 0.8});
        k.tone({d: 0.16, a: 0.03, f: 330, fm: {ratio: 2.76, index: 1.6, index_end: 0.1, d: 0.1}, at: 0.03});
        k.tone({d: 0.14, a: 0.02, f: 247, fm: {ratio: 2.76, index: 1.2, index_end: 0.1, d: 0.1}, at: 0.11, spread: 0.3});
        k.noise({d: 0.6, a: 0.02, cutoff: 5200, q: 0.8, attack: 0.06, at: 0.14});
    },
};
