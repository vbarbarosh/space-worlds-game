// A wave of raiders coming in: a horn, a fifth wide, with the air of their engines swelling in it
const sfx_new_wave_start = {
    limit: 2,
    room: 1,
    gain: 1.07,
    voices: function (k) {
        for (const f of [110, 164.81, 220]) {
            k.tone({d: 0.8, a: 0.035, f, type: 'sawtooth', cutoff: 1100, cutoff_end: 480, attack: 0.07, hold: 0.25, drive: 1.5, spread: (f - 165)/200});
        }
        k.noise({d: 0.7, a: 0.03, color: 'pink', cutoff: 380, cutoff_end: 1300, attack: 0.2, q: 0.7});
        k.tone({d: 0.5, a: 0.08, f: 55, attack: 0.05, hold: 0.2});
    },
};
