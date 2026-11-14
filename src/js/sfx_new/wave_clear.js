// A wave of raiders cleared, the breather begun: a bright short call up, the air easing after it
const sfx_new_wave_clear = {
    limit: 2,
    room: 0.9,
    gain: 0.67,
    voices: function (k) {
        const notes = [392, 523.25, 783.99];
        for (let i = 0; i < notes.length; ++i) {
            k.tone({d: 0.4, a: 0.04, f: notes[i], type: 'sawtooth', cutoff: 2400, cutoff_end: 900, attack: 0.01, at: i*0.09, spread: (i - 1)*0.3, drive: 1.3});
            k.tone({d: 0.6, a: 0.02, f: notes[i]*2, fm: {ratio: 2, index: 0.6, index_end: 0.03, d: 0.15}, at: i*0.09});
        }
        k.noise({d: 0.9, a: 0.02, color: 'pink', cutoff: 2600, cutoff_end: 500, attack: 0.05, at: 0.2});
    },
};
