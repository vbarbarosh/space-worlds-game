// A long streak broken by a hit: two notes falling away, the second dull
const sfx_new_streak_lost = {
    limit: 1,
    room: 0.7,
    gain: 1.37,
    voices: function (k) {
        k.tone({d: 0.18, a: 0.04, f: 523.25, f_end: 493.88, type: 'triangle', cutoff: 2200});
        k.tone({d: 0.4, a: 0.045, f: 369.99, f_end: 311.13, glide: 0.3, type: 'triangle', cutoff: 1200, at: 0.14});
        k.tone({d: 0.3, a: 0.05, f: 110, f_end: 70, at: 0.14});
    },
};
