// A life won back: three bells up and a bright ring over them
const sfx_new_life_gained = {
    limit: 1,
    room: 1,
    gain: 0.83,
    voices: function (k) {
        const notes = [523.25, 659.25, 783.99];
        for (let i = 0; i < notes.length; ++i) {
            k.tone({d: 0.4, a: 0.045, f: notes[i], fm: {ratio: 2, index: 0.9, index_end: 0.03, d: 0.12}, at: i*0.1, spread: (i - 1)*0.35});
        }
        k.tone({d: 0.9, a: 0.03, f: 1046.5, fm: {ratio: 3, index: 0.6, index_end: 0.02, d: 0.25}, at: 0.3});
        k.tone({d: 0.8, a: 0.02, f: 261.63, attack: 0.05, at: 0.3});
    },
};
