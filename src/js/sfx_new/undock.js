// Undocked: the lock's air let go, the clamps knocking open, the engine waking under you
const sfx_new_undock = {
    limit: 0.5,
    room: 0.8,
    gain: 2.09,
    voices: function (k) {
        k.noise({d: 0.36, a: 0.035, cutoff: 3600, cutoff_end: 900, q: 0.8});
        k.tone({d: 0.14, a: 0.09, f: 112, f_end: 58, glide: 0.1, at: 0.05});
        k.noise({d: 0.02, a: 0.03, cutoff: 2000, q: 0.8, at: 0.05});
        k.tone({d: 0.7, a: 0.03, f: 62, f_end: 170, type: 'sawtooth', cutoff: 800, attack: 0.25, at: 0.12, drive: 1.5});
    },
};
