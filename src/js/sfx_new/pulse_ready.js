// The pulse charged again: a soft note opening up an octave, with a hum under it
const sfx_new_pulse_ready = {
    limit: 1,
    room: 0.8,
    gain: 1.3,
    voices: function (k) {
        k.tone({d: 0.34, a: 0.035, f: 392, f_end: 783.99, glide: 0.22, attack: 0.07, fm: {ratio: 2, index: 0.6, index_end: 0.05}});
        k.tone({d: 0.4, a: 0.03, f: 98, attack: 0.08});
    },
};
