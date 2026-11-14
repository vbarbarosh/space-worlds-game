// A raider's shot that just missed you (a graze, arcade_streak.js): the air of it going by, with a small bright
// tick that climbs through a run of them
const sfx_new_graze = {
    limit: 0.07,
    room: 0.3,
    gain: 1.61,
    streak: 1.5,
    voices: function (k) {
        const up = Math.pow(2, Math.min(k.streak, 7)/12);
        k.noise({d: 0.12, a: 0.05, cutoff: 1400, cutoff_end: 4200, q: 1.2, attack: 0.02, spread: (Math.random() < 0.5) ? -0.4 : 0.4});
        k.tone({d: 0.07, a: 0.022, f: 880*up, fm: {ratio: 3, index: 0.5, index_end: 0.02, d: 0.04}, at: 0.03});
    },
};
