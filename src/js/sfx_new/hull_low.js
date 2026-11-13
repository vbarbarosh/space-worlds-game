// Your hull under a third: the board's alarm, two short calls, again every few seconds while it lasts
const sfx_new_hull_low = {
    limit: 1.5,
    room: 0.3,
    gain: 0.45,
    voices: function (k) {
        for (let i = 0; i < 2; ++i) {
            k.tone({d: 0.13, a: 0.035, f: 880, type: 'square', cutoff: 1900, hold: 0.07, at: i*0.19});
            k.tone({d: 0.13, a: 0.02, f: 440, hold: 0.07, at: i*0.19});
        }
    },
};
