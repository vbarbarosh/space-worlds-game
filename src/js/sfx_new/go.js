// A race's green light: the count's beep an octave up and held, and the air rushing as the field leaps away
const sfx_new_go = {
    limit: 0.5,
    room: 0.6,
    gain: 0.88,
    voices: function (k) {
        k.tone({d: 0.42, a: 0.05, f: 1174.66, type: 'square', cutoff: 2600, hold: 0.16});
        k.tone({d: 0.42, a: 0.04, f: 587.33, hold: 0.16});
        k.noise({d: 0.45, a: 0.05, color: 'pink', cutoff: 500, cutoff_end: 3200, attack: 0.05, q: 0.7});
    },
};
