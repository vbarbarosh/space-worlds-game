// A module, a gun, a ship bought or fitted, a contract claimed: three bells climbing over a soft chord
const sfx_new_upgrade = {
    limit: 0.25,
    room: 0.8,
    gain: 1.0,
    voices: function (k) {
        const notes = [261.63, 392, 523.25];
        for (let i = 0; i < notes.length; ++i) {
            k.tone({d: 0.55, a: 0.05, f: notes[i]*2, fm: {ratio: 2, index: 0.9, index_end: 0.03, d: 0.15}, at: i*0.13, spread: (i - 1)*0.35});
            k.tone({d: 0.9, a: 0.016, f: notes[i], attack: 0.08, at: i*0.13});
        }
        k.noise({d: 0.5, a: 0.008, cutoff: 7000, filter: 'highpass', attack: 0.1, at: 0.26, extra: true});
    },
};
