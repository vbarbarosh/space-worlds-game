// A hazard about to strike (a heat surge, a dust storm): the klaxon, two swoops up
const sfx_new_event_danger = {
    limit: 2,
    room: 0.5,
    gain: 0.82,
    voices: function (k) {
        for (let i = 0; i < 2; ++i) {
            k.tone({d: 0.3, a: 0.035, f: 392, f_end: 698.46, glide: 0.24, type: 'sawtooth', cutoff: 2000, hold: 0.1, at: i*0.34, drive: 1.5});
        }
        k.tone({d: 0.7, a: 0.03, f: 65.41, hold: 0.4});
    },
};
