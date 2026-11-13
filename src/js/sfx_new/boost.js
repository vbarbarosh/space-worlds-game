// The turbo's burst (yours, a flagship's charge, a rival's in a race): a kick from the engine and the air tearing
// open as the ship leaps
const sfx_new_boost = {
    limit: 0.08,
    room: 0.6,
    gain: 1.5,
    voices: function (k) {
        k.tone({d: 0.2, a: 0.1, f: 64, f_end: 34, glide: 0.15});
        k.noise({d: 0.62, a: 0.26, color: 'pink', cutoff: 300, cutoff_end: 2800, sweep: 0.3, attack: 0.07, q: 0.6});
        k.noise({d: 0.4, a: 0.06, cutoff: 1200, cutoff_end: 5200, sweep: 0.25, attack: 0.05, q: 1, at: 0.03});
        k.tone({d: 0.5, a: 0.035, f: 95, f_end: 250, glide: 0.28, type: 'sawtooth', cutoff: 1100, attack: 0.04, drive: 1.6});
    },
};
