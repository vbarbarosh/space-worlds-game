// A life lost in the arcade: three notes stepping down and the floor dropping away under them
const sfx_new_life_lost = {
    limit: 1,
    room: 1,
    gain: 2.09,
    voices: function (k) {
        const notes = [440, 369.99, 293.66];
        for (let i = 0; i < notes.length; ++i) {
            k.tone({d: 0.34, a: 0.04, f: notes[i], type: 'sawtooth', cutoff: 1500, attack: 0.01, at: i*0.2, spread: (i - 1)*0.3});
            k.tone({d: 0.34, a: 0.03, f: notes[i]/2, at: i*0.2});
        }
        k.tone({d: 1, a: 0.1, f: 120, f_end: 36, glide: 0.8, at: 0.4});
    },
};
