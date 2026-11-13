// A flagship destroyed, a goal reached, a mission's step done: four bells climbing to a bright chord that rings
const sfx_new_win = {
    limit: 0.5,
    room: 1,
    gain: 1.41,
    voices: function (k) {
        const notes = [261.63, 392, 523.25, 659.25];
        for (let i = 0; i < notes.length; ++i) {
            k.tone({d: 0.6, a: 0.042, f: notes[i]*2, fm: {ratio: 2, index: 1, index_end: 0.03, d: 0.16}, at: i*0.13, spread: (i % 2) ? 0.35 : -0.35});
            k.tone({d: 1.5, a: 0.011, f: notes[i], attack: 0.1, at: 0.52, late: true, spread: (i - 1.5)*0.3});
        }
        k.tone({d: 1.3, a: 0.03, f: 1046.5, fm: {ratio: 3, index: 0.6, index_end: 0.02, d: 0.3}, at: 0.52});
        k.noise({d: 0.9, a: 0.012, cutoff: 6500, filter: 'highpass', attack: 0.12, at: 0.5, extra: true});
    },
};
