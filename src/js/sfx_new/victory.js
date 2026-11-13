// A world cleared: four chords of brass climbing home, drums under each, and bells on the last
const sfx_new_victory = {
    limit: 3,
    room: 1,
    gain: 0.81,
    voices: function (k) {
        const chords = [[261.63, 329.63, 392], [349.23, 440, 523.25], [392, 493.88, 587.33], [523.25, 659.25, 783.99]];
        for (let i = 0; i < chords.length; ++i) {
            const last = (i === chords.length - 1);
            const at = i*0.24;
            for (let j = 0; j < 3; ++j) {
                k.tone({d: last ? 1.5 : 0.3, a: 0.022, f: chords[i][j], type: 'sawtooth', cutoff: 2300, cutoff_end: 900, attack: 0.02, hold: last ? 0.5 : 0.12, at, spread: (j - 1)*0.4, drive: 1.3});
            }
            k.tone({d: 0.3, a: 0.09, f: 98, f_end: 52, glide: 0.2, at});
            k.noise({d: 0.05, a: 0.02, cutoff: 900, q: 0.7, at});
        }
        k.tone({d: 1.4, a: 0.03, f: 1046.5, fm: {ratio: 3, index: 0.7, index_end: 0.02, d: 0.3}, at: 0.72, spread: -0.3});
        k.tone({d: 1.4, a: 0.025, f: 1567.98, fm: {ratio: 3, index: 0.7, index_end: 0.02, d: 0.3}, at: 0.82, spread: 0.3});
        k.noise({d: 1.2, a: 0.012, cutoff: 6500, filter: 'highpass', attack: 0.1, at: 0.72, extra: true});
    },
};
