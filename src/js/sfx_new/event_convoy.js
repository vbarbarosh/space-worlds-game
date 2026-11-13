// A convoy on the radar: a friendly call on the radio, two chirps in a little static
const sfx_new_event_convoy = {
    limit: 2,
    room: 0.5,
    gain: 0.4,
    voices: function (k) {
        k.noise({d: 0.5, a: 0.012, cutoff: 2600, q: 0.6, hold: 0.3});
        k.tone({d: 0.1, a: 0.035, f: 1244.5, type: 'square', cutoff: 2600, hold: 0.05, at: 0.05});
        k.tone({d: 0.16, a: 0.035, f: 1567.98, type: 'square', cutoff: 2600, hold: 0.09, at: 0.18});
    },
};
